

-- ============================================
-- Insert Competition
-- ============================================
INSERT INTO competitions (competition_id, name, season)
VALUES (
    gen_random_uuid(),
    'Juveniles A - Uruguayo',
    '2024'
)
ON CONFLICT DO NOTHING;

-- ============================================
-- Insert Venue
-- ============================================
INSERT INTO venues (venue_id, name, city)
VALUES (
    gen_random_uuid(),
    'Los Céspedes',
    'Montevideo'
)
ON CONFLICT DO NOTHING;

-- ============================================
-- Insert Teams
-- ============================================
INSERT INTO teams (team_id, name, category)
VALUES
    (gen_random_uuid(), 'Nacional Sub 19', 'Sub-19'),
    (gen_random_uuid(), 'Juventud', 'Sub-19')
ON CONFLICT DO NOTHING;

-- ============================================
-- Insert Match
-- ============================================
INSERT INTO matches (
    match_id, competition_id, match_date, venue_id,
    home_team_id, away_team_id, result_home, result_away, youtube_link, notes
) VALUES (
    gen_random_uuid(),
    (SELECT competition_id FROM competitions WHERE name = 'Juveniles A - Uruguayo' AND season = '2024'),
    '2024-07-19 09:00:00',
    (SELECT venue_id FROM venues WHERE name = 'Los Céspedes'),
    (SELECT team_id FROM teams WHERE name = 'Nacional Sub 19'),
    (SELECT team_id FROM teams WHERE name = 'Juventud'),
    0, 0, NULL,
    'Director Técnico Nacional: Espasandin Santiago'
);

-- ============================================
-- Insert Match Players (Titulares Nacional Sub 19)
-- ============================================
INSERT INTO match_players (match_player_id, match_id, team_id, player_id, role, position, jersey_number)
VALUES
    (gen_random_uuid(), (SELECT match_id FROM matches WHERE match_date = '2024-07-19 09:00:00'),
     (SELECT team_id FROM teams WHERE name = 'Nacional Sub 19'),
     REEMPLAZAR_DOC_ID('Bianchi Juan Felipe'), 'starter', NULL, NULL),
    (gen_random_uuid(), (SELECT match_id FROM matches WHERE match_date = '2024-07-19 09:00:00'),
     (SELECT team_id FROM teams WHERE name = 'Nacional Sub 19'),
     REEMPLAZAR_DOC_ID('Echeverria Juan Pedro'), 'starter', NULL, NULL),
    (gen_random_uuid(), (SELECT match_id FROM matches WHERE match_date = '2024-07-19 09:00:00'),
     (SELECT team_id FROM teams WHERE name = 'Nacional Sub 19'),
     REEMPLAZAR_DOC_ID('Pedrouzo Federico'), 'starter', NULL, NULL),
    (gen_random_uuid(), (SELECT match_id FROM matches WHERE match_date = '2024-07-19 09:00:00'),
     (SELECT team_id FROM teams WHERE name = 'Nacional Sub 19'),
     REEMPLAZAR_DOC_ID('Espinosa Ferreira Santiago'), 'starter', NULL, NULL),
    (gen_random_uuid(), (SELECT match_id FROM matches WHERE match_date = '2024-07-19 09:00:00'),
     (SELECT team_id FROM teams WHERE name = 'Nacional Sub 19'),
     REEMPLAZAR_DOC_ID('Vazquez Lautaro'), 'starter', NULL, NULL),
    (gen_random_uuid(), (SELECT match_id FROM matches WHERE match_date = '2024-07-19 09:00:00'),
     (SELECT team_id FROM teams WHERE name = 'Nacional Sub 19'),
     REEMPLAZAR_DOC_ID('Sanchez Aranda Benjamin'), 'starter', NULL, NULL),
    (gen_random_uuid(), (SELECT match_id FROM matches WHERE match_date = '2024-07-19 09:00:00'),
     (SELECT team_id FROM teams WHERE name = 'Nacional Sub 19'),
     REEMPLAZAR_DOC_ID('Garcia Juan Ignacio'), 'starter', NULL, NULL),
    (gen_random_uuid(), (SELECT match_id FROM matches WHERE match_date = '2024-07-19 09:00:00'),
     (SELECT team_id FROM teams WHERE name = 'Nacional Sub 19'),
     REEMPLAZAR_DOC_ID('Quinteros Brian'), 'starter', NULL, NULL),
    (gen_random_uuid(), (SELECT match_id FROM matches WHERE match_date = '2024-07-19 09:00:00'),
     (SELECT team_id FROM teams WHERE name = 'Nacional Sub 19'),
     REEMPLAZAR_DOC_ID('Lopez Inti'), 'starter', NULL, NULL),
    (gen_random_uuid(), (SELECT match_id FROM matches WHERE match_date = '2024-07-19 09:00:00'),
     (SELECT team_id FROM teams WHERE name = 'Nacional Sub 19'),
     REEMPLAZAR_DOC_ID('Lopez Nahuel'), 'starter', NULL, NULL),
    (gen_random_uuid(), (SELECT match_id FROM matches WHERE match_date = '2024-07-19 09:00:00'),
     (SELECT team_id FROM teams WHERE name = 'Nacional Sub 19'),
     REEMPLAZAR_DOC_ID('Dalmas Jonathan'), 'starter', NULL, NULL);

