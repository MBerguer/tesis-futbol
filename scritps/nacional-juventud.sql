

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