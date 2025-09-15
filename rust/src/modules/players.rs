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
    let mut max_speed_match_id: Option<uuid::Uuid> = None;
    let mut max_speed_table: Option<String> = None;
    let mut max_speed_second: Option<f64> = None;
    let mut max_speed_time: Option<String> = None; // raw time from table

    // Other placeholders to keep previous response stable
    let max_distance_m: i64 = 4013;
    let hsr_max_m: i64 = 1653;
    let high_metabolic_distance_m: i64 = 550;
    let z6_seconds: i64 = 15;
    let z6_distance_m: i64 = 229;

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
                let sql = format!(
                    "WITH best AS (\n   SELECT player_display_name\n   FROM \"{}\"\n   GROUP BY player_display_name\n   ORDER BY similarity(unaccent(lower(player_display_name)), unaccent(lower($1))) DESC\n   LIMIT 1\n ), base AS (\n   SELECT MIN(time) AS min_time FROM \"{}\" t, best b WHERE t.player_display_name = b.player_display_name\n ), top AS (\n   SELECT t.player_display_name, t.time, t.speed\n   FROM \"{}\" t, best b\n   WHERE t.player_display_name = b.player_display_name\n   ORDER BY t.speed DESC NULLS LAST\n   LIMIT 1\n )\n SELECT top.player_display_name, top.speed, top.time AS time,\n        EXTRACT(EPOCH FROM (to_timestamp(top.time,'HH24:MI:SS.MS') - to_timestamp(base.min_time,'HH24:MI:SS.MS'))) AS sec\n FROM top, base",
                    table_ident, table_ident, table_ident
                );
                if let Ok(row) = sqlx::query(&sql)
                    .bind(&display_name)
                    .fetch_one(&pool)
                    .await
                {
                    let speed: f64 = row.try_get("speed").unwrap_or(0.0);
                    let sec: f64 = row.try_get("sec").unwrap_or(0.0);
                    let raw_time: Option<String> = row.try_get::<String,_>("time").ok();
                    if speed > 0.0 && speed > max_speed_kmh {
                        max_speed_kmh = speed;
                        max_speed_second = Some(sec);
                        max_speed_match_id = Some(r.match_id);
                        max_speed_table = Some(table_ident);
                        max_speed_time = raw_time;
                    }
                }
            }
        }
    }

    Json(json!({
        "max_distance_m": max_distance_m,
        "hsr_max_m": hsr_max_m,
        "max_speed_kmh": max_speed_kmh,
        "high_metabolic_distance_m": high_metabolic_distance_m,
        "z6": { "seconds": z6_seconds, "distance_m": z6_distance_m },
        "max_speed_detail": {
            "match_id": max_speed_match_id,
            "gps_table_name": max_speed_table,
            "second": max_speed_second,
            "time": max_speed_time
        }
    }))
}
