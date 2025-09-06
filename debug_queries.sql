-- Queries para debuggear el problema de detección de períodos
-- Ejecutar con: psql -U nacional -d nacional -f debug_queries.sql

-- 1. Verificar que la tabla juventud existe y tiene datos
SELECT 'Tabla juventud - Total de filas:' as info, COUNT(*) as count FROM juventud;

-- 2. Ver estructura de la tabla
SELECT 'Estructura de la tabla juventud:' as info;
\d juventud

-- 3. Ver algunas filas de muestra
SELECT 'Primeras 5 filas:' as info;
SELECT * FROM juventud LIMIT 5;

-- 4. Verificar columnas de tiempo y velocidad
SELECT 'Verificando columnas time y speed:' as info;
SELECT 
    player_display_name,
    time,
    speed,
    CASE 
        WHEN time ~ '^\d{2}:\d{2}:\d{2}\.\d{2}$' THEN 'Formato correcto'
        ELSE 'Formato incorrecto'
    END as time_format_check
FROM juventud 
LIMIT 10;

-- 5. Calcular centralized_elapsed_time (misma lógica que el backend)
WITH first_timestamps AS (
    SELECT 
        player_display_name,
        MIN(time) as first_time
    FROM juventud
    GROUP BY player_display_name
)
SELECT 
    t.player_display_name,
    t.time,
    t.speed,
    ft.first_time,
    EXTRACT(EPOCH FROM (
        (to_timestamp(t.time, 'HH24:MI:SS.MS') - to_timestamp(ft.first_time, 'HH24:MI:SS.MS')) + 
        (to_timestamp(ft.first_time, 'HH24:MI:SS.MS') - to_timestamp('08:52:37.90', 'HH24:MI:SS.MS'))
    ))::text as centralized_elapsed_time
FROM juventud t
JOIN first_timestamps ft ON t.player_display_name = ft.player_display_name
ORDER BY t.time
LIMIT 10;

-- 6. Verificar tabla match_periods
SELECT 'Tabla match_periods:' as info;
SELECT * FROM match_periods WHERE match_name = 'juventud';

-- 7. Verificar si hay datos de velocidad por segundo (lógica de detección)
WITH first_timestamps AS (
    SELECT 
        player_display_name,
        MIN(time) as first_time
    FROM juventud
    GROUP BY player_display_name
),
centralized_data AS (
    SELECT 
        t.*,
        EXTRACT(EPOCH FROM (
            (to_timestamp(t.time, 'HH24:MI:SS.MS') - to_timestamp(ft.first_time, 'HH24:MI:SS.MS')) + 
            (to_timestamp(ft.first_time, 'HH24:MI:SS.MS') - to_timestamp('08:52:37.90', 'HH24:MI:SS.MS'))
        )) as centralized_elapsed_time
    FROM juventud t
    JOIN first_timestamps ft ON t.player_display_name = ft.player_display_name
),
second_speed AS (
    SELECT 
        FLOOR(centralized_elapsed_time) as second,
        AVG(speed) as avg_speed
    FROM centralized_data
    WHERE speed IS NOT NULL
    GROUP BY FLOOR(centralized_elapsed_time)
    ORDER BY second
)
SELECT 'Velocidad promedio por segundo (primeros 20):' as info;
SELECT second, avg_speed FROM second_speed LIMIT 20;
