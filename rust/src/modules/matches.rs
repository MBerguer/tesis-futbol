use axum::extract::Json;
use axum::extract::Path;
use axum::extract::State;
use chrono::NaiveDateTime;
use serde::Deserialize;
use serde_json::{json, Value};
use sqlx::Column;
use sqlx::PgPool;
use sqlx::Row;
use std::collections::{HashMap, HashSet};

// Constantes para umbrales de velocidad (en km/h)
const HSR_THRESHOLD_KMH: f64 = 19.8; // High Speed Running: 19.8 km/h
const SPRINT_THRESHOLD_KMH: f64 = 25.2; // Sprint: 25.2 km/h

pub async fn get_match_details() -> Json<Value> {
    Json(json!({
        "match_id": "1234",
        "date": "2021-10-10",
        "time": "20:00",
        "location": "Estadio Centenario",
        "home_team": "Nacional",
        "away_team": "Peñarol",
        "status": "active"
    }))
}

#[allow(dead_code)]
pub async fn get_match_players_by_id() -> Json<Value> {
    Json(json!({
        "match_id": "1234",
        "players": [
            {
                "player_id": "1234",
                "team": "Nacional",
                "position": "goalkeeper",
                "status": "active"
            },
            {
                "player_id": "1235",
                "team": "Nacional",
                "position": "defender",
                "status": "active"
            },
            {
                "player_id": "1236",
                "team": "Nacional",
                "position": "midfielder",
                "status": "active"
            },
            {
                "player_id": "1237",
                "team": "Nacional",
                "position": "forward",
                "status": "active"
            }
        ]
    }))
}

pub async fn get_match_gps_players_details() -> Json<Value> {
    Json(json!({
        "match_id": "1234",
        "players": [
            {
                "player_id": "1234",
                "team": "Nacional",
                "position": "goalkeeper",
                "status": "active",
                "gps": {
                    "latitude": "1234",
                    "longitude": "1234"
                }
            },
            {
                "player_id": "1235",
                "team": "Nacional",
                "position": "defender",
                "status": "active",
                "gps": {
                    "latitude": "1234",
                    "longitude": "1234"
                }
            },
            {
                "player_id": "1236",
                "team": "Nacional",
                "position": "midfielder",
                "status": "active",
                "gps": {
                    "latitude": "1234",
                    "longitude": "1234"
                }
            },
            {
                "player_id": "1237",
                "team": "Nacional",
                "position": "forward",
                "status": "active",
                "gps": {
                    "latitude": "1234",
                    "longitude": "1234"
                }
            }
        ]
    }))
}

/// Resolve the raw GPS table name for a given stored match id
/// GET /match/by-id/:match_id/table
pub async fn resolve_table_for_match(
    State(pool): State<PgPool>,
    Path(match_id): Path<uuid::Uuid>,
) -> Json<Value> {
    // Strategy: if we have a mapping table (e.g., matches_gps_tables) use it; otherwise try to infer
    // For now, infer by joining teams to build a fingerprint and find a table with that opponent short name in its name.
    // Simple placeholder: look up away_team_name and try to match public tables that include it
    let row = match sqlx::query!(
        r#"
        SELECT ta.name AS away_team_name, th.name AS home_team_name, m.match_date
        FROM matches m
        JOIN teams th ON th.team_id = m.home_team_id
        JOIN teams ta ON ta.team_id = m.away_team_id
        WHERE m.match_id = $1
        "#,
        match_id
    ).fetch_one(&pool).await {
        Ok(r) => r,
        Err(e) => return Json(json!({"error": format!("match not found: {}", e)})),
    };

    // list public tables and try fuzzy match with away team name (normalized)
    let tables = match sqlx::query!(
        r#"
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name NOT LIKE '%_view'
        "#
    ).fetch_all(&pool).await {
        Ok(v) => v,
        Err(e) => return Json(json!({"error": format!("cannot list tables: {}", e)})),
    };

    let norm = |s: &str| s.chars()
        .filter(|c| c.is_alphanumeric() || *c=='_' || *c=='-')
        .collect::<String>()
        .to_lowercase();

    let away = norm(row.away_team_name.as_str());
    let home = norm(row.home_team_name.as_str());

    let mut found: Option<String> = None;
    for t in tables.into_iter().filter_map(|r| r.table_name) {
        let tn = norm(&t);
        if tn.contains(&away) || tn.contains(&home) || away.contains(&tn) || home.contains(&tn) {
            found = Some(t);
            break;
        }
    }

    if let Some(table_name) = found {
        Json(json!({"table": table_name}))
    } else {
        Json(json!({"table": null, "error": "no matching table found"}))
    }
}

/// GET /match/table/:table_name/positions/window?center_sec=123&radius_sec=15
/// Returns per-second positions in a rolling window around a GPS time
/// Uses seconds_since_midnight when available; otherwise derives from time
pub async fn get_positions_window(
    State(pool): State<PgPool>,
    Path(table_name): Path<String>,
    axum::extract::Query(params): axum::extract::Query<std::collections::HashMap<String, String>>,
 ) -> Json<Value> {
    let center_sec: i64 = params.get("center_sec").and_then(|s| s.parse::<i64>().ok()).unwrap_or(0);
    let radius_sec: i64 = params.get("radius_sec").and_then(|s| s.parse::<i64>().ok()).unwrap_or(15);

    let (sql, bind_center_low, bind_center_high) = (
        format!(
            "SELECT t.player_display_name,
                    (t.seconds_since_midnight)::double precision AS sec,
                    t.lat, t.lon, t.speed
             FROM \"{}_sql_player_gemini_processed_view\" t
             WHERE (t.seconds_since_midnight)::double precision BETWEEN $1 AND $2
             ORDER BY sec",
            table_name
        ),
        center_sec - radius_sec,
        center_sec + radius_sec,
    );
    

    // logging removed

    let rows = match sqlx::query(&sql)
        .bind(bind_center_low)
        .bind(bind_center_high)
        .fetch_all(&pool)
        .await
    {
        Ok(r) => r,
        Err(e) => return Json(json!({"error": format!("db error: {}", e)})),
    };

    // logging removed

    let data: Vec<Value> = rows
        .into_iter()
        .map(|r| {
            let sec_f = r.try_get::<f64,_>("sec").unwrap_or(0.0);
            json!({
                "player_display_name": r.try_get::<String,_>("player_display_name").unwrap_or_default(),
                "sec": sec_f,
                "lat": r.try_get::<f64,_>("lat").unwrap_or(0.0),
                "lon": r.try_get::<f64,_>("lon").unwrap_or(0.0),
                "speed": r.try_get::<f64,_>("speed").unwrap_or(0.0),
            })
        })
        .collect();

    Json(json!({"positions": data, "center_sec": center_sec, "radius_sec": radius_sec}))
 }

