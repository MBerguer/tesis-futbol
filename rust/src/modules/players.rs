use crate::config::dbconfig::DbConfig;
use axum::extract::Path;
use axum::extract::{Json, Multipart, RawPathParams};
use axum::http::StatusCode;
use serde_json::{json, Value};
use sqlx::Row;
use std::path::Path as FsPath;
use tokio::io::AsyncWriteExt;
use uuid::Uuid;

// DbConfig already imported above

pub async fn get_players_basic_profile(Path(user_id): Path<u32>) -> String {
    (1 + user_id).to_string()
}

pub async fn get_player_stats_match(params: RawPathParams) -> Json<Value> {
    let mut user_id = None;
    let mut match_id = None;

    for (key, value) in &params {
        if key == "user_id" {
            user_id = Some(value);
        } else if key == "match_id" {
            match_id = Some(value);
        }
    }

    if user_id.is_none() || match_id.is_none() {
        return Json(json!({ "error": "missing parameters" }));
    }

    Json(json!({
        "player_id": user_id.unwrap(),
        "match_id": match_id.unwrap()
    }))
}

pub async fn get_all_players() -> Json<Value> {
    //instanciate a dbconfig from the impl DbConfig

    let dbconfig = DbConfig::new();
    //format a url to connect to the database with the dbconfig

    // connect to pg
    let pool = sqlx::PgPool::connect(&dbconfig.get_postgres_connection_string())
        .await
        .unwrap();

    // fetch all players in the database, particularly the table administrativo

    let players = sqlx::query!("SELECT * FROM administrativo")
        .fetch_all(&pool)
        .await
        .unwrap();

    let mut serialized_players = Vec::new();

    // the attribute of a player are:
    // Jugador, Fecha_Nacimiento, `Documento_de_Identidad`, `Pasaporte`, `Telefono`, `Celular`, `Email`, `Cobertura_Medica`, `Estudios`, `Oriundo`, `Club_de_Origen`, `Club_de_Origen_Porcentaje, `Posicion`

    players.iter().for_each(|player| {
        serialized_players.push(json!({
            "Jugador": player.Jugador,
            "Fecha_Nacimiento": player.Fecha_Nacimiento,
            "Documento_de_Identidad": player.Documento_de_Identidad,
            "Pasaporte": player.Pasaporte,
            "Telefono": player.Telefono,
            "Celular": player.Celular,
            "Email": player.Email,
            "Cobertura_Medica": player.Cobertura_Medica,
            "Estudios": player.Estudios,
            "Oriundo": player.Oriundo,
            "Club_de_Origen": player.Club_de_Origen,
            "Club_de_Origen_Porcentaje": player.Club_de_Origen_Porcentaje,
            "Posicion": player.Posicion
        }))
    });

    Json(json!({
        "players": serialized_players
    }))
}

pub async fn get_all_players_photos() -> Json<Value> {
    //instanciate a dbconfig from the impl DbConfig

    let dbconfig = DbConfig::new();
    //format a url to connect to the database with the dbconfig

    // connect to pg
    let pool = sqlx::PgPool::connect(&dbconfig.get_postgres_connection_string())
        .await
        .unwrap();

    // fetch all players in the database, particularly the table administrativo

    let fotos = sqlx::query!("SELECT * FROM fotos_path")
        .fetch_all(&pool)
        .await
        .unwrap();

    let mut serialized_fotos = Vec::new();

    // the attribute of a fotos_path are:
    // id, categoria, nombre, path_foto

    fotos.iter().for_each(|foto| {
        serialized_fotos.push(json!({
            "id": foto.id,
            "categoria": "default", // No tenemos categoria en la tabla fotos_path
            "nombre": foto.nombre,
            "path": foto.path_foto
        }))
    });

    Json(json!({
        "fotos": serialized_fotos
    }))
}

// Persisted photo blocks: allow unlinking a mismatched photo (per player, per path)
#[derive(serde::Deserialize)]
pub struct PhotoBlockInput {
    pub player_id: i32,
    #[serde(default)]
    pub path: Option<String>,
}

async fn ensure_photo_blocks_table(pool: &sqlx::PgPool) {
    let _ = sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS player_photo_blocks (
            player_id integer NOT NULL,
            photo_path text NOT NULL,
            created_at timestamp without time zone DEFAULT NOW(),
            PRIMARY KEY (player_id, photo_path)
        )
        "#,
    )
    .execute(pool)
    .await;
}