-- ============================================
-- Insert Match Players (Suplentes Nacional Sub 19)
-- ============================================
INSERT INTO match_players (match_player_id, match_id, team_id, player_id, role, position, jersey_number)
VALUES
    (gen_random_uuid(), (SELECT match_id FROM matches WHERE match_date = '2024-07-19 09:00:00'),
     (SELECT team_id FROM teams WHERE name = 'Nacional Sub 19'),
     REEMPLAZAR_DOC_ID('Gimenez Pintos Agustin'), 'sub', NULL, NULL),
    (gen_random_uuid(), (SELECT match_id FROM matches WHERE match_date = '2024-07-19 09:00:00'),
     (SELECT team_id FROM teams WHERE name = 'Nacional Sub 19'),
     REEMPLAZAR_DOC_ID('Acosta Facundo'), 'sub', NULL, NULL),
    (gen_random_uuid(), (SELECT match_id FROM matches WHERE match_date = '2024-07-19 09:00:00'),
     (SELECT team_id FROM teams WHERE name = 'Nacional Sub 19'),
     REEMPLAZAR_DOC_ID('Martino Emiliano'), 'sub', NULL, NULL),
    (gen_random_uuid(), (SELECT match_id FROM matches WHERE match_date = '2024-07-19 09:00:00'),
     (SELECT team_id FROM teams WHERE name = 'Nacional Sub 19'),
     REEMPLAZAR_DOC_ID('Piriz Ezequiel'), 'sub', NULL, NULL),
    (gen_random_uuid(), (SELECT match_id FROM matches WHERE match_date = '2024-07-19 09:00:00'),
     (SELECT team_id FROM teams WHERE name = 'Nacional Sub 19'),
     REEMPLAZAR_DOC_ID('Rolando Mauro'), 'sub', NULL, NULL),
    (gen_random_uuid(), (SELECT match_id FROM matches WHERE match_date = '2024-07-19 09:00:00'),
     (SELECT team_id FROM teams WHERE name = 'Nacional Sub 19'),
     REEMPLAZAR_DOC_ID('Guevara Maximo'), 'sub', NULL, NULL),
    (gen_random_uuid(), (SELECT match_id FROM matches WHERE match_date = '2024-07-19 09:00:00'),
     (SELECT team_id FROM teams WHERE name = 'Nacional Sub 19'),
     REEMPLAZAR_DOC_ID('Zaballa Facundo'), 'sub', NULL, NULL),
    (gen_random_uuid(), (SELECT match_id FROM matches WHERE match_date = '2024-07-19 09:00:00'),
     (SELECT team_id FROM teams WHERE name = 'Nacional Sub 19'),
     REEMPLAZAR_DOC_ID('Martinez Mauro'), 'sub', NULL, NULL),
    (gen_random_uuid(), (SELECT match_id FROM matches WHERE match_date = '2024-07-19 09:00:00'),
     (SELECT team_id FROM teams WHERE name = 'Nacional Sub 19'),
     REEMPLAZAR_DOC_ID('Rijo Tiago'), 'sub', NULL, NULL),
    (gen_random_uuid(), (SELECT match_id FROM matches WHERE match_date = '2024-07-19 09:00:00'),
     (SELECT team_id FROM teams WHERE name = 'Nacional Sub 19'),
     REEMPLAZAR_DOC_ID('Bazzano Fernandez Misael Andres'), 'sub', NULL, NULL);

