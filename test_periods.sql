-- Script para probar la recuperación de períodos de juventud
-- Ejecutar con: psql -U nacional -d nacional -f test_periods.sql

SELECT 'Testing match_periods retrieval for juventud:' as info;

SELECT 
    match_name,
    detected_first_half_start,
    detected_first_half_end,
    detected_second_half_start,
    detected_second_half_end,
    detected_halftime_start,
    detected_halftime_end,
    manual_first_half_start,
    manual_first_half_end,
    manual_second_half_start,
    manual_second_half_end,
    manual_halftime_start,
    manual_halftime_end
FROM match_periods 
WHERE match_name = 'juventud';

-- Verificar tipos de datos
SELECT 'Column types:' as info;
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'match_periods' 
AND column_name LIKE '%detected%' OR column_name LIKE '%manual%'
ORDER BY column_name;
