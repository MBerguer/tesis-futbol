-- New hook new-front/app/hooks/useServerPhotoBlocks.ts to load and mutate server blocks.
CREATE TABLE IF NOT EXISTS player_photo_blocks (
    player_id integer NOT NULL,
    photo_path text NOT NULL,
    created_at timestamp without time zone DEFAULT NOW(),
    PRIMARY KEY (player_id, photo_path)
)