-- ============================================
-- Insert Events (Tarjetas)
-- ============================================
INSERT INTO events (event_id, match_id, team_id, player_id, minute, type)
VALUES
    (gen_random_uuid(),
     (SELECT match_id FROM matches WHERE match_date = '2024-07-19 09:00:00'),
     (SELECT team_id FROM teams WHERE name = 'Nacional Sub 19'),
     REEMPLAZAR_DOC_ID('Echeverria Juan Pedro'),
     38, 'yellow'),
    (gen_random_uuid(),
     (SELECT match_id FROM matches WHERE match_date = '2024-07-19 09:00:00'),
     (SELECT team_id FROM teams WHERE name = 'Nacional Sub 19'),
     REEMPLAZAR_DOC_ID('Lopez Inti'),
     79, 'yellow'),
    (gen_random_uuid(),
     (SELECT match_id FROM matches WHERE match_date = '2024-07-19 09:00:00'),
     (SELECT team_id FROM teams WHERE name = 'Nacional Sub 19'),
     REEMPLAZAR_DOC_ID('Sanchez Aranda Benjamin'),
     87, 'yellow');
     
-- ============================================
-- Insert Events (Sustituciones)
-- ============================================
-- ============================================
-- Sustituciones como dos eventos (sub_off / sub_on)
-- ============================================

-- Espinosa Ferreira Santiago OUT, Martínez Mauro IN (76’)
ALTER TABLE events
ADD CONSTRAINT unique_event UNIQUE (match_id, player_id, minute, type);    
    
INSERT INTO events (
  event_id, match_id, team_id, player_id, related_player_id,
  minute, added_time, type, assist_player_id, reason, data_json
)
VALUES
  (
    gen_random_uuid(),
    (SELECT match_id FROM matches WHERE match_date = '2024-07-19 09:00:00'),
    (SELECT home_team_id FROM matches WHERE match_date = '2024-07-19 09:00:00'),
    REEMPLAZAR_DOC_ID('Espinosa Ferreira Santiago'),
    REEMPLAZAR_DOC_ID('Martinez Mauro'),
    76, NULL, 'sub_off', NULL, NULL,
    jsonb_build_object('player_out_id', REEMPLAZAR_DOC_ID('Espinosa Ferreira Santiago'),
                       'player_in_id',  REEMPLAZAR_DOC_ID('Martinez Mauro'))
  ),
  (
    gen_random_uuid(),
    (SELECT match_id FROM matches WHERE match_date = '2024-07-19 09:00:00'),
    (SELECT home_team_id FROM matches WHERE match_date = '2024-07-19 09:00:00'),
    REEMPLAZAR_DOC_ID('Martinez Mauro'),
    REEMPLAZAR_DOC_ID('Espinosa Ferreira Santiago'),
    76, NULL, 'sub_on', NULL, NULL,
    jsonb_build_object('player_out_id', REEMPLAZAR_DOC_ID('Espinosa Ferreira Santiago'),
                       'player_in_id',  REEMPLAZAR_DOC_ID('Martinez Mauro'))
  )