/// Detalle de períodos detectados replicando exactamente la lógica del notebook
/// Endpoint: GET /match/table/:table_name/periods/detect-notebook
///
/// Pasos (idénticos al notebook):
/// - centralizar tiempo por jugador y luego contra el mínimo global
/// - construir `Second = floor(seconds_since_midnight)`
/// - calcular `second_avg_speed` aplicando:
///   * mínimo de jugadores por segundo (2 en el md efectivo)
///   * rellenar huecos con velocidad 0
/// - detectar entretiempo por runs consecutivos de `speed <= 11` con ventana 900s y reducción de 10s
///   * excluir el primer grupo (inicio)
///   * limitar a 900s y refinar fin con primer `speed > 11` posterior
/// - detectar inicio PT: último run de `speed > 5.9` de 20s antes de halftime_start
/// - detectar inicio ST: run `speed > 11` de 10s tras halftime_end
/// - detectar fin ST: tras 45min, primer run `speed <= 5.9` de 20s
pub async fn detect_match_periods_notebook(
    State(pool): State<PgPool>,
    Path(table_name): Path<String>,
) -> Json<Value> {
    // 0) Cache: if we already have detected values for this match, return them (fast path)
    let cached = sqlx::query(
        r#"
        SELECT 
            detected_first_half_start,
            detected_first_half_end,
            detected_second_half_start,
            detected_second_half_end,
            detected_halftime_start,
            detected_halftime_end,
            manual_first_half_start,
            manual_first_half_end,
            manual_second_half_start,
            manual_second_half_end,
            manual_halftime_start,
            manual_halftime_end
        FROM match_periods
        WHERE match_name = $1
        "#,
    )
    .bind(&table_name)
    .fetch_optional(&pool)
    .await
    .ok()
    .flatten();

    if let Some(_row) = &cached {
        println!("Found cached periods for match {}", table_name);
    } else {
        println!("No cached periods found for match {}", table_name); 
    }

    if let Some(row) = cached {
        let det_fh_start: i32 = row.try_get("detected_first_half_start").unwrap_or(0);
        let det_fh_end: i32 = row.try_get("detected_first_half_end").unwrap_or(0);
        let det_sh_start: i32 = row.try_get("detected_second_half_start").unwrap_or(0);
        let det_sh_end: i32 = row.try_get("detected_second_half_end").unwrap_or(0);
        let det_ht_start: i32 = row.try_get("detected_halftime_start").unwrap_or(0);
        let det_ht_end: i32 = row.try_get("detected_halftime_end").unwrap_or(0);

        let man_fh_start: Option<i32> = row.try_get("manual_first_half_start").ok();
        let man_fh_end: Option<i32> = row.try_get("manual_first_half_end").ok();
        let man_sh_start: Option<i32> = row.try_get("manual_second_half_start").ok();
        let man_sh_end: Option<i32> = row.try_get("manual_second_half_end").ok();
        let man_ht_start: Option<i32> = row.try_get("manual_halftime_start").ok();
        let man_ht_end: Option<i32> = row.try_get("manual_halftime_end").ok();

        let using_manual = man_fh_start.is_some() || man_fh_end.is_some() || man_sh_start.is_some() || man_sh_end.is_some() || man_ht_start.is_some() || man_ht_end.is_some();

        let fh_start = man_fh_start.unwrap_or(det_fh_start);
        let fh_end = man_fh_end.unwrap_or(det_fh_end);
        let sh_start = man_sh_start.unwrap_or(det_sh_start);
        let sh_end = man_sh_end.unwrap_or(det_sh_end);
        let ht_start = man_ht_start.unwrap_or(det_ht_start);
        let ht_end = man_ht_end.unwrap_or(det_ht_end);

        if fh_start > 0 && fh_end > 0 && sh_start > 0 && sh_end > 0 && ht_start > 0 && ht_end > 0 {
            // compute base time cheaply
            let base_time_query = format!("SELECT MIN(time) AS min_time FROM \"{}\"", table_name);
            let base_row = sqlx::query(&base_time_query).fetch_one(&pool).await.ok();
            let base_time: String = base_row
                .and_then(|r| r.try_get::<String, _>("min_time").ok())
                .unwrap_or_default();
            return Json(json!({
                "match_name": table_name,
                "detected_first_half_start": fh_start,
                "detected_first_half_end": fh_end,
                "detected_halftime_start": ht_start,
                "detected_halftime_end": ht_end,
                "detected_second_half_start": sh_start,
                "detected_second_half_end": sh_end,
                "using_manual": using_manual,
                "base_time": base_time,
                "kickoff_spike_sec": Value::Null,
                "thresholds": {"match": 5.9_f64, "halftime": 11.0_f64, "kickoff": 20.0_f64}
            }));
        }
    }
    // cargar tabla completa ordenada por time
    let query = format!("SELECT player_display_name, time, speed FROM \"{}\" ORDER BY time", table_name);
    let rows = match sqlx::query(&query).fetch_all(&pool).await {
        Ok(r) => r,
        Err(e) => return Json(json!({"error": format!("db read error: {}", e)})),
    };
    if rows.is_empty() {
        return Json(json!({"error": "no data"}));
    }

    // construir vector dinámico tipo notebook
    let mut data: Vec<serde_json::Map<String, Value>> = Vec::with_capacity(rows.len());
    for row in rows {
        let mut m = serde_json::Map::new();
        if let Ok(v) = row.try_get::<String, _>("player_display_name") { m.insert("player_display_name".into(), Value::from(v)); }
        if let Ok(v) = row.try_get::<String, _>("time") { m.insert("time".into(), Value::from(v)); }
        if let Ok(v) = row.try_get::<f64, _>("speed") { m.insert("speed".into(), Value::from(v)); }
        data.push(m);
    }

    // seconds since midnight from device time (replace centralized idea)
    for r in data.iter_mut() {
        if let Some(t) = r.get("time").and_then(|v| v.as_str()) {
            // parse HH:MM:SS(.MS) to seconds
            let parts: Vec<&str> = t.split(':').collect();
            let h = parts.get(0).and_then(|s| s.parse::<f64>().ok()).unwrap_or(0.0);
            let m = parts.get(1).and_then(|s| s.parse::<f64>().ok()).unwrap_or(0.0);
            let s = parts.get(2).and_then(|s| s.parse::<f64>().ok()).unwrap_or(0.0);
            let secs = h * 3600.0 + m * 60.0 + s;
            r.insert("seconds_since_midnight".into(), Value::from(secs));
        }
    }

    // parámetros notebook
    let velocidad_partido = 5.9_f64;
    let velocidad_partido_entretiempo = 11.0_f64;
    let ventana_primer_tiempo: i64 = 20; // PT: 20s
    let ventana_segundo_tiempo: i64 = 6;  // ST: >5s en notebook => 6s
    let duracion_segundo_tiempo: i64 = 45 * 60;

    // construir Second y promedios por segundo (mín 2 jugadores y relleno de huecos)
    let mut second_to_speeds: HashMap<i64, Vec<f64>> = HashMap::new();
    let mut second_to_players: HashMap<i64, HashSet<String>> = HashMap::new();
    for r in &data {
        if let (Some(sec), Some(speed), Some(player)) = (
            r.get("seconds_since_midnight").and_then(|v| v.as_f64()).map(|s| s.floor() as i64),
            r.get("speed").and_then(|v| v.as_f64()),
            r.get("player_display_name").and_then(|v| v.as_str()),
        ) {
            second_to_speeds.entry(sec).or_default().push(speed);
            second_to_players.entry(sec).or_default().insert(player.to_string());
        }
    }
    let max_second = *second_to_speeds.keys().max().unwrap_or(&0);
    let mut second_avg_speed: Vec<(i64, f64)> = Vec::with_capacity((max_second + 1) as usize);
    for sec in 0..=max_second {
        let num_players = second_to_players.get(&sec).map(|s| s.len()).unwrap_or(0);
        if num_players >= 2 {
            let empty: Vec<f64> = Vec::new();
            let speeds = second_to_speeds.get(&sec).unwrap_or(&empty);
            let avg = if speeds.is_empty() { 0.0 } else { speeds.iter().sum::<f64>() / speeds.len() as f64 };
            second_avg_speed.push((sec, avg));
        } else {
            second_avg_speed.push((sec, 0.0));
        }
    }

    // runs de baja velocidad para entretiempo
    let mut runs: Vec<Vec<i64>> = Vec::new();
    let mut run: Vec<i64> = Vec::new();
    for (sec, sp) in &second_avg_speed {
        if *sp <= velocidad_partido_entretiempo { run.push(*sec); }
        else { if !run.is_empty() { runs.push(run.clone()); run.clear(); } }
    }
    if !run.is_empty() { runs.push(run); }

    let mut current_window = 900_i64;
    let maximum_halftime_end = max_second - duracion_segundo_tiempo;
    let mut halftime_blocks: Vec<Vec<i64>>;
    loop {
        halftime_blocks = runs
            .iter()
            .filter(|b| b.len() as i64 >= current_window)
            .filter(|b| !b.is_empty() && b[0] > 60)
            .filter(|b| *b.last().unwrap_or(&0) <= maximum_halftime_end)
            .cloned()
            .collect();
        if !halftime_blocks.is_empty() || current_window <= 0 { break; }
        current_window -= 10;
    }
    let halftime_block = halftime_blocks.into_iter().next().unwrap_or_default();
    let (halftime_start, mut halftime_end) = if halftime_block.is_empty() { (0, 0) } else { (halftime_block[0], *halftime_block.last().unwrap()) };
    if halftime_start > 0 {
        let max_halftime_end = halftime_start + 900;
        if halftime_end > max_halftime_end { halftime_end = max_halftime_end; }
        if let Some((refined_end, _)) = second_avg_speed.iter().filter(|(s, _)| *s > halftime_end).find(|(_, sp)| *sp > velocidad_partido_entretiempo) { halftime_end = *refined_end; }
    }

    // inicio PT: PRIMER run > 5.9 de 20s (ignorando los primeros 60s)
    let mut acc: i64 = 0;
    let mut first_half_start = 0;
    for (sec, sp) in second_avg_speed.iter().filter(|(s, _)| *s > 60).filter(|(s, _)| *s <= halftime_start) {
        if *sp > velocidad_partido { acc += 1; } else { acc = 0; }
        if acc >= ventana_primer_tiempo { first_half_start = *sec - ventana_primer_tiempo + 1; break; }
    }
    let first_half_end = halftime_start;

    // Post-corrección del inicio PT: si la duración < 45', buscar "kickoff surge" (>20 km/h)
    // y reajustar al primer run >5.9 por 20s posterior a ese pico; si no hay, forzar 45'
    let desired_first_half_secs: i64 = 45 * 60;
    let mut kickoff_spike_sec: Option<i64> = None;
    if first_half_start > 0 && (first_half_end - first_half_start) < desired_first_half_secs {
        let kickoff_spike_kmh: f64 = 20.0;
        // Buscar el primer segundo con pico >= 20 km/h antes del HT
        for (sec, sp) in second_avg_speed.iter().filter(|(s, _)| *s <= first_half_end) {
            if *sp >= kickoff_spike_kmh { kickoff_spike_sec = Some(*sec); break; }
        }
        if let Some(s0) = kickoff_spike_sec {
            // Desde el pico, buscar el primer run >5.9 de 20s
            let mut acc2: i64 = 0;
            let mut adjusted: Option<i64> = None;
            for (sec, sp) in second_avg_speed.iter().filter(|(s, _)| *s >= s0).filter(|(s, _)| *s <= first_half_end) {
                if *sp > velocidad_partido { acc2 += 1; } else { acc2 = 0; }
                if acc2 >= ventana_primer_tiempo {
                    let candidate = *sec - ventana_primer_tiempo + 1;
                    // Aceptar sólo si resultará en al menos 45'
                    if (first_half_end - candidate) >= desired_first_half_secs { adjusted = Some(candidate); break; }
                }
            }
            if let Some(start_ok) = adjusted { first_half_start = start_ok; }
        }
        // Si aún no alcanza, forzar mínimo 45'
        if (first_half_end - first_half_start) < desired_first_half_secs {
            first_half_start = (first_half_end - desired_first_half_secs).max(0);
        }
    }

    // inicio ST: run > 11 por 10s
    acc = 0;
    let mut second_half_start = halftime_end;
    for (sec, sp) in second_avg_speed.iter().filter(|(s, _)| *s > halftime_end) {
        if *sp > velocidad_partido_entretiempo { acc += 1; } else { acc = 0; }
        if acc >= ventana_segundo_tiempo { second_half_start = *sec - ventana_segundo_tiempo + 1; break; }
    }

    // fin ST: a partir de 45min, caída sostenida <= 5.9 por 20s
    let mut second_half_end = second_half_start + duracion_segundo_tiempo;
    acc = 0;
    for (sec, sp) in second_avg_speed.iter().filter(|(s, _)| *s >= second_half_end) {
        if *sp <= velocidad_partido { acc += 1; } else { acc = 0; }
        if acc >= 20 { second_half_end = *sec; break; }
    }

    // 8) Persist results to cache table (UPSERT)
    let _ = sqlx::query(
        r#"
        INSERT INTO match_periods (
            match_name,
            detected_first_half_start,
            detected_first_half_end,
            detected_second_half_start,
            detected_second_half_end,
            detected_halftime_start,
            detected_halftime_end
        ) VALUES ($1,$2,$3,$4,$5,$6,$7)
        ON CONFLICT (match_name) DO UPDATE SET
            detected_first_half_start = EXCLUDED.detected_first_half_start,
            detected_first_half_end   = EXCLUDED.detected_first_half_end,
            detected_second_half_start= EXCLUDED.detected_second_half_start,
            detected_second_half_end  = EXCLUDED.detected_second_half_end,
            detected_halftime_start   = EXCLUDED.detected_halftime_start,
            detected_halftime_end     = EXCLUDED.detected_halftime_end,
            updated_at = NOW()
        "#,
    )
    .bind(&table_name)
    .bind(first_half_start as i32)
    .bind(first_half_end as i32)
    .bind(second_half_start as i32)
    .bind(second_half_end as i32)
    .bind(halftime_start as i32)
    .bind(halftime_end as i32)
    .execute(&pool)
    .await;

    // compute base time from the underlying table/view
    let base_time_query = format!("SELECT MIN(time) AS min_time FROM \"{}\"", table_name);
    let base_row = sqlx::query(&base_time_query).fetch_one(&pool).await.ok();
    let base_time: String = base_row
        .and_then(|r| r.try_get::<String, _>("min_time").ok())
        .unwrap_or_default();

    Json(json!({
        "match_name": table_name,
        "detected_first_half_start": first_half_start,
        "detected_first_half_end": first_half_end,
        "detected_halftime_start": halftime_start,
        "detected_halftime_end": halftime_end,
        "detected_second_half_start": second_half_start,
        "detected_second_half_end": second_half_end,
        "using_manual": false, // should be false, since we just detected them, and there is no possible way are not using manual periods
        "base_time": base_time,
        "kickoff_spike_sec": kickoff_spike_sec,
        "thresholds": {"match": velocidad_partido, "halftime": velocidad_partido_entretiempo, "kickoff": 20.0}
    }))
}
pub async fn submit_match_players() {}