pub async fn get_player_photo_blocks() -> Json<Value> {
    let dbconfig = DbConfig::new();
    let pool = match sqlx::PgPool::connect(&dbconfig.get_postgres_connection_string()).await {
        Ok(p) => p,
        Err(_) => return Json(json!({ "blocks": [] })),
    };
    ensure_photo_blocks_table(&pool).await;

    let rows = sqlx::query!(
        r#"SELECT player_id, photo_path FROM player_photo_blocks ORDER BY player_id, photo_path"#
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    let blocks: Vec<Value> = rows
        .into_iter()
        .map(|r| json!({ "player_id": r.player_id, "path": r.photo_path }))
        .collect();
    Json(json!({ "blocks": blocks }))
}

pub async fn add_player_photo_block(Json(input): Json<PhotoBlockInput>) -> Json<Value> {
    let dbconfig = DbConfig::new();
    let pool = match sqlx::PgPool::connect(&dbconfig.get_postgres_connection_string()).await {
        Ok(p) => p,
        Err(_) => return Json(json!({ "ok": false })),
    };
    ensure_photo_blocks_table(&pool).await;
    let path = match input.path {
        Some(p) if !p.is_empty() => p,
        _ => return Json(json!({ "ok": false, "error": "missing path" })),
    };
    let _ = sqlx::query!(
        r#"
        INSERT INTO player_photo_blocks(player_id, photo_path)
        VALUES ($1, $2)
        ON CONFLICT (player_id, photo_path) DO NOTHING
        "#,
        input.player_id,
        path
    )
    .execute(&pool)
    .await;
    Json(json!({ "ok": true }))
}

pub async fn remove_player_photo_block(Json(input): Json<PhotoBlockInput>) -> Json<Value> {
    let dbconfig = DbConfig::new();
    let pool = match sqlx::PgPool::connect(&dbconfig.get_postgres_connection_string()).await {
        Ok(p) => p,
        Err(_) => return Json(json!({ "ok": false })),
    };
    ensure_photo_blocks_table(&pool).await;
    if let Some(p) = input.path {
        let _ = sqlx::query!(
            r#"DELETE FROM player_photo_blocks WHERE player_id = $1 AND photo_path = $2"#,
            input.player_id,
            p
        )
        .execute(&pool)
        .await;
    } else {
        let _ = sqlx::query!(
            r#"DELETE FROM player_photo_blocks WHERE player_id = $1"#,
            input.player_id
        )
        .execute(&pool)
        .await;
    }
    Json(json!({ "ok": true }))
}

// Custom photo management
#[derive(serde::Deserialize)]
pub struct CustomPhotoInput {
    pub player_id: i32,
}

pub async fn upload_custom_photo(
    mut multipart: Multipart,
) -> Result<Json<Value>, (StatusCode, String)> {
    // We expect fields: player_id (text), file (binary)
    let mut player_id: Option<i32> = None;
    let mut file_bytes: Option<Vec<u8>> = None;
    let mut filename: Option<String> = None;

    while let Ok(Some(field)) = multipart.next_field().await {
        let name = field.name().unwrap_or("").to_string();
        if name == "player_id" {
            let text = field.text().await.unwrap_or_default();
            if let Ok(pid) = text.parse::<i32>() {
                player_id = Some(pid);
            }
        } else if name == "file" {
            filename = field.file_name().map(|s| s.to_string());
            let data = field
                .bytes()
                .await
                .map_err(|e| (StatusCode::BAD_REQUEST, format!("read file: {}", e)))?;
            file_bytes = Some(data.to_vec());
        }
    }

    let player_id = match player_id {
        Some(pid) => pid,
        None => return Err((StatusCode::BAD_REQUEST, "missing player_id".into())),
    };
    let data = match file_bytes {
        Some(b) => b,
        None => return Err((StatusCode::BAD_REQUEST, "missing file".into())),
    };
    let ext = filename
        .and_then(|f| {
            FsPath::new(&f)
                .extension()
                .and_then(|e| e.to_str())
                .map(|s| s.to_string())
        })
        .unwrap_or_else(|| "jpg".to_string());
    let id = Uuid::new_v4().to_string();
    let rel_path = format!("player_photos/{}_{}.{}", player_id, id, ext);
    let full_path = format!("uploads/{}", rel_path);
    if let Some(parent) = FsPath::new(&full_path).parent() {
        let _ = tokio::fs::create_dir_all(parent).await;
    }
    let mut f = tokio::fs::File::create(&full_path).await.map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("create file: {}", e),
        )
    })?;
    f.write_all(&data).await.map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("write file: {}", e),
        )
    })?;

    // Persist mapping in DB
    let dbconfig = DbConfig::new();
    let pool = sqlx::PgPool::connect(&dbconfig.get_postgres_connection_string())
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "db".into()))?;
    let _ = sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS player_custom_photos(player_id integer primary key, photo_url text not null, updated_at timestamp without time zone default now())"#
    ).execute(&pool).await;
    let _ = sqlx::query!(
        r#"INSERT INTO player_custom_photos(player_id, photo_url, updated_at) VALUES($1,$2,NOW()) ON CONFLICT (player_id) DO UPDATE SET photo_url = EXCLUDED.photo_url, updated_at = NOW()"#,
        player_id,
        format!("/uploads/{}", rel_path)
    ).execute(&pool).await;

    Ok(Json(
        json!({ "ok": true, "url": format!("/uploads/{}", rel_path) }),
    ))
}

pub async fn delete_custom_photo(Json(input): Json<CustomPhotoInput>) -> Json<Value> {
    let dbconfig = DbConfig::new();
    let pool = match sqlx::PgPool::connect(&dbconfig.get_postgres_connection_string()).await {
        Ok(p) => p,
        Err(_) => return Json(json!({"ok": false})),
    };
    let _ = sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS player_custom_photos(player_id integer primary key, photo_url text not null, updated_at timestamp without time zone default now())"#
    ).execute(&pool).await;
    if let Ok(Some(row)) = sqlx::query!(
        r#"SELECT photo_url FROM player_custom_photos WHERE player_id = $1"#,
        input.player_id
    )
    .fetch_optional(&pool)
    .await
    {
        let url: String = row.photo_url;
        // try delete file from disk
        let p = url.trim_start_matches('/');
        let _ = tokio::fs::remove_file(p).await;
    }
    let _ = sqlx::query!(
        r#"DELETE FROM player_custom_photos WHERE player_id = $1"#,
        input.player_id
    )
    .execute(&pool)
    .await;
    Json(json!({"ok": true}))
}