ON CONFLICT (match_id, player_id, minute, type) DO NOTHING;

-- García Juan Ignacio OUT, Guevara Máximo IN (76’)
INSERT INTO events (
  event_id, match_id, team_id, player_id, related_player_id,
  minute, added_time, type, assist_player_id, reason, data_json
)
VALUES
  (
    gen_random_uuid(),
    (SELECT match_id FROM matches WHERE match_date = '2024-07-19 09:00:00'),
    (SELECT home_team_id FROM matches WHERE match_date = '2024-07-19 09:00:00'),
    REEMPLAZAR_DOC_ID('Garcia Juan Ignacio'),
    REEMPLAZAR_DOC_ID('Guevara Maximo'),
    76, NULL, 'sub_off', NULL, NULL,
    jsonb_build_object('player_out_id', REEMPLAZAR_DOC_ID('Garcia Juan Ignacio'),
                       'player_in_id',  REEMPLAZAR_DOC_ID('Guevara Maximo'))
  ),
  (
    gen_random_uuid(),
    (SELECT match_id FROM matches WHERE match_date = '2024-07-19 09:00:00'),
    (SELECT home_team_id FROM matches WHERE match_date = '2024-07-19 09:00:00'),
    REEMPLAZAR_DOC_ID('Guevara Maximo'),
    REEMPLAZAR_DOC_ID('Garcia Juan Ignacio'),
    76, NULL, 'sub_on', NULL, NULL,
    jsonb_build_object('player_out_id', REEMPLAZAR_DOC_ID('Garcia Juan Ignacio'),
                       'player_in_id',  REEMPLAZAR_DOC_ID('Guevara Maximo'))
  )
ON CONFLICT (match_id, player_id, minute, type) DO NOTHING;

-- Quinteros Brian OUT, Rijo Tiago IN (58’)
INSERT INTO events (
  event_id, match_id, team_id, player_id, related_player_id,
  minute, added_time, type, assist_player_id, reason, data_json
)
VALUES
  (
    gen_random_uuid(),
    (SELECT match_id FROM matches WHERE match_date = '2024-07-19 09:00:00'),
    (SELECT home_team_id FROM matches WHERE match_date = '2024-07-19 09:00:00'),
    REEMPLAZAR_DOC_ID('Quinteros Brian'),
    REEMPLAZAR_DOC_ID('Rijo Tiago'),
    58, NULL, 'sub_off', NULL, NULL,
    jsonb_build_object('player_out_id', REEMPLAZAR_DOC_ID('Quinteros Brian'),
                       'player_in_id',  REEMPLAZAR_DOC_ID('Rijo Tiago'))
  ),
  (
    gen_random_uuid(),
    (SELECT match_id FROM matches WHERE match_date = '2024-07-19 09:00:00'),
    (SELECT home_team_id FROM matches WHERE match_date = '2024-07-19 09:00:00'),
    REEMPLAZAR_DOC_ID('Rijo Tiago'),
    REEMPLAZAR_DOC_ID('Quinteros Brian'),
    58, NULL, 'sub_on', NULL, NULL,
    jsonb_build_object('player_out_id', REEMPLAZAR_DOC_ID('Quinteros Brian'),
                       'player_in_id',  REEMPLAZAR_DOC_ID('Rijo Tiago'))
  )
ON CONFLICT (match_id, player_id, minute, type) DO NOTHING;

