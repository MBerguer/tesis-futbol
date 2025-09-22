-- New hook new-front/app/hooks/useServerPhotoBlocks.ts to load and mutate server blocks.
CREATE TABLE IF NOT EXISTS player_custom_photos(
    player_id integer primary key, 
    photo_url text not null, 
    updated_at timestamp without time zone default now()
)