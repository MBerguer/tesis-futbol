-- Migration for match_periods table
CREATE TABLE match_periods (
    id SERIAL PRIMARY KEY,
    match_name TEXT NOT NULL UNIQUE,
    detected_first_half_start INTEGER NOT NULL,
    detected_first_half_end INTEGER NOT NULL,
    detected_second_half_start INTEGER NOT NULL,
    detected_second_half_end INTEGER NOT NULL,
    detected_halftime_start INTEGER NOT NULL,
    detected_halftime_end INTEGER NOT NULL,
    manual_first_half_start INTEGER,
    manual_first_half_end INTEGER,
    manual_second_half_start INTEGER,
    manual_second_half_end INTEGER,
    manual_halftime_start INTEGER,
    manual_halftime_end INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