-- López Nahuel OUT, Acosta Facundo IN (76’)
INSERT INTO events (
  event_id, match_id, team_id, player_id, related_player_id,
  minute, added_time, type, assist_player_id, reason, data_json
)
VALUES
  (
    gen_random_uuid(),
    (SELECT match_id FROM matches WHERE match_date = '2024-07-19 09:00:00'),
    (SELECT home_team_id FROM matches WHERE match_date = '2024-07-19 09:00:00'),
    REEMPLAZAR_DOC_ID('Lopez Nahuel'),
    REEMPLAZAR_DOC_ID('Acosta Facundo'),
    76, NULL, 'sub_off', NULL, NULL,
    jsonb_build_object('player_out_id', REEMPLAZAR_DOC_ID('Lopez Nahuel'),
                       'player_in_id',  REEMPLAZAR_DOC_ID('Acosta Facundo'))
  ),
  (
    gen_random_uuid(),
    (SELECT match_id FROM matches WHERE match_date = '2024-07-19 09:00:00'),
    (SELECT home_team_id FROM matches WHERE match_date = '2024-07-19 09:00:00'),
    REEMPLAZAR_DOC_ID('Acosta Facundo'),
    REEMPLAZAR_DOC_ID('Lopez Nahuel'),
    76, NULL, 'sub_on', NULL, NULL,
    jsonb_build_object('player_out_id', REEMPLAZAR_DOC_ID('Lopez Nahuel'),
                       'player_in_id',  REEMPLAZAR_DOC_ID('Acosta Facundo'))
  )
ON CONFLICT (match_id, player_id, minute, type) DO NOTHING;



        WITH first_timestamps AS (

            SELECT 

                player_display_name,

                MIN(time) as first_time

            FROM "danubio"

            GROUP BY player_display_name

        )

        SELECT 

            player_display_name,

            first_time

        FROM first_timestamps

        ORDER BY first_time;
        
       
       
       
       
       INSERT INTO competitions (name, season)
VALUES ('Juveniles A - Uruguayo', '2024')
ON CONFLICT (name, season) DO NOTHING;

-- Venues
INSERT INTO venues (name)
VALUES ('Nacional - Los Cespedes')
ON CONFLICT (name) DO NOTHING;

-- Teams
INSERT INTO teams (name, category)
VALUES
    ('Nacional', 'Sub 19'),
    ('Miramar Misiones', 'Sub 19')
ON CONFLICT (name, category) DO NOTHING;
       
       
       
       --- MIRAMAR
       BEGIN;

-- Competitions
INSERT INTO competitions (name, season)
VALUES ('Juveniles A - Uruguayo', '2024')
ON CONFLICT (name, season) DO NOTHING;

-- Venues
INSERT INTO venues (name)
VALUES ('Nacional - Los Cespedes')
ON CONFLICT (name) DO NOTHING;

-- Teams
INSERT INTO teams (name, category)
VALUES
    ('Nacional', 'Sub 19'),
    ('Miramar Misiones', 'Sub 19')
ON CONFLICT (name, category) DO NOTHING;

-- Matches
WITH competition_info AS (
    SELECT competition_id FROM competitions WHERE name = 'Juveniles A - Uruguayo' AND season = '2024'
), venue_info AS (
    SELECT venue_id FROM venues WHERE name = 'Nacional - Los Cespedes'
), home_team_info AS (
    SELECT team_id FROM teams WHERE name = 'Nacional' AND category = 'Sub 19'
), away_team_info AS (
    SELECT team_id FROM teams WHERE name = 'Miramar Misiones' AND category = 'Sub 19'
)
INSERT INTO matches (competition_id, venue_id, match_date, home_team_id, away_team_id, result_home, result_away, notes)
SELECT
    (SELECT competition_id FROM competition_info),
    (SELECT venue_id FROM venue_info),
    '2024-06-08 09:00:00',
    (SELECT team_id FROM home_team_info),
    (SELECT team_id FROM away_team_info),
    7,
    0,
    jsonb_build_object('coach_home', 'Espasandin Santiago')
ON CONFLICT (competition_id, home_team_id, away_team_id, match_date) DO UPDATE SET
    result_home = EXCLUDED.result_home,
    result_away = EXCLUDED.result_away,
    notes = EXCLUDED.notes;