pub async fn get_custom_photos() -> Json<Value> {
    let dbconfig = DbConfig::new();
    let pool = match sqlx::PgPool::connect(&dbconfig.get_postgres_connection_string()).await {
        Ok(p) => p,
        Err(_) => return Json(json!({"photos": []})),
    };
    let _ = sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS player_custom_photos(player_id integer primary key, photo_url text not null, updated_at timestamp without time zone default now())"#
    ).execute(&pool).await;
    let rows = sqlx::query!(r#"SELECT player_id, photo_url FROM player_custom_photos"#)
        .fetch_all(&pool)
        .await
        .unwrap_or_default();
    let arr: Vec<Value> = rows
        .into_iter()
        .map(|r| json!({"player_id": r.player_id, "url": r.photo_url}))
        .collect();
    Json(json!({"photos": arr}))
}

// Global extrema across players for comparator normalization
pub async fn get_player_metrics_extrema() -> Json<Value> {
    let dbconfig = DbConfig::new();
    let pool = match sqlx::PgPool::connect(&dbconfig.get_postgres_connection_string()).await {
        Ok(p) => p,
        Err(_) => {
            return Json(json!({
                "max_distance_m": {"min": 0, "max": 0},
                "hsr_max_m": {"min": 0, "max": 0},
                "max_speed_kmh": {"min": 0.0, "max": 0.0},
                "hmld_25_5_m": {"min": 0, "max": 0},
                "z6_seconds": {"min": 0, "max": 0}
            }));
        }
    };

    let row = sqlx::query!(
        r#"
        SELECT
          MIN(max_distance_m)::double precision   AS min_max_distance_m,
          MAX(max_distance_m)::double precision   AS max_max_distance_m,
          MIN(hsr_max_m)::double precision        AS min_hsr_max_m,
          MAX(hsr_max_m)::double precision        AS max_hsr_max_m,
          MIN(max_speed_kmh)::double precision    AS min_max_speed_kmh,
          MAX(max_speed_kmh)::double precision    AS max_max_speed_kmh,
          MIN(hmld_25_5_m)::double precision      AS min_hmld_25_5_m,
          MAX(hmld_25_5_m)::double precision      AS max_hmld_25_5_m,
          MIN(z6_seconds)::double precision       AS min_z6_seconds,
          MAX(z6_seconds)::double precision       AS max_z6_seconds,
          AVG(max_distance_m)::double precision   AS avg_max_distance_m,
          AVG(hsr_max_m)::double precision        AS avg_hsr_max_m,
          AVG(max_speed_kmh)::double precision    AS avg_max_speed_kmh,
          AVG(hmld_25_5_m)::double precision      AS avg_hmld_25_5_m,
          AVG(z6_seconds)::double precision       AS avg_z6_seconds
        FROM player_metrics_cache
        "#
    )
    .fetch_one(&pool)
    .await
    .ok();

    // Average age
    let avg_age_row = sqlx::query!(
        r#"
        SELECT AVG(EXTRACT(YEAR FROM age(CURRENT_DATE, to_date("Fecha_Nacimiento", 'DD/MM/YYYY'))))::double precision AS avg_age
        FROM administrativo
        WHERE "Fecha_Nacimiento" IS NOT NULL AND "Fecha_Nacimiento" ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$'
        "#
    ).fetch_one(&pool).await.ok();

    if let Some(r) = row {
        let avg_age_years: f64 = avg_age_row.and_then(|a| a.avg_age).unwrap_or(0.0);
        return Json(json!({
            "max_distance_m": { "min": (r.min_max_distance_m.unwrap_or(0.0).round() as i64), "max": (r.max_max_distance_m.unwrap_or(0.0).round() as i64) },
            "hsr_max_m": { "min": (r.min_hsr_max_m.unwrap_or(0.0).round() as i64), "max": (r.max_hsr_max_m.unwrap_or(0.0).round() as i64) },
            "max_speed_kmh": { "min": r.min_max_speed_kmh.unwrap_or(0.0), "max": r.max_max_speed_kmh.unwrap_or(0.0) },
            "hmld_25_5_m": { "min": (r.min_hmld_25_5_m.unwrap_or(0.0).round() as i64), "max": (r.max_hmld_25_5_m.unwrap_or(0.0).round() as i64) },
            "z6_seconds": { "min": (r.min_z6_seconds.unwrap_or(0.0).round() as i64), "max": (r.max_z6_seconds.unwrap_or(0.0).round() as i64) },
            "averages": {
                "max_distance_m": r.avg_max_distance_m.unwrap_or(0.0),
                "hsr_max_m": r.avg_hsr_max_m.unwrap_or(0.0),
                "max_speed_kmh": r.avg_max_speed_kmh.unwrap_or(0.0),
                "hmld_25_5_m": r.avg_hmld_25_5_m.unwrap_or(0.0),
                "z6_seconds": r.avg_z6_seconds.unwrap_or(0.0),
                "age_years": avg_age_years
            }
        }));
    }

    Json(json!({
        "max_distance_m": {"min": 0, "max": 0},
        "hsr_max_m": {"min": 0, "max": 0},
        "max_speed_kmh": {"min": 0.0, "max": 0.0},
        "hmld_25_5_m": {"min": 0, "max": 0},
        "z6_seconds": {"min": 0, "max": 0}
    }))
}

