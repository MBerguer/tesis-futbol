--la creme de la creme
-- HSR maximo de todo el partido, y la mar en coche
WITH sprint_data AS (
    SELECT 
        player_display_name, 
        time,
        speed,
        hsr_total_calc, 
        distancia_total_calc,
        LAG(hsr_total_calc) OVER (PARTITION BY player_display_name ORDER BY time) AS prev_hsr,
        LEAD(hsr_total_calc) OVER (PARTITION BY player_display_name ORDER BY time) AS next_hsr
    FROM public.danubio_processed_view
),
grouped_sprints AS (
    SELECT
        player_display_name,
        time,
        speed,
        hsr_total_calc,
        distancia_total_calc,
        -- Definir cuándo empieza un nuevo sprint (de 0 a >19.8)
        SUM(CASE 
            WHEN prev_hsr = 0 AND hsr_total_calc > 0 THEN 1 
            ELSE 0 
        END) OVER (PARTITION BY player_display_name ORDER BY time) AS sprint_id
    FROM sprint_data
),
sprints_summary AS (
    SELECT
        player_display_name,
        sprint_id,
        MIN(time) AS sprint_start_time,
        MAX(time) AS sprint_end_time,
        SUM(distancia_total_calc) AS total_sprint_distance,
        MAX(hsr_total_calc) AS max_hsr_total_calc
    FROM grouped_sprints
    WHERE hsr_total_calc > 0  -- Considerar solo las filas donde se superó el umbral
    GROUP BY player_display_name, sprint_id
)
SELECT *
FROM sprints_summary
WHERE (player_display_name, max_hsr_total_calc) IN (
    SELECT player_display_name, MAX(max_hsr_total_calc)
    FROM sprints_summary
    GROUP BY player_display_name
);







-- Esta da todos los sprints y sus distancias

WITH sprint_data AS (
    SELECT 
        player_display_name, 
        time,
        speed,
        hsr_total_calc, 
        distancia_total_calc,
        LAG(hsr_total_calc) OVER (PARTITION BY player_display_name ORDER BY time) AS prev_hsr,
        LEAD(hsr_total_calc) OVER (PARTITION BY player_display_name ORDER BY time) AS next_hsr
    FROM public.danubio_processed_view
),
grouped_sprints AS (
    SELECT
        player_display_name,
        time,
        speed,
        hsr_total_calc,
        distancia_total_calc,
        -- Definir cuándo empieza un nuevo sprint (de 0 a >19.8)
        SUM(CASE 
            WHEN prev_hsr = 0 AND hsr_total_calc > 0 THEN 1 
            ELSE 0 
        END) OVER (PARTITION BY player_display_name ORDER BY time) AS sprint_id
    FROM sprint_data
)
SELECT
    player_display_name,
    sprint_id,
    MIN(time) AS sprint_start_time,
    MAX(time) AS sprint_end_time,
    SUM(distancia_total_calc) AS total_sprint_distance,
    MAX(hsr_total_calc) AS max_hsr_total_calc  -- Obtener el valor máximo de HSR en cada sprint
FROM grouped_sprints
WHERE hsr_total_calc > 0  -- Considerar solo las filas donde se superó el umbral
GROUP BY player_display_name, sprint_id
ORDER BY player_display_name, sprint_id;