-- Match Players
WITH match_info AS (
    SELECT match_id, home_team_id
    FROM matches
    WHERE match_date = '2024-06-08 09:00:00'
      AND home_team_id = (SELECT team_id FROM teams WHERE name = 'Nacional' AND category = 'Sub 19')
      AND away_team_id = (SELECT team_id FROM teams WHERE name = 'Miramar Misiones' AND category = 'Sub 19')
)
INSERT INTO match_players (match_id, team_id, player_id, role)
VALUES
    -- Starters
    ((SELECT match_id FROM match_info), (SELECT home_team_id FROM match_info), REEMPLAZAR_DOC_ID('Bonilla Federico'), 'starter'),
    ((SELECT match_id FROM match_info), (SELECT home_team_id FROM match_info), REEMPLAZAR_DOC_ID('Echeverria Juan Pedro'), 'starter'),
    ((SELECT match_id FROM match_info), (SELECT home_team_id FROM match_info), REEMPLAZAR_DOC_ID('Calione Paolo'), 'starter'),
    ((SELECT match_id FROM match_info), (SELECT home_team_id FROM match_info), REEMPLAZAR_DOC_ID('Pedrouzo Federico'), 'starter'),
    ((SELECT match_id FROM match_info), (SELECT home_team_id FROM match_info), REEMPLAZAR_DOC_ID('Vazquez Lautaro'), 'starter'),
    ((SELECT match_id FROM match_info), (SELECT home_team_id FROM match_info), REEMPLAZAR_DOC_ID('Garcia Juan Ignacio'), 'starter'),
    ((SELECT match_id FROM match_info), (SELECT home_team_id FROM match_info), REEMPLAZAR_DOC_ID('Del Pino Emiliano'), 'starter'),
    ((SELECT match_id FROM match_info), (SELECT home_team_id FROM match_info), REEMPLAZAR_DOC_ID('Lopez Inti'), 'starter'),
    ((SELECT match_id FROM match_info), (SELECT home_team_id FROM match_info), REEMPLAZAR_DOC_ID('Lopez Nahuel'), 'starter'),
    ((SELECT match_id FROM match_info), (SELECT home_team_id FROM match_info), REEMPLAZAR_DOC_ID('Cuadro Navarro Alexis Ezequiel'), 'starter'),
    ((SELECT match_id FROM match_info), (SELECT home_team_id FROM match_info), REEMPLAZAR_DOC_ID('Dalmas Jonathan'), 'starter'),
    -- Substitutes
    ((SELECT match_id FROM match_info), (SELECT home_team_id FROM match_info), REEMPLAZAR_DOC_ID('Bianchi Juan Felipe'), 'sub'),
    ((SELECT match_id FROM match_info), (SELECT home_team_id FROM match_info), REEMPLAZAR_DOC_ID('Frugone Axel'), 'sub'),
    ((SELECT match_id FROM match_info), (SELECT home_team_id FROM match_info), REEMPLAZAR_DOC_ID('Espinosa Ferreira Santiago'), 'sub'),
    ((SELECT match_id FROM match_info), (SELECT home_team_id FROM match_info), REEMPLAZAR_DOC_ID('Viera Tomas'), 'sub'),
    ((SELECT match_id FROM match_info), (SELECT home_team_id FROM match_info), REEMPLAZAR_DOC_ID('Piriz Ezequiel'), 'sub'),
    ((SELECT match_id FROM match_info), (SELECT home_team_id FROM match_info), REEMPLAZAR_DOC_ID('Rolando Mauro'), 'sub'),
    ((SELECT match_id FROM match_info), (SELECT home_team_id FROM match_info), REEMPLAZAR_DOC_ID('Brener Francisco'), 'sub'),
    ((SELECT match_id FROM match_info), (SELECT home_team_id FROM match_info), REEMPLAZAR_DOC_ID('Coello Facundo'), 'sub'),
    ((SELECT match_id FROM match_info), (SELECT home_team_id FROM match_info), REEMPLAZAR_DOC_ID('Quinteros Brian'), 'sub'),
    ((SELECT match_id FROM match_info), (SELECT home_team_id FROM match_info), REEMPLAZAR_DOC_ID('Rijo Tiago'), 'sub')