pub async fn list_match_tables(State(pool): State<PgPool>) -> Json<Value> {
    let tables = sqlx::query!(
        r#"
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name NOT LIKE '%_view'
        ORDER BY table_name DESC
        "#
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    let table_names: Vec<String> = tables
        .into_iter()
        .filter_map(|row| row.table_name)
        .collect();

    Json(json!({
        "tables": table_names
    }))
}

pub async fn get_match_players(
    State(pool): State<PgPool>,
    Path(table_name): Path<String>,
) -> Json<Value> {
    let query = format!(
        r#"
        SELECT DISTINCT player_display_name 
        FROM "{}"
        ORDER BY player_display_name
        "#,
        table_name
    );

    let players = sqlx::query(&query)
        .fetch_all(&pool)
        .await
        .unwrap_or_default();

    let player_names: Vec<String> = players
        .into_iter()
        .filter_map(|row| row.try_get("player_display_name").ok())
        .collect();

    Json(json!({
        "players": player_names
    }))
}

pub async fn get_match_entries_seconds_since_midnight(
    State(pool): State<PgPool>,
    Path(table_name): Path<String>,
) -> Json<Value> {
    // First, get the first timestamp for each player
    let first_timestamps_query = format!(
        r#"
        WITH first_timestamps AS (
            SELECT 
                player_display_name,
                MIN(time) as first_time
            FROM "{}"
            GROUP BY player_display_name
        )
        SELECT 
            player_display_name,
            first_time
        FROM first_timestamps
        ORDER BY first_time
        "#,
        table_name
    );

    println!("{}", first_timestamps_query);

    let first_timestamps = sqlx::query(&first_timestamps_query)
        .fetch_all(&pool)
        .await
        .unwrap_or_default();

    // debug the first_timestamps
    // for row in &first_timestamps {
    //     println!("row:");
    //     if let Ok(name) = row.try_get::<String, _>("player_display_name") {
    //         if let Ok(time) = row.try_get::<String, _>("first_time") {
    //             println!("Player: {}, First time: {}", name, time);
    //         }
    //     }
    // }

    // Get the earliest timestamp among all players
    let earliest_timestamp: Option<NaiveDateTime> = first_timestamps
        .iter()
        .filter_map(|row| {
            let time_str: String = row.try_get("first_time").ok()?;
            // Parse just the time part
            let time = NaiveDateTime::parse_from_str(
                &format!("1970-01-01 {}", time_str),
                "%Y-%m-%d %H:%M:%S.%f",
            )
            .ok()?;
            Some(time)
        })
        .min();

    println!("earliest_timestamp: {:?}", earliest_timestamp);

    if earliest_timestamp.is_none() {
        return Json(json!({ "error": "No data found" }));
    }

    println!("earliest_timestamp: {:?}", earliest_timestamp);

    let earliest_timestamp = earliest_timestamp.unwrap();

    // Now get all entries using seconds since midnight (device time-of-day)
    let entries_query = format!(
        r#"
        SELECT 
            t.*,
            EXTRACT(EPOCH FROM (to_timestamp(t.time, 'HH24:MI:SS.MS')::time))::text as seconds_since_midnight
        FROM "{}" t
        ORDER BY t.time
        "#,
        table_name
    );

    let entries = sqlx::query(&entries_query)
        .fetch_all(&pool)
        .await
        .unwrap_or_default();

    // for row in &entries {
    //     println!("row:");
    //     if let Ok(name) = row.try_get::<String, _>("player_display_name") {
    //         println!("name: {}", name);
    //         if let Ok(value) = row.try_get::<String, _>("centralized_elapsed_time") {
    //             println!("Raw value: {}", value);
    //             // Try to parse the string into a number
    //             if let Ok(num) = value.parse::<f64>() {
    //                 println!("Parsed as f64: {}", num);
    //             } else if let Ok(num) = value.parse::<f32>() {
    //                 println!("Parsed as f32: {}", num);
    //             } else {
    //                 println!("Could not parse as number");
    //             }
    //         } else {
    //             println!("Could not get raw value");
    //         }
    //     }
    // }

    // Convert the rows to JSON
    let entries_json: Vec<Value> = entries
        .into_iter()
        .map(|row| {
            let mut entry = json!({});
            // Add seconds_since_midnight first
            if let Ok(value) = row.try_get::<String, _>("seconds_since_midnight") {
                if let Ok(num) = value.parse::<f64>() {
                    entry["seconds_since_midnight"] = json!(num);
                }
            }
            // Add other columns
            if let Ok(value) = row.try_get::<String, _>("player_display_name") {
                entry["player_display_name"] = json!(value);
            }
            if let Ok(value) = row.try_get::<String, _>("time") {
                entry["time"] = json!(value);
            }
            if let Ok(value) = row.try_get::<f64, _>("speed") {
                entry["speed"] = json!(value);
            }
            entry
        })
        .collect();

    println!("entries_json length: {}", entries_json.len());

    // Agrupar por jugador
    let mut player_entries: HashMap<String, Vec<Value>> = HashMap::new();
    for entry in entries_json {
        if let (Some(player), Some(_time)) = (
            entry["player_display_name"].as_str(),
            entry["seconds_since_midnight"].as_f64(),
        ) {
            player_entries
                .entry(player.to_string())
                .or_default()
                .push(entry);
        }
    }

    // Filtrar cada jugador por intervalos de 10 segundos
    let mut filtered_entries = Vec::new();
    for (_player, mut entries) in player_entries {
        // Ordenar por tiempo
        entries.sort_by(|a, b| {
            a["seconds_since_midnight"]
                .as_f64()
                .partial_cmp(&b["seconds_since_midnight"].as_f64())
                .unwrap()
        });
        let mut last_time = None;
        for entry in entries {
            let time = entry["seconds_since_midnight"].as_f64().unwrap();
            if last_time.is_none() || (time - last_time.unwrap()) >= 10.0 {
                filtered_entries.push(entry.clone());
                last_time = Some(time);
            }
        }
    }

    println!("filtered_entries length: {}", filtered_entries.len());

    Json(json!({
        "entries": filtered_entries
    }))
}

pub async fn detect_and_store_match_periods(
    State(pool): State<PgPool>,
    Path(table_name): Path<String>,
) -> Json<Value> {
    println!("Processing table: {}", table_name);

    // Primero verificar si ya existen datos para este match
    let existing_query = r#"
        SELECT 
            match_name,
            detected_first_half_start,
            detected_first_half_end,
            detected_second_half_start,
            detected_second_half_end,
            detected_halftime_start,
            detected_halftime_end,
            manual_first_half_start,
            manual_first_half_end,
            manual_second_half_start,
            manual_second_half_end,
            manual_halftime_start,
            manual_halftime_end
        FROM match_periods 
        WHERE match_name = $1
    "#;

    if let Ok(row) = sqlx::query(existing_query)
        .bind(&table_name)
        .fetch_one(&pool)
        .await 
    {
        println!("Found existing data for match: {}", table_name);
        
        // Debug: imprimir cada campo individualmente
        let match_name: String = row.try_get("match_name").unwrap_or_default();
        
        // Debug: verificar el tipo de datos que estamos obteniendo
        println!("Raw row data:");
        for (i, column) in row.columns().iter().enumerate() {
            let col_name = column.name();
            println!("  Column {}: {} (type: {})", i, col_name, column.type_info());
        }
        
        let detected_first_half_start: i32 = row.try_get("detected_first_half_start").unwrap_or(0);
        let detected_first_half_end: i32 = row.try_get("detected_first_half_end").unwrap_or(0);
        let detected_second_half_start: i32 = row.try_get("detected_second_half_start").unwrap_or(0);
        let detected_second_half_end: i32 = row.try_get("detected_second_half_end").unwrap_or(0);
        let detected_halftime_start: i32 = row.try_get("detected_halftime_start").unwrap_or(0);
        let detected_halftime_end: i32 = row.try_get("detected_halftime_end").unwrap_or(0);
        let manual_first_half_start: Option<i32> = row.try_get("manual_first_half_start").ok();
        let manual_first_half_end: Option<i32> = row.try_get("manual_first_half_end").ok();
        let manual_second_half_start: Option<i32> = row.try_get("manual_second_half_start").ok();
        let manual_second_half_end: Option<i32> = row.try_get("manual_second_half_end").ok();
        let manual_halftime_start: Option<i32> = row.try_get("manual_halftime_start").ok();
        let manual_halftime_end: Option<i32> = row.try_get("manual_halftime_end").ok();
        
        println!("Existing values from DB:");
        println!("  detected_first_half_start: {}", detected_first_half_start);
        println!("  detected_first_half_end: {}", detected_first_half_end);
        println!("  detected_second_half_start: {}", detected_second_half_start);
        println!("  detected_second_half_end: {}", detected_second_half_end);
        println!("  detected_halftime_start: {}", detected_halftime_start);
        println!("  detected_halftime_end: {}", detected_halftime_end);
        
        // Si todos los valores detectados son 0, ejecutar nueva detección
        if detected_first_half_start == 0 && detected_first_half_end == 0 && 
           detected_second_half_start == 0 && detected_second_half_end == 0 &&
           detected_halftime_start == 0 && detected_halftime_end == 0 {
            println!("All detected values are 0, proceeding with new detection...");
        } else {
            let response = json!({
                "match_name": match_name,
                "detected_first_half_start": detected_first_half_start,
                "detected_first_half_end": detected_first_half_end,
                "detected_second_half_start": detected_second_half_start,
                "detected_second_half_end": detected_second_half_end,
                "detected_halftime_start": detected_halftime_start,
                "detected_halftime_end": detected_halftime_end,
                "manual_first_half_start": manual_first_half_start,
                "manual_first_half_end": manual_first_half_end,
                "manual_second_half_start": manual_second_half_start,
                "manual_second_half_end": manual_second_half_end,
                "manual_halftime_start": manual_halftime_start,
                "manual_halftime_end": manual_halftime_end
            });
            
            println!("Returning existing data: {}", response);
            return Json(response);
        }
    }

    println!("No existing data found, proceeding with detection...");

    // Verificar la estructura de la tabla match_periods
    let table_structure = sqlx::query(
        r#"
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'match_periods'
        "#,
    )
    .fetch_all(&pool)
    .await;

    if let Ok(columns) = table_structure {
        println!("\nTable structure:");
        for row in columns {
            let column_name: String = row.get("column_name");
            let data_type: String = row.get("data_type");
            println!("{}: {}", column_name, data_type);
        }
        println!("");
    }

    // 1. Leer todos los datos de la tabla del partido
    let query = format!("SELECT * FROM \"{}\"_sql_player_gemini_processed_view ORDER BY time", table_name);
    let rows = match sqlx::query(&query).fetch_all(&pool).await {
        Ok(r) => r,
        Err(e) => {
            println!("Error fetching match data: {}", e);
            return Json(json!({"error": format!("Error fetching match data: {}", e)}));
        }
    };
    if rows.is_empty() {
        println!("No data found in match table");
        return Json(json!({"error": "No data found in match table"}));
    }

    println!("Found {} rows in match table", rows.len());

    // 2. Convertir a estructura de datos dinámica
    let mut data = Vec::new();
    let columns: Vec<String> = rows[0]
        .columns()
        .iter()
        .map(|c| c.name().to_string())
        .collect();
    for row in &rows {
        let mut entry = serde_json::Map::new();
        for col in &columns {
            // Intenta obtener como String, luego como f64, luego como i64, sino Null
            let value = row
                .try_get::<String, _>(col.as_str())
                .map(Value::String)
                .or_else(|_| row.try_get::<f64, _>(col.as_str()).map(Value::from))
                .or_else(|_| row.try_get::<i64, _>(col.as_str()).map(Value::from))
                .unwrap_or(Value::Null);
            entry.insert(col.clone(), value);
        }
        data.push(entry);
    }

    // 3. Usar elapsed_time existente o calcular centralized_elapsed_time si no existe
    let has_elapsed_time = columns.iter().any(|c| c == "elapsed_time");
    let has_centralized = columns.iter().any(|c| c == "seconds_since_midnight");
    
    if has_elapsed_time && !has_centralized {
        // Usar elapsed_time existente como seconds_since_midnight
        for row in data.iter_mut() {
            if let Some(elapsed) = row.get("elapsed_time").and_then(|v| v.as_f64()) {
                row.insert("seconds_since_midnight".to_string(), Value::from(elapsed));
            }
        }
    } else if !has_centralized {
        // Calcular seconds_since_midnight desde cero
        let mut _min_time = None;
        _min_time = data
            .iter()
            .filter_map(|row| row.get("time"))
            .filter_map(|v| v.as_str())
            .min()
            .map(|s| s.to_string());
        if let Some(ref min_time) = _min_time {
            for row in data.iter_mut() {
                if let Some(time) = row.get("time").and_then(|v| v.as_str()) {
                    let secs = diff_in_seconds(min_time, time);
                    row.insert("seconds_since_midnight".to_string(), Value::from(secs));
                }
            }
        }
    }

    // 4. Lógica de análisis de partido (fiel al notebook)
    // Parámetros del notebook
    let velocidad_partido = 5.9;
    let velocidad_partido_entretiempo = 11.0;
    let ventana_primer_tiempo = 20; // segundos (corregido desde notebook)
    let ventana_segundo_tiempo = 10; // segundos (corregido desde notebook)
    let _ventana_entretiempo = 9 * 60; // 9 minutos en segundos
    let _ventana_max_entretiempo = 15 * 60; // 15 minutos en segundos
    let duracion_segundo_tiempo = 45 * 60; // 45 minutos en segundos

    println!("Starting period detection with {} data points", data.len());
    
    // Debug: verificar si hay datos de velocidad
    let speed_data_count = data.iter().filter(|row| {
        row.get("seconds_since_midnight").and_then(|v| v.as_f64()).is_some() &&
        row.get("speed").and_then(|v| v.as_f64()).is_some()
    }).count();
    println!("Data points with both elapsed_time and speed: {}", speed_data_count);
    
    // Debug: verificar rango de tiempos
    if let (Some(min_time), Some(max_time)) = (
        data.iter().filter_map(|row| row.get("seconds_since_midnight").and_then(|v| v.as_f64())).min_by(|a, b| a.partial_cmp(b).unwrap()),
        data.iter().filter_map(|row| row.get("seconds_since_midnight").and_then(|v| v.as_f64())).max_by(|a, b| a.partial_cmp(b).unwrap())
    ) {
        println!("Time range: {} to {} seconds ({} to {} minutes)", 
                 min_time, max_time, 
                 min_time / 60.0, max_time / 60.0);
    }

    // Agrupar por segundo y calcular velocidad promedio por segundo
    // Siguiendo el notebook: considerar sólo segundos con al menos N jugadores; rellenar huecos con 0
    let min_players_for_second: usize = 2; // el notebook usa 2 en el código efectivo
    let mut second_to_speeds: HashMap<i64, Vec<f64>> = HashMap::new();
    let mut second_to_players: HashMap<i64, HashSet<String>> = HashMap::new();

    for row in &data {
        let sec_opt = row
            .get("seconds_since_midnight")
            .and_then(|v| v.as_f64())
            .map(|s| s.floor() as i64);
        let speed_opt = row.get("speed").and_then(|v| v.as_f64());
        let player_opt = row.get("player_display_name").and_then(|v| v.as_str());

        if let (Some(sec), Some(speed), Some(player)) = (sec_opt, speed_opt, player_opt) {
            second_to_speeds.entry(sec).or_default().push(speed);
            second_to_players
                .entry(sec)
                .or_default()
                .insert(player.to_string());
        }
    }

    let max_second: i64 = second_to_speeds.keys().copied().max().unwrap_or(0);
    let mut second_avg_speed: Vec<(i64, f64)> = Vec::with_capacity((max_second + 1) as usize);
    for sec in 0..=max_second {
        let num_players = second_to_players
            .get(&sec)
            .map(|s| s.len())
            .unwrap_or(0);
        if num_players >= min_players_for_second {
            let empty: Vec<f64> = Vec::new();
            let speeds = second_to_speeds.get(&sec).unwrap_or(&empty);
            let avg = if speeds.is_empty() {
                0.0
            } else {
                speeds.iter().sum::<f64>() / speeds.len() as f64
            };
            second_avg_speed.push((sec, avg));
        } else {
            // Rellenar con velocidad 0 cuando no hay suficientes jugadores o falta el segundo
            second_avg_speed.push((sec, 0.0));
        }
    }

    println!("Calculated {} seconds of speed data", second_avg_speed.len());
    if second_avg_speed.len() > 0 {
        println!("First 10 seconds: {:?}", &second_avg_speed[..std::cmp::min(10, second_avg_speed.len())]);
    }

    // Detectar bloques de entretiempo (velocidad <= 11 durante al menos 15 minutos, reduciendo hasta encontrar)
    let mut halftime_blocks: Vec<Vec<i64>>;
    let mut current_window = 900; // 15 minutos = 900 segundos (como en el notebook)

    // Precalcular runs de "velocidad baja" (<= 11 km/h)
    let mut runs: Vec<Vec<i64>> = Vec::new();
    let mut run: Vec<i64> = Vec::new();
    for (sec, speed) in &second_avg_speed {
        if *speed <= velocidad_partido_entretiempo {
            run.push(*sec);
        } else {
            if !run.is_empty() {
                runs.push(run.clone());
                run.clear();
            }
        }
    }
    if !run.is_empty() {
        runs.push(run);
    }

    // Buscar bloques válidos, reduciendo ventana si es necesario
    let maximum_halftime_end = max_second - duracion_segundo_tiempo; // dejar espacio mínimo para ST
    loop {
        let candidate: Vec<Vec<i64>> = runs
            .iter()
            .filter(|block| block.len() as i64 >= current_window)
            .filter(|block| !block.is_empty() && block[0] > 60) // evitar el bloque inicial
            .filter(|block| *block.last().unwrap_or(&0) <= maximum_halftime_end)
            .cloned()
            .collect();

        if !candidate.is_empty() || current_window <= 0 {
            halftime_blocks = candidate;
            break;
        }
        current_window -= 10;
    }
    
    println!("Found {} halftime blocks (min {} seconds each)", halftime_blocks.len(), current_window);
    for (i, block) in halftime_blocks.iter().enumerate() {
        println!("  Block {}: {} seconds (from {} to {})", i, block.len(), block[0], block.last().unwrap());
    }
    
    // Debug: verificar si hay bloques de entretiempo válidos
    if halftime_blocks.is_empty() {
        println!("WARNING: No halftime blocks found! This might indicate:");
        println!("  - Data doesn't have a clear halftime period");
        println!("  - Halftime threshold ({} seconds) is too high", current_window);
        println!("  - Speed threshold ({} km/h) is too low", velocidad_partido_entretiempo);
    }
    
    // Tomar el primer bloque válido que no sea al principio (filtrar grupo 1 como en el notebook)
    let halftime_block = halftime_blocks
        .into_iter()
        .find(|block| !block.is_empty() && block[0] > 60) // evitar bloques al inicio
        .unwrap_or_default();
    let (halftime_start, mut halftime_end) = if !halftime_block.is_empty() {
        (halftime_block[0], *halftime_block.last().unwrap())
    } else {
        (0, 0)
    };

    // Limitar a 900s y refinar final del entretiempo con primer segundo de alta velocidad posterior
    if halftime_start > 0 {
        let max_halftime_end = halftime_start + 900;
        if halftime_end > max_halftime_end { halftime_end = max_halftime_end; }

        if let Some((refined_end, _)) = second_avg_speed
            .iter()
            .filter(|(s, _)| *s > halftime_end)
            .find(|(_, sp)| *sp > velocidad_partido_entretiempo)
        {
            halftime_end = *refined_end;
        }
    }
    
    println!("Selected halftime block: from {} to {}", halftime_start, halftime_end);

    // Detectar inicio del primer tiempo: tomar el ULTIMO run > 5.9 sostenido por ventana_primer_tiempo antes del halftime_start
    let mut first_half_start = 0;
    let mut acc = 0;
    let mut last_run_start_candidate: Option<i64> = None;
    for (sec, speed) in second_avg_speed.iter().filter(|(s, _)| *s <= halftime_start) {
        if *speed > velocidad_partido {
            acc += 1;
        } else {
            // si veníamos acumulando y era válido, guardar candidate
            if acc >= ventana_primer_tiempo {
                let start = *sec - acc + 1;
                last_run_start_candidate = Some(start);
            }
            acc = 0;
        }
    }
    // cierre de bucle: si termina con run válido, guardarlo
    if acc >= ventana_primer_tiempo {
        let last_sec = halftime_start.min(max_second);
        let start = last_sec - acc + 1;
        last_run_start_candidate = Some(start);
    }
    first_half_start = last_run_start_candidate.unwrap_or(0);
    // Fin del primer tiempo: inicio del entretiempo
    let first_half_end = halftime_start;

    // Detectar inicio del segundo tiempo (después del entretiempo, bloque de velocidad > 11 sostenido)
    let mut second_half_start = halftime_end;
    let mut acc = 0;
    for (sec, speed) in second_avg_speed.iter().filter(|(s, _)| *s > halftime_end) {
        if *speed > velocidad_partido_entretiempo {
            acc += 1;
        } else {
            acc = 0;
        }
        if acc >= ventana_segundo_tiempo {
            second_half_start = *sec - ventana_segundo_tiempo + 1;
            break;
        }
    }
    // Fin del segundo tiempo: al menos 45 min y luego baja sostenida
    let mut second_half_end = second_half_start + duracion_segundo_tiempo;
    acc = 0;
    for (sec, speed) in second_avg_speed.iter().filter(|(s, _)| *s >= second_half_end) {
        if *speed <= velocidad_partido {
            acc += 1;
        } else {
            acc = 0;
        }
        if acc >= 20 {
            second_half_end = *sec;
            break;
        }
    }

    // Antes de guardar en la base de datos, imprimir los valores
    println!("Detected periods:");
    println!("First half start: {}", first_half_start);
    println!("First half end: {}", first_half_end);
    println!("Second half start: {}", second_half_start);
    println!("Second half end: {}", second_half_end);
    println!("Halftime start: {}", halftime_start);
    println!("Halftime end: {}", halftime_end);
    
    // Debug: imprimir algunos datos de velocidad para entender qué está pasando
    println!("Sample speed data (first 20 entries):");
    for (i, (sec, speed)) in second_avg_speed.iter().take(20).enumerate() {
        println!("  {}: sec={}, speed={}", i, sec, speed);
    }
    
    println!("Sample speed data (last 20 entries):");
    let total_entries = second_avg_speed.len();
    for (i, (sec, speed)) in second_avg_speed.iter().skip(total_entries.saturating_sub(20)).enumerate() {
        println!("  {}: sec={}, speed={}", i, sec, speed);
    }

    // Guardar/actualizar en match_periods
    let insert_query = r#"
        INSERT INTO match_periods (
            match_name,
            detected_first_half_start,
            detected_first_half_end,
            detected_second_half_start,
            detected_second_half_end,
            detected_halftime_start,
            detected_halftime_end
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (match_name) DO UPDATE SET
            detected_first_half_start = EXCLUDED.detected_first_half_start,
            detected_first_half_end = EXCLUDED.detected_first_half_end,
            detected_second_half_start = EXCLUDED.detected_second_half_start,
            detected_second_half_end = EXCLUDED.detected_second_half_end,
            detected_halftime_start = EXCLUDED.detected_halftime_start,
            detected_halftime_end = EXCLUDED.detected_halftime_end,
            updated_at = NOW()
        RETURNING *
    "#;

    println!("\nInserting/updating with values:");
    println!("table_name: {}", table_name);
    println!("first_half_start: {}", first_half_start);
    println!("first_half_end: {}", first_half_end);
    println!("second_half_start: {}", second_half_start);
    println!("second_half_end: {}", second_half_end);
    println!("halftime_start: {}", halftime_start);
    println!("halftime_end: {}", halftime_end);

    match sqlx::query(insert_query)
        .bind(&table_name)
        .bind(first_half_start)
        .bind(first_half_end)
        .bind(second_half_start)
        .bind(second_half_end)
        .bind(halftime_start)
        .bind(halftime_end)
        .fetch_one(&pool)
        .await
    {
        Ok(row) => {
            println!("\nReturned values after insert/update:");
            println!(
                "detected_first_half_start: {}",
                row.try_get::<i32, _>("detected_first_half_start")
                    .unwrap_or(0)
            );
            println!(
                "detected_first_half_end: {}",
                row.try_get::<i32, _>("detected_first_half_end")
                    .unwrap_or(0)
            );
            println!(
                "detected_second_half_start: {}",
                row.try_get::<i32, _>("detected_second_half_start")
                    .unwrap_or(0)
            );
            println!(
                "detected_second_half_end: {}",
                row.try_get::<i32, _>("detected_second_half_end")
                    .unwrap_or(0)
            );
            println!(
                "detected_halftime_start: {}",
                row.try_get::<i32, _>("detected_halftime_start")
                    .unwrap_or(0)
            );
            println!(
                "detected_halftime_end: {}",
                row.try_get::<i32, _>("detected_halftime_end").unwrap_or(0)
            );
        }
        Err(e) => println!("Error in insert/update: {}", e),
    }

    // Después de la inserción/actualización, hacer un SELECT directo para obtener los datos
    let select_query = r#"
        SELECT 
            match_name,
            detected_first_half_start,
            detected_first_half_end,
            detected_second_half_start,
            detected_second_half_end,
            detected_halftime_start,
            detected_halftime_end,
            manual_first_half_start,
            manual_first_half_end,
            manual_second_half_start,
            manual_second_half_end,
            manual_halftime_start,
            manual_halftime_end
        FROM match_periods 
        WHERE match_name = $1
    "#;

    match sqlx::query(select_query)
        .bind(&table_name)
        .fetch_one(&pool)
        .await {
        Ok(row) => {
            println!("\nFinal SELECT result:");
            
            // Debug: imprimir cada campo individualmente
            let match_name: String = row.try_get("match_name").unwrap_or_default();
            let detected_first_half_start: i32 = row.try_get("detected_first_half_start").unwrap_or_default();
            let detected_first_half_end: i32 = row.try_get("detected_first_half_end").unwrap_or_default();
            let detected_second_half_start: i32 = row.try_get("detected_second_half_start").unwrap_or_default();
            let detected_second_half_end: i32 = row.try_get("detected_second_half_end").unwrap_or_default();
            let detected_halftime_start: i32 = row.try_get("detected_halftime_start").unwrap_or_default();
            let detected_halftime_end: i32 = row.try_get("detected_halftime_end").unwrap_or_default();
            let manual_first_half_start: Option<i32> = row.try_get("manual_first_half_start").ok();
            let manual_first_half_end: Option<i32> = row.try_get("manual_first_half_end").ok();
            let manual_second_half_start: Option<i32> = row.try_get("manual_second_half_start").ok();
            let manual_second_half_end: Option<i32> = row.try_get("manual_second_half_end").ok();
            let manual_halftime_start: Option<i32> = row.try_get("manual_halftime_start").ok();
            let manual_halftime_end: Option<i32> = row.try_get("manual_halftime_end").ok();
            
            println!("Raw values from DB:");
            println!("  match_name: {}", match_name);
            println!("  detected_first_half_start: {}", detected_first_half_start);
            println!("  detected_first_half_end: {}", detected_first_half_end);
            println!("  detected_second_half_start: {}", detected_second_half_start);
            println!("  detected_second_half_end: {}", detected_second_half_end);
            println!("  detected_halftime_start: {}", detected_halftime_start);
            println!("  detected_halftime_end: {}", detected_halftime_end);
            println!("  manual_first_half_start: {:?}", manual_first_half_start);
            println!("  manual_first_half_end: {:?}", manual_first_half_end);
            println!("  manual_second_half_start: {:?}", manual_second_half_start);
            println!("  manual_second_half_end: {:?}", manual_second_half_end);
            println!("  manual_halftime_start: {:?}", manual_halftime_start);
            println!("  manual_halftime_end: {:?}", manual_halftime_end);
            
            let response = json!({
                "match_name": match_name,
                "detected_first_half_start": detected_first_half_start,
                "detected_first_half_end": detected_first_half_end,
                "detected_second_half_start": detected_second_half_start,
                "detected_second_half_end": detected_second_half_end,
                "detected_halftime_start": detected_halftime_start,
                "detected_halftime_end": detected_halftime_end,
                "manual_first_half_start": manual_first_half_start,
                "manual_first_half_end": manual_first_half_end,
                "manual_second_half_start": manual_second_half_start,
                "manual_second_half_end": manual_second_half_end,
                "manual_halftime_start": manual_halftime_start,
                "manual_halftime_end": manual_halftime_end
            });
            println!("Response JSON: {}", response);
            return Json(response);
        }
        Err(e) => {
            println!("Error in final SELECT: {}", e);
            return Json(json!({"error": format!("Error retrieving match periods: {}", e)}));
        }
    }
}



pub async fn get_player_worst_cases_from_view(
    State(pool): State<PgPool>,
    Path(table_name): Path<String>,
) -> Json<Value> {
    // Query usando la vista procesada (como en tu query original)
    let view_name = format!("{}_sql_player_gemini_processed_view", table_name);
    
    let worst_cases_query = format!(
        r#"
        WITH high_speed_data AS (
            SELECT 
                player_display_name, 
                time,
                distancia_total_calc,
                speed,
                '00:00:00'::TIME + 
                (SUBSTRING(time FROM 1 FOR 2) || ' hours')::INTERVAL
                + (SUBSTRING(time FROM 4 FOR 2) || ' minutes')::INTERVAL
                + (SUBSTRING(time FROM 7) || ' seconds')::INTERVAL AS second_interval
            FROM public.{}
            WHERE speed > {}  -- High Speed Running threshold
        ),
        minute_window_data AS (
            SELECT 
                player_display_name,
                second_interval,
                SUM(distancia_total_calc) OVER (
                    PARTITION BY player_display_name 
                    ORDER BY second_interval
                    RANGE BETWEEN INTERVAL '0 seconds' PRECEDING AND INTERVAL '59 seconds' FOLLOWING
                ) AS total_distance_in_minute
            FROM high_speed_data
        ),
        max_minute_window AS (
            SELECT 
                player_display_name,
                second_interval AS start_second,
                second_interval + INTERVAL '1 minute' AS end_second,
                total_distance_in_minute AS distance_covered,
                ROW_NUMBER() OVER (
                    PARTITION BY player_display_name 
                    ORDER BY total_distance_in_minute DESC
                ) AS rank
            FROM minute_window_data
        )
        SELECT 
            player_display_name,
            start_second::TEXT as start_second,
            end_second::TEXT as end_second,
            distance_covered
        FROM max_minute_window
        WHERE rank = 1
        ORDER BY player_display_name
        "#,
        view_name, HSR_THRESHOLD_KMH
    );

    let results = sqlx::query(&worst_cases_query)
        .fetch_all(&pool)
        .await
        .unwrap_or_default();

    let worst_cases_json: Vec<Value> = results
        .into_iter()
        .map(|row| {
            json!({
                "player_display_name": row.try_get::<String, _>("player_display_name").unwrap_or_default(),
                "start_second": parse_interval_to_seconds(&row.try_get::<String, _>("start_second").unwrap_or_default()),
                "end_second": parse_interval_to_seconds(&row.try_get::<String, _>("end_second").unwrap_or_default()),
                "distance_covered": row.try_get::<f64, _>("distance_covered").unwrap_or(0.0)
            })
        })
        .collect();

    Json(json!({
        "worst_cases": worst_cases_json
    }))
}

pub async fn get_sprints_in_worst_cases(
    State(pool): State<PgPool>,
    Path(table_name): Path<String>,
) -> Json<Value> {
    // Query para encontrar sprints dentro de los worst cases
    let view_name = format!("{}_sql_player_gemini_processed_view", table_name);
    
    let sprints_query = format!(
        r#"
        WITH high_speed_data AS (
            SELECT 
                player_display_name, 
                time,
                distancia_total_calc,
                speed,
                '00:00:00'::TIME + 
                (SUBSTRING(time FROM 1 FOR 2) || ' hours')::INTERVAL
                + (SUBSTRING(time FROM 4 FOR 2) || ' minutes')::INTERVAL
                + (SUBSTRING(time FROM 7) || ' seconds')::INTERVAL AS second_interval
            FROM public.{}
            WHERE speed > {}  -- High Speed Running threshold
        ),
        minute_window_data AS (
            SELECT 
                player_display_name,
                second_interval,
                SUM(distancia_total_calc) OVER (
                    PARTITION BY player_display_name 
                    ORDER BY second_interval
                    RANGE BETWEEN INTERVAL '0 seconds' PRECEDING AND INTERVAL '59 seconds' FOLLOWING
                ) AS total_distance_in_minute
            FROM high_speed_data
        ),
        max_minute_window AS (
            SELECT 
                player_display_name,
                second_interval AS start_second,
                second_interval + INTERVAL '1 minute' AS end_second,
                total_distance_in_minute AS distance_covered,
                ROW_NUMBER() OVER (
                    PARTITION BY player_display_name 
                    ORDER BY total_distance_in_minute DESC
                ) AS rank
            FROM minute_window_data
        ),
        sprint_data AS (
            SELECT 
                player_display_name, 
                time,
                speed,
                distancia_total_calc,
                LAG(distancia_total_calc) OVER (PARTITION BY player_display_name ORDER BY time) AS prev_hsr,
                LEAD(distancia_total_calc) OVER (PARTITION BY player_display_name ORDER BY time) AS next_hsr
            FROM public.{}
        ),
        grouped_sprints AS (
            SELECT
                player_display_name,
                time,
                speed,
                distancia_total_calc,
                SUM(CASE 
                    WHEN prev_hsr = 0 AND distancia_total_calc > 0 THEN 1 
                    ELSE 0 
                END) OVER (PARTITION BY player_display_name ORDER BY time) AS sprint_id
            FROM sprint_data
        ),
        sprint_summary AS (
            SELECT
                player_display_name,
                sprint_id,
                MIN(time) AS sprint_start_time,
                MAX(time) AS sprint_end_time,
                SUM(distancia_total_calc) AS total_sprint_distance,
                MIN(speed) AS min_speed_reached_within_sprint,
                MAX(speed) AS max_speed_reached_within_sprint
            FROM grouped_sprints
            WHERE distancia_total_calc > 0 AND speed >= {}  -- Sprint threshold
            GROUP BY player_display_name, sprint_id
        )
        SELECT 
            mw.player_display_name,
            mw.start_second::TEXT as start_second,
            mw.end_second::TEXT as end_second,
            ss.sprint_start_time::TEXT as sprint_start_time,
            ss.sprint_end_time::TEXT as sprint_end_time,
            ss.total_sprint_distance,
            ss.min_speed_reached_within_sprint,
            ss.max_speed_reached_within_sprint,
            mw.distance_covered,
            ss.sprint_id
        FROM max_minute_window mw
        JOIN sprint_summary ss
            ON mw.player_display_name = ss.player_display_name
            AND TO_CHAR(ss.sprint_start_time::TIME, 'HH24:MI:SS') >= TO_CHAR(mw.start_second::TIME, 'HH24:MI:SS')
            AND TO_CHAR(ss.sprint_end_time::TIME, 'HH24:MI:SS') <= TO_CHAR(mw.end_second::TIME, 'HH24:MI:SS')
        WHERE mw.rank = 1
        ORDER BY mw.player_display_name, ss.sprint_id
        "#,
        view_name, HSR_THRESHOLD_KMH, view_name, SPRINT_THRESHOLD_KMH
    );

    let results = sqlx::query(&sprints_query)
        .fetch_all(&pool)
        .await
        .unwrap_or_default();

    let sprints_json: Vec<Value> = results
        .into_iter()
        .map(|row| {
            json!({
                "player_display_name": row.try_get::<String, _>("player_display_name").unwrap_or_default(),
                "sprint_id": row.try_get::<i64, _>("sprint_id").unwrap_or(0),
                "start_second": parse_interval_to_seconds(&row.try_get::<String, _>("start_second").unwrap_or_default()),
                "end_second": parse_interval_to_seconds(&row.try_get::<String, _>("end_second").unwrap_or_default()),
                "sprint_start_time": row.try_get::<String, _>("sprint_start_time").unwrap_or_default(),
                "sprint_end_time": row.try_get::<String, _>("sprint_end_time").unwrap_or_default(),
                "total_sprint_distance": row.try_get::<f64, _>("total_sprint_distance").unwrap_or(0.0),
                "min_speed_reached_within_sprint": row.try_get::<f64, _>("min_speed_reached_within_sprint").unwrap_or(0.0),
                "max_speed_reached_within_sprint": row.try_get::<f64, _>("max_speed_reached_within_sprint").unwrap_or(0.0),
                "worst_case_distance_covered": row.try_get::<f64, _>("distance_covered").unwrap_or(0.0)
            })
        })
        .collect();

    Json(json!({
        "sprints_in_worst_cases": sprints_json
    }))
}

// Utilidad para calcular diferencia en segundos entre dos strings HH:MM:SS(.MS)
fn diff_in_seconds(time1: &str, time2: &str) -> f64 {
    let parse = |t: &str| {
        let parts: Vec<&str> = t.split(':').collect();
        if parts.len() < 3 {
            return 0.0;
        }
        let h = parts[0].parse::<f64>().unwrap_or(0.0);
        let m = parts[1].parse::<f64>().unwrap_or(0.0);
        let s = parts[2].parse::<f64>().unwrap_or(0.0);
        h * 3600.0 + m * 60.0 + s
    };
    parse(time2) - parse(time1)
}

// Utilidad para convertir intervalo PostgreSQL a segundos
fn parse_interval_to_seconds(interval_str: &str) -> f64 {
    if interval_str.is_empty() {
        return 0.0;
    }
    
    // Formato de PostgreSQL INTERVAL: "HH:MM:SS" o "HH:MM:SS.MS"
    let parts: Vec<&str> = interval_str.split(':').collect();
    if parts.len() < 3 {
        return 0.0;
    }
    
    let h = parts[0].parse::<f64>().unwrap_or(0.0);
    let m = parts[1].parse::<f64>().unwrap_or(0.0);
    let s = parts[2].parse::<f64>().unwrap_or(0.0);
    
    h * 3600.0 + m * 60.0 + s
}

#[derive(Deserialize)]
pub struct PatchPeriodsPayload {
    pub match_name: Option<String>,
    pub manual_first_half_start: Option<i32>,
    pub manual_second_half_start: Option<i32>,
    pub first_half_duration_sec: Option<i32>,
    pub second_half_duration_sec: Option<i32>,
}

/// POST /match/table/:table_name/periods/patch
/// Upserts manual (patched) starts and derived ends into match_periods without touching detected_* columns
pub async fn patch_match_periods(
    State(pool): State<PgPool>,
    Path(table_name): Path<String>,
    Json(payload): Json<PatchPeriodsPayload>,
) -> Json<Value> {
    let match_name = payload.match_name.clone().unwrap_or(table_name.clone());
    let manual_first_start = payload.manual_first_half_start;
    let manual_second_start = payload.manual_second_half_start;
    let fh_dur = payload.first_half_duration_sec;
    let sh_dur = payload.second_half_duration_sec;

    let manual_first_end = match (manual_first_start, fh_dur) {
        (Some(s), Some(d)) if d > 0 => Some(s + d),
        _ => None,
    };
    let manual_second_end = match (manual_second_start, sh_dur) {
        (Some(s), Some(d)) if d > 0 => Some(s + d),
        _ => None,
    };

    // Ensure a row exists for this match and upsert only manual columns
    let query = r#"
        INSERT INTO match_periods (match_name)
        VALUES ($1)
        ON CONFLICT (match_name) DO NOTHING
    "#;
    let _ = sqlx::query(query)
        .bind(&match_name)
        .execute(&pool)
        .await;

    let update = r#"
        UPDATE match_periods SET
            manual_first_half_start = COALESCE($2, manual_first_half_start),
            manual_first_half_end   = COALESCE($3, manual_first_half_end),
            manual_second_half_start= COALESCE($4, manual_second_half_start),
            manual_second_half_end  = COALESCE($5, manual_second_half_end),
            updated_at = NOW()
        WHERE match_name = $1
        RETURNING manual_first_half_start, manual_first_half_end, manual_second_half_start, manual_second_half_end
    "#;

    let row = sqlx::query(update)
        .bind(&match_name)
        .bind(manual_first_start)
        .bind(manual_first_end)
        .bind(manual_second_start)
        .bind(manual_second_end)
        .fetch_one(&pool)
        .await;

    match row {
        Ok(r) => {
            let mfs: Option<i32> = r.try_get("manual_first_half_start").ok();
            let mfe: Option<i32> = r.try_get("manual_first_half_end").ok();
            let mss: Option<i32> = r.try_get("manual_second_half_start").ok();
            let mse: Option<i32> = r.try_get("manual_second_half_end").ok();
            Json(json!({
                "match_name": match_name,
                "manual_first_half_start": mfs,
                "manual_first_half_end": mfe,
                "manual_second_half_start": mss,
                "manual_second_half_end": mse
            }))
        }
        Err(e) => Json(json!({"error": format!("failed to patch periods: {}", e)})),
    }
}

