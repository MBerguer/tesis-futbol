use axum::extract::Path;
use axum::extract::{Json, RawPathParams};
use serde_json::{json, Value};
use sqlx::Row;

use crate::config::dbconfig::DbConfig;

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
                let sql_view = format!(
                    "WITH best AS (\n   SELECT player_display_name\n   FROM \"{}\"\n   GROUP BY player_display_name\n   ORDER BY similarity(unaccent(lower(player_display_name)), unaccent(lower($1))) DESC\n   LIMIT 1\n ), top AS (\n   SELECT t.player_display_name, t.time, t.seconds_since_midnight, t.speed\n   FROM \"{}\" t, best b\n   WHERE t.player_display_name = b.player_display_name\n   ORDER BY t.speed DESC NULLS LAST\n   LIMIT 1\n )\n SELECT top.player_display_name, top.speed, top.time AS time,\n        (floor(top.seconds_since_midnight/60))::int || ':' || lpad((floor(top.seconds_since_midnight) % 60)::int::text, 2, '0') AS minute_str\n FROM top",
                    view_name, view_name
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
                        "WITH best AS (\n   SELECT player_display_name\n   FROM \"{}\"\n   GROUP BY player_display_name\n   ORDER BY similarity(unaccent(lower(player_display_name)), unaccent(lower($1))) DESC\n   LIMIT 1\n ), top AS (\n   SELECT t.player_display_name, t.time, t.speed\n   FROM \"{}\" t, best b\n   WHERE t.player_display_name = b.player_display_name\n   ORDER BY t.speed DESC NULLS LAST\n   LIMIT 1\n )\n SELECT top.player_display_name, top.speed, top.time AS time,\n        (floor(EXTRACT(EPOCH FROM (to_timestamp(top.time,'HH24:MI:SS.MS')::time)) / 60))::int || ':' || lpad((floor(EXTRACT(EPOCH FROM (to_timestamp(top.time,'HH24:MI:SS.MS')::time)) % 60))::int::text, 2, '0') AS minute_str\n FROM top",
                        table_ident, table_ident
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
                    let raw_time: Option<String> = row.try_get::<String,_>("time").ok();
                    let minute_str: Option<String> = row.try_get::<String,_>("minute_str").ok();
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
                    "WITH best AS (\n   SELECT player_display_name\n   FROM \"{}\"\n   GROUP BY player_display_name\n   ORDER BY similarity(unaccent(lower(player_display_name)), unaccent(lower($1))) DESC\n   LIMIT 1\n )\n SELECT SUM(COALESCE(t.distancia_total_calc,0))::double precision AS total_distance\n FROM \"{}\" t, best b\n WHERE t.player_display_name = b.player_display_name",
                    view_name, view_name
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
                        "WITH best AS (\n   SELECT player_display_name\n   FROM \"{}\"\n   GROUP BY player_display_name\n   ORDER BY similarity(unaccent(lower(player_display_name)), unaccent(lower($1))) DESC\n   LIMIT 1\n )\n SELECT SUM(COALESCE(t.distancia_total_calc,0))::double precision AS total_distance\n FROM \"{}\" t, best b\n WHERE t.player_display_name = b.player_display_name",
                        table_ident, table_ident
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
                    "WITH best AS (\n   SELECT player_display_name\n   FROM \"{}\"\n   GROUP BY player_display_name\n   ORDER BY similarity(unaccent(lower(player_display_name)), unaccent(lower($1))) DESC\n   LIMIT 1\n )\n SELECT SUM(CASE WHEN COALESCE(t.speed,0) > {} THEN COALESCE(t.distancia_total_calc,0) ELSE 0 END)::double precision AS hsr_distance\n FROM \"{}\" t, best b\n WHERE t.player_display_name = b.player_display_name",
                    view_name, hsr_threshold_kmh, view_name
                );
                let mut hsr_row_opt = sqlx::query(&sql_hsr_view)
                    .bind(&display_name)
                    .fetch_optional(&pool)
                    .await
                    .ok()
                    .flatten();
                if hsr_row_opt.is_none() {
                    let sql_hsr_raw = format!(
                        "WITH best AS (\n   SELECT player_display_name\n   FROM \"{}\"\n   GROUP BY player_display_name\n   ORDER BY similarity(unaccent(lower(player_display_name)), unaccent(lower($1))) DESC\n   LIMIT 1\n )\n SELECT SUM(CASE WHEN COALESCE(t.speed,0) > {} THEN COALESCE(t.distancia_total_calc,0) ELSE 0 END)::double precision AS hsr_distance\n FROM \"{}\" t, best b\n WHERE t.player_display_name = b.player_display_name",
                        table_ident, hsr_threshold_kmh, table_ident
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
                    "WITH best AS (\n   SELECT player_display_name, player_id\n   FROM \"{}\"\n   GROUP BY player_display_name, player_id\n   ORDER BY similarity(unaccent(lower(player_display_name)), unaccent(lower($1))) DESC\n   LIMIT 1\n ), metabolic AS (\n   SELECT t.player_id, t.player_display_name, t.time, t.speed/3.6 AS speed_ms, t.instantaneous_acceleration,\n     COALESCE( EXTRACT(EPOCH FROM to_timestamp(t.time,'HH24:MI:SS.MS')::time) - EXTRACT(EPOCH FROM LAG(to_timestamp(t.time,'HH24:MI:SS.MS')::time) OVER (PARTITION BY t.player_id ORDER BY to_timestamp(t.time,'HH24:MI:SS.MS')::time)), 0) AS delta_time\n   FROM \"{}\" t, best b\n   WHERE t.player_display_name = b.player_display_name\n ), filtered AS (\n   SELECT player_id, player_display_name, speed_ms, instantaneous_acceleration, delta_time, speed_ms * (1 + 0.1 * instantaneous_acceleration) AS metabolic_power\n   FROM metabolic\n   WHERE delta_time > 0 AND delta_time < 0.5\n )\n SELECT\n   COALESCE(SUM(speed_ms * delta_time) FILTER (WHERE metabolic_power > 25.5 AND speed_ms > 5.5), 0)::double precision AS hmld_25_5,\n   COALESCE(SUM(speed_ms * delta_time) FILTER (WHERE metabolic_power > 18 AND speed_ms > 5.5), 0)::double precision AS hmld_18\n FROM filtered",
                    view_name, view_name
                );
                let mut hmld_row_opt = sqlx::query(&sql_hmld_view)
                    .bind(&display_name)
                    .fetch_optional(&pool)
                    .await
                    .ok()
                    .flatten();
                if hmld_row_opt.is_none() {
                    let sql_hmld_raw = format!(
                        "WITH best AS (\n   SELECT player_display_name, player_id\n   FROM \"{}\"\n   GROUP BY player_display_name, player_id\n   ORDER BY similarity(unaccent(lower(player_display_name)), unaccent(lower($1))) DESC\n   LIMIT 1\n ), metabolic AS (\n   SELECT t.player_id, t.player_display_name, t.time, t.speed/3.6 AS speed_ms, t.instantaneous_acceleration,\n     COALESCE( EXTRACT(EPOCH FROM to_timestamp(t.time,'HH24:MI:SS.MS')::time) - EXTRACT(EPOCH FROM LAG(to_timestamp(t.time,'HH24:MI:SS.MS')::time) OVER (PARTITION BY t.player_id ORDER BY to_timestamp(t.time,'HH24:MI:SS.MS')::time)), 0) AS delta_time\n   FROM \"{}\" t, best b\n   WHERE t.player_display_name = b.player_display_name\n ), filtered AS (\n   SELECT player_id, player_display_name, speed_ms, instantaneous_acceleration, delta_time, speed_ms * (1 + 0.1 * instantaneous_acceleration) AS metabolic_power\n   FROM metabolic\n   WHERE delta_time > 0 AND delta_time < 0.5\n )\n SELECT\n   COALESCE(SUM(speed_ms * delta_time) FILTER (WHERE metabolic_power > 25.5 AND speed_ms > 5.5), 0)::double precision AS hmld_25_5,\n   COALESCE(SUM(speed_ms * delta_time) FILTER (WHERE metabolic_power > 18 AND speed_ms > 5.5), 0)::double precision AS hmld_18\n FROM filtered",
                        table_ident, table_ident
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
                    "WITH best AS (\n   SELECT player_display_name\n   FROM \"{}\"\n   GROUP BY player_display_name\n   ORDER BY similarity(unaccent(lower(player_display_name)), unaccent(lower($1))) DESC\n   LIMIT 1\n ), per_sec AS (\n   SELECT floor(t.seconds_since_midnight)::int AS sec, MAX(COALESCE(t.speed,0)) AS max_speed, SUM(COALESCE(t.distancia_total_calc,0)) AS sum_dist\n   FROM \"{}\" t, best b\n   WHERE t.player_display_name = b.player_display_name\n   GROUP BY 1\n )\n SELECT SUM(CASE WHEN max_speed > {} THEN 1 ELSE 0 END)::double precision AS z6_seconds,\n        SUM(CASE WHEN max_speed > {} THEN sum_dist ELSE 0 END)::double precision AS z6_distance\n FROM per_sec",
                    view_name, view_name, z6_threshold_kmh, z6_threshold_kmh
                );
                let mut z6_row_opt = sqlx::query(&sql_z6_view)
                    .bind(&display_name)
                    .fetch_optional(&pool)
                    .await
                    .ok()
                    .flatten();
                if z6_row_opt.is_none() {
                    let sql_z6_raw = format!(
                        "WITH best AS (\n   SELECT player_display_name\n   FROM \"{}\"\n   GROUP BY player_display_name\n   ORDER BY similarity(unaccent(lower(player_display_name)), unaccent(lower($1))) DESC\n   LIMIT 1\n ), per_sec AS (\n   SELECT floor(EXTRACT(EPOCH FROM (to_timestamp(t.time,'HH24:MI:SS.MS')::time)))::int AS sec, MAX(COALESCE(t.speed,0)) AS max_speed, SUM(COALESCE(t.distancia_total_calc,0)) AS sum_dist\n   FROM \"{}\" t, best b\n   WHERE t.player_display_name = b.player_display_name\n   GROUP BY 1\n )\n SELECT SUM(CASE WHEN max_speed > {} THEN 1 ELSE 0 END)::double precision AS z6_seconds,\n        SUM(CASE WHEN max_speed > {} THEN sum_dist ELSE 0 END)::double precision AS z6_distance\n FROM per_sec",
                        table_ident, table_ident, z6_threshold_kmh, z6_threshold_kmh
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
            ).fetch_optional(&pool).await.ok().flatten();
            if let Some(r) = mp_row { manual_first_half_start = r.manual_first_half_start; }
        }
    }

    Json(json!({
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
    }))
}