// Placeholder: returns current hardcoded maximum metrics for a player across matches.
// Later we will compute these by aggregating over matches and gps tables using pg_trgm.
pub async fn get_player_max_metrics(Path(user_id): Path<i32>) -> Json<Value> {
    // Defaults (fallbacks)
    let mut max_speed_kmh: f64 = 27.0;
    let mut max_distance_m_val: f64 = 4013.0;
    let mut hsr_max_m_val: f64 = 0.0;
    let mut hmld_25_5_val: f64 = 0.0;
    let mut hmld_18_val: f64 = 0.0;
    let mut z6_seconds_val: f64 = 0.0;
    let mut z6_distance_val: f64 = 0.0;
    let mut max_speed_match_id: Option<uuid::Uuid> = None;
    let mut max_speed_table: Option<String> = None;
    let mut max_speed_minute: Option<String> = None; // formatted MM:SS based on elapsed
    let mut max_speed_time: Option<String> = None; // raw time from table
    let mut manual_first_half_start: Option<i32> = None;
    let mut max_distance_match_id: Option<uuid::Uuid> = None;
    let mut max_distance_table: Option<String> = None;
    let mut hsr_max_match_id: Option<uuid::Uuid> = None;
    let mut hsr_max_table: Option<String> = None;
    let mut hmld_25_5_match_id: Option<uuid::Uuid> = None;
    let mut hmld_25_5_table: Option<String> = None;
    let mut hmld_18_match_id: Option<uuid::Uuid> = None;
    let mut hmld_18_table: Option<String> = None;
    let mut z6_match_id: Option<uuid::Uuid> = None;
    let mut z6_table: Option<String> = None;

    // Other placeholders to keep previous response stable
    let max_distance_m: i64 = 4013;
    let hsr_max_m: i64 = 1653;
    let high_metabolic_distance_m: i64 = 550;
    let z6_seconds: i64 = 15;
    let z6_distance_m: i64 = 229;
    // Default threshold for HSR computation
    let hsr_threshold_kmh: f64 = 19.8;
    let z6_threshold_kmh: f64 = 25.2;

    // Connect to DB
    let dbconfig = DbConfig::new();
    let pool = match sqlx::PgPool::connect(&dbconfig.get_postgres_connection_string()).await {
        Ok(p) => p,
        Err(_) => {
            return Json(json!({
                "max_distance_m": max_distance_m,
                "hsr_max_m": hsr_max_m,
                "max_speed_kmh": max_speed_kmh,
                "high_metabolic_distance_m": high_metabolic_distance_m,
                "z6": { "seconds": z6_seconds, "distance_m": z6_distance_m }
            }));
        }
    };

    // Try cache first
    if let Ok(Some(cached)) = sqlx::query!(
        r#"SELECT * FROM player_metrics_cache WHERE player_id = $1"#,
        user_id
    )
    .fetch_optional(&pool)
    .await
    {
        return Json(json!({
            "max_distance_m": (cached.max_distance_m.unwrap_or(0.0).round() as i64),
            "hsr_max_m": (cached.hsr_max_m.unwrap_or(0.0).round() as i64),
            "max_speed_kmh": cached.max_speed_kmh.unwrap_or(0.0),
            "high_metabolic_distance_m": (cached.hmld_25_5_m.unwrap_or(0.0).round() as i64),
            "z6": { "seconds": (cached.z6_seconds.unwrap_or(0.0).round() as i64), "distance_m": (cached.z6_distance_m.unwrap_or(0.0).round() as i64) },
            "max_speed_detail": { "match_id": cached.max_speed_match_id, "gps_table_name": cached.max_speed_table },
            "max_distance_detail": { "match_id": cached.max_distance_match_id, "gps_table_name": cached.max_distance_table },
            "hsr_max_detail": { "match_id": cached.hsr_max_match_id, "gps_table_name": cached.hsr_max_table },
            "hmld": { "m25_5": cached.hmld_25_5_m.unwrap_or(0.0), "m18": cached.hmld_18_m.unwrap_or(0.0) },
            "hmld_detail": {
                "m25_5": { "match_id": cached.hmld_25_5_match_id, "gps_table_name": cached.hmld_25_5_table },
                "m18": { "match_id": cached.hmld_18_match_id, "gps_table_name": cached.hmld_18_table }
            },
            "z6_detail": { "match_id": cached.z6_match_id, "gps_table_name": cached.z6_table }
        }));
    }

    // Resolve display name for fuzzy matching in GPS tables
    let player_name: Option<String> = match sqlx::query!(
        r#"SELECT COALESCE("Jugador", nombre) AS display FROM administrativo WHERE "Documento_de_Identidad" = $1"#,
        user_id
    )
    .fetch_optional(&pool)
    .await
    {
        Ok(Some(r)) => r.display,
        _ => None,
    };

    if let Some(display_name) = player_name {
        // Find matches where player appeared and have a gps table name
        let rows = sqlx::query!(
            r#"
            SELECT m.match_id, m.gps_table_name
            FROM match_players mp
            JOIN matches m ON m.match_id = mp.match_id
            WHERE mp.player_id = $1 AND m.gps_table_name IS NOT NULL
            "#,
            user_id
        )
        .fetch_all(&pool)
        .await
        .unwrap_or_default();

        for r in rows {
            if let Some(table) = r.gps_table_name {
                let table_ident = table.replace('"', ""); // sanitize quotes
                let view_name = format!("{}_sql_player_gemini_processed_view", table_ident);

                // Fetch match periods for this match
                let periods_row = sqlx::query!(
                    r#"
                    SELECT 
                        COALESCE(manual_first_half_start, detected_first_half_start) AS first_half_start,
                        COALESCE(manual_first_half_end, detected_first_half_end) AS first_half_end,
                        COALESCE(manual_second_half_start, detected_second_half_start) AS second_half_start,
                        COALESCE(manual_second_half_end, detected_second_half_end) AS second_half_end
                    FROM match_periods
                    WHERE match_name = $1
                    "#,
                    table_ident
                ).fetch_optional(&pool).await.ok().flatten();

                // Build period filter conditions for both view and raw queries
                let (period_filter, raw_period_filter) = if let Some(periods) = periods_row {
                    if let (Some(fh_start), Some(fh_end), Some(sh_start), Some(sh_end)) = (
                        periods.first_half_start,
                        periods.first_half_end,
                        periods.second_half_start,
                        periods.second_half_end,
                    ) {
                        let view_filter = format!("AND (t.seconds_since_midnight BETWEEN {} AND {} OR t.seconds_since_midnight BETWEEN {} AND {})", 
                                                 fh_start, fh_end, sh_start, sh_end);
                        let raw_filter = format!("AND (EXTRACT(EPOCH FROM (to_timestamp(t.time,'HH24:MI:SS.MS')::time)) BETWEEN {} AND {} OR EXTRACT(EPOCH FROM (to_timestamp(t.time,'HH24:MI:SS.MS')::time)) BETWEEN {} AND {})", 
                                                fh_start, fh_end, sh_start, sh_end);
                        (view_filter, raw_filter)
                    } else {
                        (String::new(), String::new())
                    }
                } else {
                    (String::new(), String::new())
                };

                let sql_view = format!(
                    "WITH best AS (\n   SELECT player_display_name\n   FROM \"{}\"\n   GROUP BY player_display_name\n   ORDER BY similarity(unaccent(lower(player_display_name)), unaccent(lower($1))) DESC\n   LIMIT 1\n ), top AS (\n   SELECT t.player_display_name, t.time, t.seconds_since_midnight, t.speed\n   FROM \"{}\" t, best b\n   WHERE t.player_display_name = b.player_display_name {}\n   ORDER BY t.speed DESC NULLS LAST\n   LIMIT 1\n )\n SELECT top.player_display_name, top.speed, top.time AS time,\n        (floor(top.seconds_since_midnight/60))::int || ':' || lpad((floor(top.seconds_since_midnight) % 60)::int::text, 2, '0') AS minute_str\n FROM top",
                    view_name, view_name, period_filter
                );

                let mut row_opt = sqlx::query(&sql_view)
                    .bind(&display_name)
                    .fetch_optional(&pool)
                    .await
                    .ok()
                    .flatten();

                if row_opt.is_none() {
                    // Fallback to raw table if the view doesn't exist or query failed
                    let sql_raw = format!(
                        "WITH best AS (\n   SELECT player_display_name\n   FROM \"{}\"\n   GROUP BY player_display_name\n   ORDER BY similarity(unaccent(lower(player_display_name)), unaccent(lower($1))) DESC\n   LIMIT 1\n ), top AS (\n   SELECT t.player_display_name, t.time, t.speed\n   FROM \"{}\" t, best b\n   WHERE t.player_display_name = b.player_display_name {}\n   ORDER BY t.speed DESC NULLS LAST\n   LIMIT 1\n )\n SELECT top.player_display_name, top.speed, top.time AS time,\n        (floor(EXTRACT(EPOCH FROM (to_timestamp(top.time,'HH24:MI:SS.MS')::time)) / 60))::int || ':' || lpad((floor(EXTRACT(EPOCH FROM (to_timestamp(top.time,'HH24:MI:SS.MS')::time)) % 60))::int::text, 2, '0') AS minute_str\n FROM top",
                        table_ident, table_ident, raw_period_filter
                    );
                    row_opt = sqlx::query(&sql_raw)
                        .bind(&display_name)
                        .fetch_optional(&pool)
                        .await
                        .ok()
                        .flatten();
                }

                if let Some(row) = row_opt {
                    let speed: f64 = row.try_get("speed").unwrap_or(0.0);
                    let raw_time: Option<String> = row.try_get::<String, _>("time").ok();
                    let minute_str: Option<String> = row.try_get::<String, _>("minute_str").ok();
                    if speed > 0.0 && speed > max_speed_kmh {
                        max_speed_kmh = speed;
                        max_speed_match_id = Some(r.match_id);
                        max_speed_table = Some(table_ident.clone());
                        max_speed_minute = minute_str;
                        max_speed_time = raw_time;
                    }
                }

                // Compute total distance for this player in this match
                // Try processed view first
                let sql_dist_view = format!(
                    "WITH best AS (\n   SELECT player_display_name\n   FROM \"{}\"\n   GROUP BY player_display_name\n   ORDER BY similarity(unaccent(lower(player_display_name)), unaccent(lower($1))) DESC\n   LIMIT 1\n )\n SELECT SUM(COALESCE(t.distancia_total_calc,0))::double precision AS total_distance\n FROM \"{}\" t, best b\n WHERE t.player_display_name = b.player_display_name {}",
                    view_name, view_name, period_filter
                );
                let mut dist_row_opt = sqlx::query(&sql_dist_view)
                    .bind(&display_name)
                    .fetch_optional(&pool)
                    .await
                    .ok()
                    .flatten();
                if dist_row_opt.is_none() {
                    // Fallback to raw table
                    let sql_dist_raw = format!(
                        "WITH best AS (\n   SELECT player_display_name\n   FROM \"{}\"\n   GROUP BY player_display_name\n   ORDER BY similarity(unaccent(lower(player_display_name)), unaccent(lower($1))) DESC\n   LIMIT 1\n )\n SELECT SUM(COALESCE(t.distancia_total_calc,0))::double precision AS total_distance\n FROM \"{}\" t, best b\n WHERE t.player_display_name = b.player_display_name {}",
                        table_ident, table_ident, raw_period_filter
                    );
                    dist_row_opt = sqlx::query(&sql_dist_raw)
                        .bind(&display_name)
                        .fetch_optional(&pool)
                        .await
                        .ok()
                        .flatten();
                }
                if let Some(drow) = dist_row_opt {
                    let total_distance: f64 = drow.try_get("total_distance").unwrap_or(0.0);
                    if total_distance > max_distance_m_val {
                        max_distance_m_val = total_distance;
                        max_distance_match_id = Some(r.match_id);
                        max_distance_table = Some(table_ident.clone());
                    }
                }

                // Compute HSR (> threshold) total distance for this match
                let sql_hsr_view = format!(
                    "WITH best AS (\n   SELECT player_display_name\n   FROM \"{}\"\n   GROUP BY player_display_name\n   ORDER BY similarity(unaccent(lower(player_display_name)), unaccent(lower($1))) DESC\n   LIMIT 1\n )\n SELECT SUM(CASE WHEN COALESCE(t.speed,0) > {} THEN COALESCE(t.distancia_total_calc,0) ELSE 0 END)::double precision AS hsr_distance\n FROM \"{}\" t, best b\n WHERE t.player_display_name = b.player_display_name {}",
                    view_name, hsr_threshold_kmh, view_name, period_filter
                );
                let mut hsr_row_opt = sqlx::query(&sql_hsr_view)
                    .bind(&display_name)
                    .fetch_optional(&pool)
                    .await
                    .ok()
                    .flatten();
                if hsr_row_opt.is_none() {
                    let sql_hsr_raw = format!(
                        "WITH best AS (\n   SELECT player_display_name\n   FROM \"{}\"\n   GROUP BY player_display_name\n   ORDER BY similarity(unaccent(lower(player_display_name)), unaccent(lower($1))) DESC\n   LIMIT 1\n )\n SELECT SUM(CASE WHEN COALESCE(t.speed,0) > {} THEN COALESCE(t.distancia_total_calc,0) ELSE 0 END)::double precision AS hsr_distance\n FROM \"{}\" t, best b\n WHERE t.player_display_name = b.player_display_name {}",
                        table_ident, hsr_threshold_kmh, table_ident, raw_period_filter
                    );
                    hsr_row_opt = sqlx::query(&sql_hsr_raw)
                        .bind(&display_name)
                        .fetch_optional(&pool)
                        .await
                        .ok()
                        .flatten();
                }
                if let Some(hrow) = hsr_row_opt {
                    let hsr_distance: f64 = hrow.try_get("hsr_distance").unwrap_or(0.0);
                    if hsr_distance > hsr_max_m_val {
                        hsr_max_m_val = hsr_distance;
                        hsr_max_match_id = Some(r.match_id);
                        hsr_max_table = Some(table_ident.clone());
                    }
                }

                // Compute HMLD values (25.5 and 18)
                let sql_hmld_view = format!(
                    "WITH best AS (\n   SELECT player_display_name, player_id\n   FROM \"{}\"\n   GROUP BY player_display_name, player_id\n   ORDER BY similarity(unaccent(lower(player_display_name)), unaccent(lower($1))) DESC\n   LIMIT 1\n ), metabolic AS (\n   SELECT t.player_id, t.player_display_name, t.time, t.speed/3.6 AS speed_ms, t.instantaneous_acceleration,\n     COALESCE( EXTRACT(EPOCH FROM to_timestamp(t.time,'HH24:MI:SS.MS')::time) - EXTRACT(EPOCH FROM LAG(to_timestamp(t.time,'HH24:MI:SS.MS')::time) OVER (PARTITION BY t.player_id ORDER BY to_timestamp(t.time,'HH24:MI:SS.MS')::time)), 0) AS delta_time\n   FROM \"{}\" t, best b\n   WHERE t.player_display_name = b.player_display_name {}\n ), filtered AS (\n   SELECT player_id, player_display_name, speed_ms, instantaneous_acceleration, delta_time, speed_ms * (1 + 0.1 * instantaneous_acceleration) AS metabolic_power\n   FROM metabolic\n   WHERE delta_time > 0 AND delta_time < 0.5\n )\n SELECT\n   COALESCE(SUM(speed_ms * delta_time) FILTER (WHERE metabolic_power > 25.5 AND speed_ms > 5.5), 0)::double precision AS hmld_25_5,\n   COALESCE(SUM(speed_ms * delta_time) FILTER (WHERE metabolic_power > 18 AND speed_ms > 5.5), 0)::double precision AS hmld_18\n FROM filtered",
                    view_name, view_name, period_filter
                );
                let mut hmld_row_opt = sqlx::query(&sql_hmld_view)
                    .bind(&display_name)
                    .fetch_optional(&pool)
                    .await
                    .ok()
                    .flatten();
                if hmld_row_opt.is_none() {
                    let sql_hmld_raw = format!(
                        "WITH best AS (\n   SELECT player_display_name, player_id\n   FROM \"{}\"\n   GROUP BY player_display_name, player_id\n   ORDER BY similarity(unaccent(lower(player_display_name)), unaccent(lower($1))) DESC\n   LIMIT 1\n ), metabolic AS (\n   SELECT t.player_id, t.player_display_name, t.time, t.speed/3.6 AS speed_ms, t.instantaneous_acceleration,\n     COALESCE( EXTRACT(EPOCH FROM to_timestamp(t.time,'HH24:MI:SS.MS')::time) - EXTRACT(EPOCH FROM LAG(to_timestamp(t.time,'HH24:MI:SS.MS')::time) OVER (PARTITION BY t.player_id ORDER BY to_timestamp(t.time,'HH24:MI:SS.MS')::time)), 0) AS delta_time\n   FROM \"{}\" t, best b\n   WHERE t.player_display_name = b.player_display_name {}\n ), filtered AS (\n   SELECT player_id, player_display_name, speed_ms, instantaneous_acceleration, delta_time, speed_ms * (1 + 0.1 * instantaneous_acceleration) AS metabolic_power\n   FROM metabolic\n   WHERE delta_time > 0 AND delta_time < 0.5\n )\n SELECT\n   COALESCE(SUM(speed_ms * delta_time) FILTER (WHERE metabolic_power > 25.5 AND speed_ms > 5.5), 0)::double precision AS hmld_25_5,\n   COALESCE(SUM(speed_ms * delta_time) FILTER (WHERE metabolic_power > 18 AND speed_ms > 5.5), 0)::double precision AS hmld_18\n FROM filtered",
                        table_ident, table_ident, raw_period_filter
                    );
                    hmld_row_opt = sqlx::query(&sql_hmld_raw)
                        .bind(&display_name)
                        .fetch_optional(&pool)
                        .await
                        .ok()
                        .flatten();
                }
                if let Some(hmrow) = hmld_row_opt {
                    let v25: f64 = hmrow.try_get("hmld_25_5").unwrap_or(0.0);
                    let v18: f64 = hmrow.try_get("hmld_18").unwrap_or(0.0);
                    if v25 > hmld_25_5_val {
                        hmld_25_5_val = v25;
                        hmld_25_5_match_id = Some(r.match_id);
                        hmld_25_5_table = Some(table_ident.clone());
                    }
                    if v18 > hmld_18_val {
                        hmld_18_val = v18;
                        hmld_18_match_id = Some(r.match_id);
                        hmld_18_table = Some(table_ident.clone());
                    }
                }

                // Compute Z6: seconds and distance (per second speed max > threshold)
                let sql_z6_view = format!(
                    "WITH best AS (\n   SELECT player_display_name\n   FROM \"{}\"\n   GROUP BY player_display_name\n   ORDER BY similarity(unaccent(lower(player_display_name)), unaccent(lower($1))) DESC\n   LIMIT 1\n ), per_sec AS (\n   SELECT floor(t.seconds_since_midnight)::int AS sec, MAX(COALESCE(t.speed,0)) AS max_speed, SUM(COALESCE(t.distancia_total_calc,0)) AS sum_dist\n   FROM \"{}\" t, best b\n   WHERE t.player_display_name = b.player_display_name {}\n   GROUP BY 1\n )\n SELECT SUM(CASE WHEN max_speed > {} THEN 1 ELSE 0 END)::double precision AS z6_seconds,\n        SUM(CASE WHEN max_speed > {} THEN sum_dist ELSE 0 END)::double precision AS z6_distance\n FROM per_sec",
                    view_name, view_name, period_filter, z6_threshold_kmh, z6_threshold_kmh
                );
                let mut z6_row_opt = sqlx::query(&sql_z6_view)
                    .bind(&display_name)
                    .fetch_optional(&pool)
                    .await
                    .ok()
                    .flatten();
                if z6_row_opt.is_none() {
                    let sql_z6_raw = format!(
                        "WITH best AS (\n   SELECT player_display_name\n   FROM \"{}\"\n   GROUP BY player_display_name\n   ORDER BY similarity(unaccent(lower(player_display_name)), unaccent(lower($1))) DESC\n   LIMIT 1\n ), per_sec AS (\n   SELECT floor(EXTRACT(EPOCH FROM (to_timestamp(t.time,'HH24:MI:SS.MS')::time)))::int AS sec, MAX(COALESCE(t.speed,0)) AS max_speed, SUM(COALESCE(t.distancia_total_calc,0)) AS sum_dist\n   FROM \"{}\" t, best b\n   WHERE t.player_display_name = b.player_display_name {}\n   GROUP BY 1\n )\n SELECT SUM(CASE WHEN max_speed > {} THEN 1 ELSE 0 END)::double precision AS z6_seconds,\n        SUM(CASE WHEN max_speed > {} THEN sum_dist ELSE 0 END)::double precision AS z6_distance\n FROM per_sec",
                        table_ident, table_ident, raw_period_filter, z6_threshold_kmh, z6_threshold_kmh
                    );
                    z6_row_opt = sqlx::query(&sql_z6_raw)
                        .bind(&display_name)
                        .fetch_optional(&pool)
                        .await
                        .ok()
                        .flatten();
                }
                if let Some(zrow) = z6_row_opt {
                    let secs: f64 = zrow.try_get("z6_seconds").unwrap_or(0.0);
                    let dist: f64 = zrow.try_get("z6_distance").unwrap_or(0.0);
                    if secs > z6_seconds_val {
                        z6_seconds_val = secs;
                        z6_distance_val = dist;
                        z6_match_id = Some(r.match_id);
                        z6_table = Some(table_ident.clone());
                    }
                }
            }
        }

        // If we know the table, try to fetch manual_first_half_start from match_periods
        if max_speed_table.is_some() {
            let mp_row = sqlx::query!(
                r#"SELECT manual_first_half_start FROM match_periods WHERE match_name = $1"#,
                max_speed_table.clone().unwrap()
            )
            .fetch_optional(&pool)
            .await
            .ok()
            .flatten();
            if let Some(r) = mp_row {
                manual_first_half_start = r.manual_first_half_start;
            }
        }
    }

    let response = json!({
        "max_distance_m": (max_distance_m_val.round() as i64),
        "hsr_max_m": (hsr_max_m_val.round() as i64),
        "max_speed_kmh": max_speed_kmh,
        "high_metabolic_distance_m": (hmld_25_5_val.round() as i64),
        "z6": { "seconds": (z6_seconds_val.round() as i64), "distance_m": (z6_distance_val.round() as i64) },
        "max_speed_detail": {
            "match_id": max_speed_match_id,
            "gps_table_name": max_speed_table,
            "minute": max_speed_minute,
            "time": max_speed_time,
            "manual_first_half_start": manual_first_half_start
        },
        "max_distance_detail": {
            "match_id": max_distance_match_id,
            "gps_table_name": max_distance_table
        },
        "hsr_max_detail": {
            "match_id": hsr_max_match_id,
            "gps_table_name": hsr_max_table
        },
        "hmld": { "m25_5": hmld_25_5_val, "m18": hmld_18_val },
        "hmld_detail": {
            "m25_5": { "match_id": hmld_25_5_match_id, "gps_table_name": hmld_25_5_table },
            "m18": { "match_id": hmld_18_match_id, "gps_table_name": hmld_18_table }
        },
        "z6_detail": { "match_id": z6_match_id, "gps_table_name": z6_table }
    });

    // Upsert cache asynchronously (ignore errors)
    let _ = sqlx::query!(
        r#"
        INSERT INTO player_metrics_cache (
            player_id,
            max_speed_kmh, max_speed_match_id, max_speed_table,
            max_distance_m, max_distance_match_id, max_distance_table,
            hsr_max_m, hsr_max_match_id, hsr_max_table,
            hmld_25_5_m, hmld_25_5_match_id, hmld_25_5_table,
            hmld_18_m, hmld_18_match_id, hmld_18_table,
            z6_seconds, z6_distance_m, z6_match_id, z6_table,
            updated_at
        ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,NOW()
        )
        ON CONFLICT (player_id) DO UPDATE SET
            max_speed_kmh = EXCLUDED.max_speed_kmh,
            max_speed_match_id = EXCLUDED.max_speed_match_id,
            max_speed_table = EXCLUDED.max_speed_table,
            max_distance_m = EXCLUDED.max_distance_m,
            max_distance_match_id = EXCLUDED.max_distance_match_id,
            max_distance_table = EXCLUDED.max_distance_table,
            hsr_max_m = EXCLUDED.hsr_max_m,
            hsr_max_match_id = EXCLUDED.hsr_max_match_id,
            hsr_max_table = EXCLUDED.hsr_max_table,
            hmld_25_5_m = EXCLUDED.hmld_25_5_m,
            hmld_25_5_match_id = EXCLUDED.hmld_25_5_match_id,
            hmld_25_5_table = EXCLUDED.hmld_25_5_table,
            hmld_18_m = EXCLUDED.hmld_18_m,
            hmld_18_match_id = EXCLUDED.hmld_18_match_id,
            hmld_18_table = EXCLUDED.hmld_18_table,
            z6_seconds = EXCLUDED.z6_seconds,
            z6_distance_m = EXCLUDED.z6_distance_m,
            z6_match_id = EXCLUDED.z6_match_id,
            z6_table = EXCLUDED.z6_table,
            updated_at = NOW()
        "#,
        user_id,
        max_speed_kmh,
        max_speed_match_id,
        max_speed_table,
        max_distance_m_val,
        max_distance_match_id,
        max_distance_table,
        hsr_max_m_val,
        hsr_max_match_id,
        hsr_max_table,
        hmld_25_5_val,
        hmld_25_5_match_id,
        hmld_25_5_table,
        hmld_18_val,
        hmld_18_match_id,
        hmld_18_table,
        z6_seconds_val,
        z6_distance_val,
        z6_match_id,
        z6_table
    )
    .execute(&pool)
    .await;

    Json(response)
}
