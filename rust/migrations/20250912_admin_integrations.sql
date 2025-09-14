-- Switch player identity to "administrativo" with Documento_de_Identidad (int)

-- Extensions needed for REEMPLAZAR_DOC_ID
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Ensure primary key on administrativo
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'administrativo' AND constraint_type = 'PRIMARY KEY'
    ) THEN
        ALTER TABLE administrativo
        ADD CONSTRAINT administrativo_pkey PRIMARY KEY ("Documento_de_Identidad");
    END IF;
END$$;

-- match_players: switch player_id to int referencing administrativo
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='match_players' AND column_name='player_id') THEN
        ALTER TABLE match_players DROP COLUMN player_id;
    END IF;
END$$;

ALTER TABLE match_players ADD COLUMN player_id int;

-- events: switch player-related columns to int
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='player_id') THEN
        ALTER TABLE events DROP COLUMN player_id;
    END IF;
END$$;
ALTER TABLE events ADD COLUMN player_id int;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='related_player_id') THEN
        ALTER TABLE events DROP COLUMN related_player_id;
    END IF;
END$$;
ALTER TABLE events ADD COLUMN related_player_id int;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='assist_player_id') THEN
        ALTER TABLE events DROP COLUMN assist_player_id;
    END IF;
END$$;
ALTER TABLE events ADD COLUMN assist_player_id int;

-- FKs to administrativo
ALTER TABLE match_players
    ADD CONSTRAINT match_players_doc_fkey
    FOREIGN KEY (player_id)
    REFERENCES administrativo ("Documento_de_Identidad");

ALTER TABLE events
    ADD CONSTRAINT events_player_doc_fkey
    FOREIGN KEY (player_id)
    REFERENCES administrativo ("Documento_de_Identidad");

ALTER TABLE events
    ADD CONSTRAINT events_related_doc_fkey
    FOREIGN KEY (related_player_id)
    REFERENCES administrativo ("Documento_de_Identidad");

ALTER TABLE events
    ADD CONSTRAINT events_assist_doc_fkey
    FOREIGN KEY (assist_player_id)
    REFERENCES administrativo ("Documento_de_Identidad");

-- Supporting sequence and tables for missing players
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relkind='S' AND relname='administrativo_doc_seq') THEN
        CREATE SEQUENCE administrativo_doc_seq START 10000000;
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS jugadores_faltantes (
    id SERIAL PRIMARY KEY,
    nombre_jugador TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Matching function
CREATE OR REPLACE FUNCTION REEMPLAZAR_DOC_ID(nombre_jugador TEXT)
RETURNS int AS $$
DECLARE
    Documento_de_Identidad int;
BEGIN
    -- exact match without accents
    SELECT "Documento_de_Identidad"
      INTO Documento_de_Identidad
      FROM administrativo
     WHERE unaccent(lower("Jugador")) = unaccent(lower(nombre_jugador))
     LIMIT 1;

    -- partial match
    IF Documento_de_Identidad IS NULL THEN
        SELECT "Documento_de_Identidad"
          INTO Documento_de_Identidad
          FROM administrativo
         WHERE unaccent(lower("Jugador")) ILIKE unaccent(lower('%' || nombre_jugador || '%'))
         LIMIT 1;
    END IF;

    -- fuzzy match by similarity
    IF Documento_de_Identidad IS NULL THEN
        SELECT "Documento_de_Identidad"
          INTO Documento_de_Identidad
          FROM administrativo
         WHERE similarity(unaccent(lower("Jugador")), unaccent(lower(nombre_jugador))) > 0.4
         ORDER BY similarity(unaccent(lower("Jugador")), unaccent(lower(nombre_jugador))) DESC
         LIMIT 1;
    END IF;

    -- if still not found, insert placeholder
    IF Documento_de_Identidad IS NULL THEN
        INSERT INTO jugadores_faltantes(nombre_jugador) VALUES (nombre_jugador);
        Documento_de_Identidad := nextval('administrativo_doc_seq');
        INSERT INTO administrativo("Jugador", "Documento_de_Identidad")
        VALUES (nombre_jugador, Documento_de_Identidad);
    END IF;

    RETURN Documento_de_Identidad;
END;
$$ LANGUAGE plpgsql;