ON CONFLICT (match_id, player_id) DO NOTHING;

-- Events
WITH match_details AS (
    SELECT match_id, home_team_id
    FROM matches
    WHERE match_date = '2024-06-08 09:00:00'
      AND home_team_id = (SELECT team_id FROM teams WHERE name = 'Nacional' AND category = 'Sub 19')
      AND away_team_id = (SELECT team_id FROM teams WHERE name = 'Miramar Misiones' AND category = 'Sub 19')
)
INSERT INTO events (match_id, team_id, player_id, related_player_id, minute, type, data_json)
VALUES
    -- Goals
    ((SELECT match_id FROM match_details), (SELECT home_team_id FROM match_details), REEMPLAZAR_DOC_ID('Echeverria Juan Pedro'), NULL, 7, 'goal'::event_type, NULL),
    ((SELECT match_id FROM match_details), (SELECT home_team_id FROM match_details), REEMPLAZAR_DOC_ID('Del Pino Emiliano'), NULL, 16, 'goal'::event_type, NULL),
    ((SELECT match_id FROM match_details), (SELECT home_team_id FROM match_details), REEMPLAZAR_DOC_ID('Calione Paolo'), NULL, 25, 'goal'::event_type, NULL),
    ((SELECT match_id FROM match_details), (SELECT home_team_id FROM match_details), REEMPLAZAR_DOC_ID('Del Pino Emiliano'), NULL, 49, 'goal'::event_type, NULL),
    ((SELECT match_id FROM match_details), (SELECT home_team_id FROM match_details), REEMPLAZAR_DOC_ID('Lopez Nahuel'), NULL, 66, 'goal'::event_type, NULL),
    ((SELECT match_id FROM match_details), (SELECT home_team_id FROM match_details), REEMPLAZAR_DOC_ID('Brener Francisco'), NULL, 79, 'goal'::event_type, NULL),
    ((SELECT match_id FROM match_details), (SELECT home_team_id FROM match_details), REEMPLAZAR_DOC_ID('Lopez Inti'), NULL, 90, 'goal'::event_type, NULL),
    
    -- Yellow Cards
    ((SELECT match_id FROM match_details), (SELECT home_team_id FROM match_details), REEMPLAZAR_DOC_ID('Vazquez Lautaro'), NULL, 35, 'yellow'::event_type, NULL),
    ((SELECT match_id FROM match_details), (SELECT home_team_id FROM match_details), REEMPLAZAR_DOC_ID('Brener Francisco'), NULL, 86, 'yellow'::event_type, NULL),

    -- Substitutions
    -- Vazquez Lautaro OUT (41'), Rolando Mauro IN
    ((SELECT match_id FROM match_details), (SELECT home_team_id FROM match_details), REEMPLAZAR_DOC_ID('Vazquez Lautaro'), REEMPLAZAR_DOC_ID('Rolando Mauro'), 41, 'sub_off'::event_type, jsonb_build_object('player_out_id', REEMPLAZAR_DOC_ID('Vazquez Lautaro'), 'player_in_id', REEMPLAZAR_DOC_ID('Rolando Mauro'))),
    ((SELECT match_id FROM match_details), (SELECT home_team_id FROM match_details), REEMPLAZAR_DOC_ID('Rolando Mauro'), REEMPLAZAR_DOC_ID('Vazquez Lautaro'), 41, 'sub_on'::event_type, jsonb_build_object('player_out_id', REEMPLAZAR_DOC_ID('Vazquez Lautaro'), 'player_in_id', REEMPLAZAR_DOC_ID('Rolando Mauro'))),

    -- Del Pino Emiliano OUT (60'), Brener Francisco IN
    ((SELECT match_id FROM match_details), (SELECT home_team_id FROM match_details), REEMPLAZAR_DOC_ID('Del Pino Emiliano'), REEMPLAZAR_DOC_ID('Brener Francisco'), 60, 'sub_off'::event_type, jsonb_build_object('player_out_id', REEMPLAZAR_DOC_ID('Del Pino Emiliano'), 'player_in_id', REEMPLAZAR_DOC_ID('Brener Francisco'))),
    ((SELECT match_id FROM match_details), (SELECT home_team_id FROM match_details), REEMPLAZAR_DOC_ID('Brener Francisco'), REEMPLAZAR_DOC_ID('Del Pino Emiliano'), 60, 'sub_on'::event_type, jsonb_build_object('player_out_id', REEMPLAZAR_DOC_ID('Del Pino Emiliano'), 'player_in_id', REEMPLAZAR_DOC_ID('Brener Francisco'))),

    -- Cuadro Navarro Alexis Ezequiel OUT (60'), Rijo Tiago IN
    ((SELECT match_id FROM match_details), (SELECT home_team_id FROM match_details), REEMPLAZAR_DOC_ID('Cuadro Navarro Alexis Ezequiel'), REEMPLAZAR_DOC_ID('Rijo Tiago'), 60, 'sub_off'::event_type, jsonb_build_object('player_out_id', REEMPLAZAR_DOC_ID('Cuadro Navarro Alexis Ezequiel'), 'player_in_id', REEMPLAZAR_DOC_ID('Rijo Tiago'))),
    ((SELECT match_id FROM match_details), (SELECT home_team_id FROM match_details), REEMPLAZAR_DOC_ID('Rijo Tiago'), REEMPLAZAR_DOC_ID('Cuadro Navarro Alexis Ezequiel'), 60, 'sub_on'::event_type, jsonb_build_object('player_out_id', REEMPLAZAR_DOC_ID('Cuadro Navarro Alexis Ezequiel'), 'player_in_id', REEMPLAZAR_DOC_ID('Rijo Tiago'))),

    -- Calione Paolo OUT (75'), Espinosa Ferreira Santiago IN
    ((SELECT match_id FROM match_details), (SELECT home_team_id FROM match_details), REEMPLAZAR_DOC_ID('Calione Paolo'), REEMPLAZAR_DOC_ID('Espinosa Ferreira Santiago'), 75, 'sub_off'::event_type, jsonb_build_object('player_out_id', REEMPLAZAR_DOC_ID('Calione Paolo'), 'player_in_id', REEMPLAZAR_DOC_ID('Espinosa Ferreira Santiago'))),
    ((SELECT match_id FROM match_details), (SELECT home_team_id FROM match_details), REEMPLAZAR_DOC_ID('Espinosa Ferreira Santiago'), REEMPLAZAR_DOC_ID('Calione Paolo'), 75, 'sub_on'::event_type, jsonb_build_object('player_out_id', REEMPLAZAR_DOC_ID('Calione Paolo'), 'player_in_id', REEMPLAZAR_DOC_ID('Espinosa Ferreira Santiago'))),

    -- Dalmas Jonathan OUT (75'), Coello Facundo IN
    ((SELECT match_id FROM match_details), (SELECT home_team_id FROM match_details), REEMPLAZAR_DOC_ID('Dalmas Jonathan'), REEMPLAZAR_DOC_ID('Coello Facundo'), 75, 'sub_off'::event_type, jsonb_build_object('player_out_id', REEMPLAZAR_DOC_ID('Dalmas Jonathan'), 'player_in_id', REEMPLAZAR_DOC_ID('Coello Facundo'))),
    ((SELECT match_id FROM match_details), (SELECT home_team_id FROM match_details), REEMPLAZAR_DOC_ID('Coello Facundo'), REEMPLAZAR_DOC_ID('Dalmas Jonathan'), 75, 'sub_on'::event_type, jsonb_build_object('player_out_id', REEMPLAZAR_DOC_ID('Dalmas Jonathan'), 'player_in_id', REEMPLAZAR_DOC_ID('Coello Facundo')))
    

ON CONFLICT (match_id, player_id, minute, type) DO NOTHING;

COMMIT;