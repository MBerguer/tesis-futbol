

-- ============================================
-- Extensiones necesarias
-- ============================================
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================
-- Función para mapear nombre -> player_id
-- ============================================
DROP FUNCTION IF EXISTS reemplazar_doc_id(text);

CREATE OR REPLACE FUNCTION REEMPLAZAR_DOC_ID(nombre_jugador TEXT)
RETURNS int AS $$
DECLARE
    Documento_de_Identidad int;
BEGIN
    -- 1️⃣ Match exacto sin tildes
    SELECT "Documento_de_Identidad"
    INTO Documento_de_Identidad
    FROM administrativo
    WHERE unaccent(lower("Jugador")) = unaccent(lower(nombre_jugador))
    LIMIT 1;

    -- 2️⃣ Match parcial
    IF Documento_de_Identidad IS NULL THEN
        SELECT "Documento_de_Identidad"
        INTO Documento_de_Identidad
        FROM administrativo
        WHERE unaccent(lower("Jugador")) ILIKE unaccent(lower('%' || nombre_jugador || '%'))
        LIMIT 1;
    END IF;

    -- 3️⃣ Match difuso con similarity
    IF Documento_de_Identidad IS NULL THEN
        SELECT "Documento_de_Identidad"
        INTO Documento_de_Identidad
        FROM administrativo
        WHERE similarity(unaccent(lower("Jugador")), unaccent(lower(nombre_jugador))) > 0.4
        ORDER BY similarity(unaccent(lower("Jugador")), unaccent(lower(nombre_jugador))) DESC
        LIMIT 1;
    END IF;

    -- 4️⃣ Si no se encuentra, insertar en jugadores_faltantes y en administrativo
    IF Documento_de_Identidad IS NULL THEN
        -- Registrar en jugadores_faltantes
        INSERT INTO jugadores_faltantes(nombre_jugador)
        VALUES (nombre_jugador);

        -- Generar un Documento_de_Identidad incremental
        Documento_de_Identidad := nextval('administrativo_doc_seq');

        -- Insertar jugador “fantasma” en administrativo
        INSERT INTO administrativo("Jugador", "Documento_de_Identidad")
        VALUES (nombre_jugador, Documento_de_Identidad);
    END IF;

    RETURN Documento_de_Identidad;
END;
$$ LANGUAGE plpgsql;






select * from administrativo a where "Documento_de_Identidad" is null;
select "Documento_de_Identidad", count(*) from administrativo group by(administrativo."Documento_de_Identidad");
DELETE FROM administrativo a






WITH cte AS (
    SELECT *,
           ROW_NUMBER() OVER (PARTITION BY "Documento_de_Identidad" ORDER BY ctid) AS rn
    FROM administrativo
)
DELETE FROM administrativo
WHERE ctid IN (
    SELECT ctid
    FROM cte
    WHERE rn > 1
);
 
ALTER TABLE administrativo
ADD CONSTRAINT administrativo_pkey PRIMARY KEY("Documento_de_Identidad");


select * from match_players;

ALTER TABLE match_players DROP COLUMN player_id;

ALTER TABLE match_players
ADD COLUMN player_id int;

ALTER TABLE events DROP COLUMN player_id;
ALTER TABLE events ADD COLUMN player_id int;

ALTER TABLE events DROP COLUMN related_player_id;
ALTER TABLE events ADD COLUMN related_player_id int;

ALTER TABLE events DROP COLUMN assist_player_id;
ALTER TABLE events ADD COLUMN assist_player_id int;



ALTER TABLE match_players
ADD CONSTRAINT match_players_doc_fkey
FOREIGN KEY (player_id)
REFERENCES administrativo("Documento_de_Identidad");

ALTER TABLE events
ADD CONSTRAINT events_player_doc_fkey
FOREIGN KEY (player_id)
REFERENCES administrativo("Documento_de_Identidad");

ALTER TABLE events
ADD CONSTRAINT events_related_doc_fkey
FOREIGN KEY (related_player_id)
REFERENCES administrativo("Documento_de_Identidad");

ALTER TABLE events
ADD CONSTRAINT events_assist_doc_fkey
FOREIGN KEY (assist_player_id)
REFERENCES administrativo("Documento_de_Identidad");


CREATE TABLE IF NOT EXISTS jugadores_faltantes (
    id SERIAL PRIMARY KEY,
    nombre_jugador TEXT NOT NULL,
    fecha_detectado TIMESTAMP DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS administrativo_doc_seq
START WITH 70000001
INCREMENT BY 1;



select * from administrativo a where "Jugador" like '%Lopez%';