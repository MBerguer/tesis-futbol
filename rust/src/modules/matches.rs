use axum::extract::Json;
use axum::extract::Path;
use axum::extract::State;
use chrono::NaiveDateTime;
use serde::Deserialize;
use serde_json::{json, Value};
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
                seconds_since_midnight,
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
                seconds_since_midnight,
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
                MIN(seconds_since_midnight)::double precision AS sprint_start_sec,
                MAX(seconds_since_midnight)::double precision AS sprint_end_sec,
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
            ss.sprint_start_sec,
            ss.sprint_end_sec,
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
                "sprint_start_sec": row.try_get::<f64, _>("sprint_start_sec").unwrap_or(0.0),
                "sprint_end_sec": row.try_get::<f64, _>("sprint_end_sec").unwrap_or(0.0),
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


/// GET /match/table/:table_name/accelerations?mode=summary|full
/// Computes per-player acceleration/deceleration events from the processed GPS view
pub async fn get_accelerations_hardcoded(
    State(pool): State<PgPool>,
    Path(table_name): Path<String>,
    axum::extract::Query(params): axum::extract::Query<HashMap<String, String>>,
) -> Json<Value> {
    let view_name = format!("{}_sql_player_gemini_processed_view", table_name);
    let mode = params
        .get("mode")
        .map(|s| s.to_lowercase())
        .unwrap_or_else(|| "summary".to_string());

    // Fetch manual period boundaries (seconds since midnight)
    let periods_row = sqlx::query(
        r#"
        SELECT 
            manual_first_half_start AS s1,
            manual_first_half_end   AS e1,
            manual_second_half_start AS s2,
            manual_second_half_end   AS e2
        FROM match_periods
        WHERE match_name = $1
        "#,
    )
    .bind(&table_name)
    .fetch_one(&pool)
    .await;

    let (s1, e1, s2, e2) = match periods_row {
        Ok(r) => {
            let s1: Option<i32> = r.try_get("s1").ok();
            let e1: Option<i32> = r.try_get("e1").ok();
            let s2: Option<i32> = r.try_get("s2").ok();
            let e2: Option<i32> = r.try_get("e2").ok();
            if let (Some(s1), Some(e1), Some(s2), Some(e2)) = (s1, e1, s2, e2) {
                (s1 as f64, e1 as f64, s2 as f64, e2 as f64)
            } else {
                return Json(json!({
                    "accelerations": [],
                    "events": [],
                    "error": "manual periods not available for this match"
                }));
            }
        }
        Err(_) => {
            return Json(json!({
                "accelerations": [],
                "events": [],
                "error": "manual periods not found for this match"
            }));
        }
    };

    // Base CTE used by both summary and full queries (built with player_display_name key)
    let base_cte = format!(
        r#"
WITH base AS (
  SELECT
    player_display_name,
    time,
    (speed::numeric) / 3.6 AS speed_ms,
    EXTRACT(EPOCH FROM to_timestamp(time, 'HH24:MI:SS.MS')::time) AS epoch_time,
    LAG(EXTRACT(EPOCH FROM to_timestamp(time, 'HH24:MI:SS.MS')::time)) OVER (
      PARTITION BY player_display_name ORDER BY to_timestamp(time, 'HH24:MI:SS.MS')::time
    ) AS prev_epoch,
    LAG((speed::numeric) / 3.6) OVER (
      PARTITION BY player_display_name ORDER BY to_timestamp(time, 'HH24:MI:SS.MS')::time
    ) AS prev_speed_ms
  FROM public.{view}
),

filtered_base AS (
  SELECT * FROM base
  WHERE (epoch_time BETWEEN $1 AND $2) OR (epoch_time BETWEEN $3 AND $4)
),

delta AS (
  SELECT
    player_display_name,
    time,
    speed_ms,
    prev_speed_ms,
    COALESCE(
      CASE
        WHEN prev_epoch IS NULL THEN 0
        WHEN epoch_time >= prev_epoch THEN epoch_time - prev_epoch
        ELSE epoch_time + 86400 - prev_epoch
      END,
    0) AS delta_time
  FROM filtered_base
),

acc_calc AS (
  SELECT
    player_display_name,
    time,
    speed_ms,
    delta_time,
    CASE
      WHEN delta_time > 0 AND prev_speed_ms IS NOT NULL THEN (speed_ms - prev_speed_ms) / delta_time
      ELSE 0
    END AS calc_acceleration
  FROM delta
),

filtered AS (
  SELECT
    player_display_name,
    time,
    speed_ms,
    delta_time,
    GREATEST(LEAST(calc_acceleration, 22), -22) AS acceleration_limited
  FROM acc_calc
  WHERE delta_time > 0 AND delta_time < 0.5
),

time_cum AS (
  SELECT
    *,
    SUM(delta_time) OVER (PARTITION BY player_display_name ORDER BY time) AS time_s
  FROM filtered
),

labeled AS (
  SELECT
    *,
    CASE
      WHEN acceleration_limited >= 1 THEN 'accel_potential'
      WHEN acceleration_limited <= -1 THEN 'decel_potential'
      ELSE 'none'
    END AS event_type
  FROM time_cum
),

grp_prep AS (
  SELECT
    *,
    LAG(event_type) OVER (PARTITION BY player_display_name ORDER BY time_s) AS prev_event_type
  FROM labeled
),

grp AS (
  SELECT
    *,
    SUM(CASE WHEN prev_event_type = event_type THEN 0 ELSE 1 END)
      OVER (PARTITION BY player_display_name ORDER BY time_s) AS grp
  FROM grp_prep
),

grouped AS (
  SELECT
    player_display_name,
    event_type,
    grp,
    MIN(time) AS start_time_text,
    MAX(time) AS end_time_text,
    MIN(time_s) AS start_time_s,
    MAX(time_s) AS end_time_s,
    SUM(delta_time) AS duration_s,
    MAX(speed_ms) AS max_speed,
    MAX(acceleration_limited) AS max_acc,
    MIN(acceleration_limited) AS min_acc,
    SUM(speed_ms * delta_time) AS distance_m
  FROM grp
  GROUP BY player_display_name, event_type, grp
),

events AS (
  SELECT
    player_display_name,
    event_type,
    start_time_text,
    end_time_text,
    start_time_s,
    end_time_s,
    duration_s,
    max_speed,
    CASE WHEN event_type = 'accel_potential' THEN max_acc ELSE min_acc END AS peak_acc,
    distance_m
  FROM grouped
  WHERE event_type <> 'none'
),

filtered_events AS (
  SELECT *
  FROM events
  WHERE (event_type = 'accel_potential' AND peak_acc >= 2.5 AND duration_s >= 0.5)
     OR (event_type = 'decel_potential' AND peak_acc <= -2.5 AND duration_s >= 0.5)
),

classified AS (
  SELECT
    *,
    CASE
      WHEN event_type = 'accel_potential' AND peak_acc >= 4    THEN 'high'
      WHEN event_type = 'accel_potential' AND peak_acc >= 3    THEN 'medium'
      WHEN event_type = 'accel_potential' AND peak_acc >= 2.5  THEN 'low'
      WHEN event_type = 'decel_potential' AND peak_acc <= -4   THEN 'high'
      WHEN event_type = 'decel_potential' AND peak_acc <= -3   THEN 'medium'
      WHEN event_type = 'decel_potential' AND peak_acc <= -2.5 THEN 'low'
      ELSE 'unknown'
    END AS intensity_category
  FROM filtered_events
)
        "#,
        view = view_name
    );

    if mode == "full" {
        let sql_full = format!(
            r#"{base}
SELECT
  ROW_NUMBER() OVER (ORDER BY player_display_name, start_time_s) AS id,
  player_display_name,
  CASE WHEN event_type = 'accel_potential' THEN 'accel' ELSE 'decel' END AS accel_or_decel,
  start_time_text AS start_time,
  end_time_text AS end_time,
  ROUND(duration_s::numeric, 3)::double precision AS duration_s,
  ROUND(peak_acc::numeric, 3)::double precision AS peak_acc,
  ROUND(max_speed::numeric, 3)::double precision AS max_speed_m_s,
  ROUND(distance_m::numeric, 3)::double precision AS distance_m,
  EXTRACT(EPOCH FROM to_timestamp(start_time_text, 'HH24:MI:SS.MS')::time)::double precision AS seconds_since_midnight,
  intensity_category
FROM classified
ORDER BY player_display_name, start_time_s"#,
            base = base_cte
        );

        let rows = match sqlx::query(&sql_full)
            .bind(s1)
            .bind(e1)
            .bind(s2)
            .bind(e2)
            .fetch_all(&pool)
            .await
        {
            Ok(r) => r,
            Err(e) => return Json(json!({"events": [], "error": format!("db error: {}", e)})),
        };

        let events: Vec<Value> = rows
            .into_iter()
            .map(|r| {
                json!({
                    "id": r.try_get::<i64,_>("id").unwrap_or(0),
                    "player_display_name": r.try_get::<String,_>("player_display_name").unwrap_or_default(),
                    "accel_or_decel": r.try_get::<String,_>("accel_or_decel").unwrap_or_default(),
                    "start_time": r.try_get::<String,_>("start_time").unwrap_or_default(),
                    "end_time": r.try_get::<String,_>("end_time").unwrap_or_default(),
                    "duration_s": r.try_get::<f64,_>("duration_s").unwrap_or(0.0),
                    "peak_acc": r.try_get::<f64,_>("peak_acc").unwrap_or(0.0),
                    "max_speed_m_s": r.try_get::<f64,_>("max_speed_m_s").unwrap_or(0.0),
                    "distance_m": r.try_get::<f64,_>("distance_m").unwrap_or(0.0),
                    "seconds_since_midnight": r.try_get::<f64,_>("seconds_since_midnight").unwrap_or(0.0),
                    "intensity_category": r.try_get::<String,_>("intensity_category").unwrap_or_default()
                })
            })
            .collect();

        return Json(json!({"events": events}));
    }

    // Summary (default)
    let sql_summary = format!(
        r#"{base}
SELECT
  ROW_NUMBER() OVER (ORDER BY player_display_name) AS id,
  player_display_name,
  SUM(CASE WHEN event_type = 'accel_potential' THEN 1 ELSE 0 END)::bigint AS total_accel_events,
  SUM(CASE WHEN event_type = 'accel_potential' AND intensity_category = 'low' THEN 1 ELSE 0 END)::bigint AS accel_low,
  SUM(CASE WHEN event_type = 'accel_potential' AND intensity_category = 'medium' THEN 1 ELSE 0 END)::bigint AS accel_medium,
  SUM(CASE WHEN event_type = 'accel_potential' AND intensity_category = 'high' THEN 1 ELSE 0 END)::bigint AS accel_high,
  SUM(CASE WHEN event_type = 'decel_potential' THEN 1 ELSE 0 END)::bigint AS total_decel_events,
  SUM(CASE WHEN event_type = 'decel_potential' AND intensity_category = 'low' THEN 1 ELSE 0 END)::bigint AS decel_low,
  SUM(CASE WHEN event_type = 'decel_potential' AND intensity_category = 'medium' THEN 1 ELSE 0 END)::bigint AS decel_medium,
  SUM(CASE WHEN event_type = 'decel_potential' AND intensity_category = 'high' THEN 1 ELSE 0 END)::bigint AS decel_high,
  ROUND(SUM(distance_m)::numeric, 3)::double precision AS total_distance_m,
  ROUND(SUM(duration_s)::numeric, 3)::double precision AS total_time_s
FROM classified
GROUP BY player_display_name
ORDER BY player_display_name"#,
        base = base_cte
    );

    let rows = match sqlx::query(&sql_summary)
        .bind(s1)
        .bind(e1)
        .bind(s2)
        .bind(e2)
        .fetch_all(&pool)
        .await
    {
        Ok(r) => r,
        Err(e) => return Json(json!({"accelerations": [], "error": format!("db error: {}", e)})),
    };

    let out: Vec<Value> = rows
        .into_iter()
        .map(|r| {
            let id = r.try_get::<i64, _>("id").unwrap_or(0);
            let name = r.try_get::<String, _>("player_display_name").unwrap_or_default();
            let v1 = r.try_get::<i64, _>("total_accel_events").unwrap_or(0) as f64;
            let v2 = r.try_get::<i64, _>("accel_low").unwrap_or(0) as f64;
            let v3 = r.try_get::<i64, _>("accel_medium").unwrap_or(0) as f64;
            let v4 = r.try_get::<i64, _>("accel_high").unwrap_or(0) as f64;
            let v5 = r.try_get::<i64, _>("total_decel_events").unwrap_or(0) as f64;
            let v6 = r.try_get::<i64, _>("decel_low").unwrap_or(0) as f64;
            let v7 = r.try_get::<i64, _>("decel_medium").unwrap_or(0) as f64;
            let v8 = r.try_get::<i64, _>("decel_high").unwrap_or(0) as f64;
            let v9 = r.try_get::<f64, _>("total_distance_m").unwrap_or(0.0);
            let v10 = r.try_get::<f64, _>("total_time_s").unwrap_or(0.0);
            json!({
                "id": id,
                "player_display_name": name,
                "values": [v1, v2, v3, v4, v5, v6, v7, v8, v9, v10]
            })
        })
        .collect();

    Json(json!({"accelerations": out}))
}

/// GET /match/table/:table_name/sprints
/// Computes per-player sprint events filtered by manual match periods
pub async fn get_sprint_events_full(
    State(pool): State<PgPool>,
    Path(table_name): Path<String>,
) -> Json<Value> {
    let view_name = format!("{}_sql_player_gemini_processed_view", table_name);

    // Fetch manual period boundaries
    let periods_row = sqlx::query(
        r#"
        SELECT 
            manual_first_half_start AS s1,
            manual_first_half_end   AS e1,
            manual_second_half_start AS s2,
            manual_second_half_end   AS e2
        FROM match_periods
        WHERE match_name = $1
        "#,
    )
    .bind(&table_name)
    .fetch_one(&pool)
    .await;

    let (s1, e1, s2, e2) = match periods_row {
        Ok(r) => {
            let s1: Option<i32> = r.try_get("s1").ok();
            let e1: Option<i32> = r.try_get("e1").ok();
            let s2: Option<i32> = r.try_get("s2").ok();
            let e2: Option<i32> = r.try_get("e2").ok();
            if let (Some(s1), Some(e1), Some(s2), Some(e2)) = (s1, e1, s2, e2) {
                (s1 as f64, e1 as f64, s2 as f64, e2 as f64)
            } else {
                return Json(json!({"sprints": [], "error": "manual periods not available for this match"}));
            }
        }
        Err(_) => {
            return Json(json!({"sprints": [], "error": "manual periods not found for this match"}));
        }
    };

    // Build sprint CTE pipeline (player_display_name partition)
    let base_cte = format!(
        r#"
WITH base AS (
  SELECT
    player_display_name,
    time,
    (speed::numeric) / 3.6 AS speed_ms,
    EXTRACT(EPOCH FROM to_timestamp(time, 'HH24:MI:SS.MS')::time) AS epoch_time,
    LAG(EXTRACT(EPOCH FROM to_timestamp(time, 'HH24:MI:SS.MS')::time)) OVER (
      PARTITION BY player_display_name ORDER BY to_timestamp(time, 'HH24:MI:SS.MS')::time
    ) AS prev_epoch,
    LAG((speed::numeric) / 3.6) OVER (
      PARTITION BY player_display_name ORDER BY to_timestamp(time, 'HH24:MI:SS.MS')::time
    ) AS prev_speed_ms
  FROM public.{view}
),
filtered_base AS (
  SELECT * FROM base
  WHERE (epoch_time BETWEEN $1 AND $2) OR (epoch_time BETWEEN $3 AND $4)
),
delta AS (
  SELECT
    player_display_name,
    time,
    speed_ms,
    prev_speed_ms,
    COALESCE(
      CASE
        WHEN prev_epoch IS NULL THEN 0
        WHEN epoch_time >= prev_epoch THEN epoch_time - prev_epoch
        ELSE epoch_time + 86400 - prev_epoch
      END,
    0) AS delta_time
  FROM filtered_base
),
acc_calc AS (
  SELECT
    player_display_name,
    time,
    speed_ms,
    delta_time,
    CASE
      WHEN delta_time > 0 AND prev_speed_ms IS NOT NULL THEN (speed_ms - prev_speed_ms) / delta_time
      ELSE 0
    END AS calc_acceleration
  FROM delta
),
filtered AS (
  SELECT
    player_display_name,
    time,
    speed_ms,
    delta_time,
    GREATEST(LEAST(calc_acceleration, 22), -22) AS acceleration_limited
  FROM acc_calc
  WHERE delta_time > 0 AND delta_time < 0.5
),
time_cum AS (
  SELECT
    *,
    SUM(delta_time) OVER (PARTITION BY player_display_name ORDER BY time) AS time_s
  FROM filtered
),
labeled AS (
  SELECT
    *,
    CASE
      WHEN speed_ms >= 5.556 THEN 'sprint_potential'
      ELSE 'none'
    END AS event_type
  FROM time_cum
),
grp_prep AS (
  SELECT
    *,
    LAG(event_type) OVER (PARTITION BY player_display_name ORDER BY time_s) AS prev_event_type
  FROM labeled
),
grp AS (
  SELECT
    *,
    SUM(CASE WHEN prev_event_type = event_type THEN 0 ELSE 1 END)
      OVER (PARTITION BY player_display_name ORDER BY time_s) AS grp
  FROM grp_prep
),
grouped AS (
  SELECT
    player_display_name,
    event_type,
    grp,
    MIN(time) AS start_time_text,
    MAX(time) AS end_time_text,
    MIN(time_s) AS start_time_s,
    MAX(time_s) AS end_time_s,
    SUM(delta_time) AS duration_s,
    MAX(speed_ms) AS max_speed,
    MAX(acceleration_limited) AS max_acc,
    MIN(acceleration_limited) AS min_acc,
    SUM(speed_ms * delta_time) AS distance_m
  FROM grp
  GROUP BY player_display_name, event_type, grp
),
events AS (
  SELECT
    player_display_name,
    event_type,
    start_time_text,
    end_time_text,
    start_time_s,
    end_time_s,
    duration_s,
    max_speed,
    max_acc,
    distance_m
  FROM grouped
  WHERE event_type = 'sprint_potential'
),
filtered_events AS (
  SELECT *
  FROM events
  WHERE max_speed >= 8.333 AND duration_s >= 2
),
classified AS (
  SELECT
    *,
    CASE
      WHEN max_speed >= 9.722 AND duration_s >= 3 THEN 'elite'
      WHEN max_speed >= 8.333 AND duration_s >= 2 THEN 'high'
      WHEN max_speed >= 6.944 THEN 'moderate'
      ELSE 'low'
    END AS intensity_category
  FROM filtered_events
)
        "#,
        view = view_name
    );

    let sql_full = format!(
        r#"{base}
SELECT
  ROW_NUMBER() OVER (ORDER BY player_display_name, start_time_s) AS id,
  player_display_name,
  'sprint' AS sprint_type,
  start_time_text AS start_time,
  end_time_text AS end_time,
  ROUND(duration_s::numeric, 3)::double precision AS duration_s,
  ROUND(max_speed::numeric, 3)::double precision AS max_speed_m_s,
  ROUND(max_acc::numeric, 3)::double precision AS peak_acc_m_s2,
  ROUND(distance_m::numeric, 3)::double precision AS distance_m,
  EXTRACT(EPOCH FROM to_timestamp(start_time_text, 'HH24:MI:SS.MS')::time)::double precision AS seconds_since_midnight,
  intensity_category
FROM classified
ORDER BY player_display_name, start_time_s"#,
        base = base_cte
    );

    let rows = match sqlx::query(&sql_full)
        .bind(s1)
        .bind(e1)
        .bind(s2)
        .bind(e2)
        .fetch_all(&pool)
        .await
    {
        Ok(r) => r,
        Err(e) => return Json(json!({"sprints": [], "error": format!("db error: {}", e)})),
    };

    let sprints: Vec<Value> = rows
        .into_iter()
        .map(|r| {
            json!({
                "id": r.try_get::<i64,_>("id").unwrap_or(0),
                "player_display_name": r.try_get::<String,_>("player_display_name").unwrap_or_default(),
                "sprint_type": r.try_get::<String,_>("sprint_type").unwrap_or_else(|_| "sprint".to_string()),
                "start_time": r.try_get::<String,_>("start_time").unwrap_or_default(),
                "end_time": r.try_get::<String,_>("end_time").unwrap_or_default(),
                "duration_s": r.try_get::<f64,_>("duration_s").unwrap_or(0.0),
                "max_speed_m_s": r.try_get::<f64,_>("max_speed_m_s").unwrap_or(0.0),
                "peak_acc_m_s2": r.try_get::<f64,_>("peak_acc_m_s2").unwrap_or(0.0),
                "distance_m": r.try_get::<f64,_>("distance_m").unwrap_or(0.0),
                "seconds_since_midnight": r.try_get::<f64,_>("seconds_since_midnight").unwrap_or(0.0),
                "intensity_category": r.try_get::<String,_>("intensity_category").unwrap_or_default()
            })
        })
        .collect();

    Json(json!({"sprints": sprints}))
}

/// GET /match/table/:table_name/sharp-angles
/// Detect sharp turns (angle >= 40 deg, in-distance ~5m, out-distance ~4m) filtered by manual periods
pub async fn get_sharp_angles(
    State(pool): State<PgPool>,
    Path(table_name): Path<String>,
) -> Json<Value> {
    let view_name = format!("{}_sql_player_gemini_processed_view", table_name);

    // Fetch manual period boundaries
    let periods_row = sqlx::query(
        r#"
        SELECT 
            manual_first_half_start AS s1,
            manual_first_half_end   AS e1,
            manual_second_half_start AS s2,
            manual_second_half_end   AS e2
        FROM match_periods
        WHERE match_name = $1
        "#,
    )
    .bind(&table_name)
    .fetch_one(&pool)
    .await;

    let (s1, e1, s2, e2) = match periods_row {
        Ok(r) => {
            let s1: Option<i32> = r.try_get("s1").ok();
            let e1: Option<i32> = r.try_get("e1").ok();
            let s2: Option<i32> = r.try_get("s2").ok();
            let e2: Option<i32> = r.try_get("e2").ok();
            if let (Some(s1), Some(e1), Some(s2), Some(e2)) = (s1, e1, s2, e2) {
                (s1 as f64, e1 as f64, s2 as f64, e2 as f64)
            } else {
                return Json(json!({"sharp_angles": [], "error": "manual periods not available for this match"}));
            }
        }
        Err(_) => {
            return Json(json!({"sharp_angles": [], "error": "manual periods not found for this match"}));
        }
    };

    let base_cte = format!(
        r#"
WITH base AS (
  SELECT
    player_display_name,
    to_timestamp(time, 'HH24:MI:SS.MS')::time AS t,
    COALESCE((seconds_since_midnight)::double precision, EXTRACT(EPOCH FROM to_timestamp(time, 'HH24:MI:SS.MS')::time)) AS elapsed_time,
    lat,
    lon,
    ((speed::numeric) / 3.6) AS speed_ms
  FROM public.{view}
),
filtered_speed AS (
  SELECT * FROM base WHERE speed_ms >= 5.5
),
filtered_periods AS (
  SELECT * FROM filtered_speed WHERE (elapsed_time BETWEEN $1 AND $2) OR (elapsed_time BETWEEN $3 AND $4)
),
player_data_with_coordinates AS (
  SELECT
    player_display_name,
    elapsed_time,
    lat,
    lon,
    LAG(lat, 9)  OVER (PARTITION BY player_display_name ORDER BY elapsed_time) AS in_start_lat,
    LAG(lon, 9)  OVER (PARTITION BY player_display_name ORDER BY elapsed_time) AS in_start_lon,
    LEAD(lat, 7) OVER (PARTITION BY player_display_name ORDER BY elapsed_time) AS out_end_lat,
    LEAD(lon, 7) OVER (PARTITION BY player_display_name ORDER BY elapsed_time) AS out_end_lon,
    LAG(elapsed_time, 9)  OVER (PARTITION BY player_display_name ORDER BY elapsed_time) AS start_time,
    LEAD(elapsed_time, 7) OVER (PARTITION BY player_display_name ORDER BY elapsed_time) AS finish_time
  FROM filtered_periods
),
turn_analysis AS (
  SELECT
    player_display_name,
    elapsed_time,
    start_time,
    finish_time,
    -- Haversine distances in meters
    6371000 * 2 * ASIN(
        SQRT(
            POWER(SIN(RADIANS(lat - in_start_lat) / 2), 2) +
            COS(RADIANS(in_start_lat)) * COS(RADIANS(lat)) *
            POWER(SIN(RADIANS(lon - in_start_lon) / 2), 2)
        )
    ) AS actual_dist_in,
    6371000 * 2 * ASIN(
        SQRT(
            POWER(SIN(RADIANS(out_end_lat - lat) / 2), 2) +
            COS(RADIANS(lat)) * COS(RADIANS(out_end_lat)) *
            POWER(SIN(RADIANS(out_end_lon - lon) / 2), 2)
        )
    ) AS actual_dist_out,
    -- Bearings
    (
      ( (
          (DEGREES(ATAN2(
            SIN(RADIANS(out_end_lon - lon)) * COS(RADIANS(out_end_lat)),
            COS(RADIANS(lat)) * SIN(RADIANS(out_end_lat)) - SIN(RADIANS(lat)) * COS(RADIANS(out_end_lat)) * COS(RADIANS(out_end_lon - lon))
          )) + 360) % 360
        )
        - (
          ((DEGREES(ATAN2(
            SIN(RADIANS(lon - in_start_lon)) * COS(RADIANS(lat)),
            COS(RADIANS(in_start_lat)) * SIN(RADIANS(lat)) - SIN(RADIANS(in_start_lat)) * COS(RADIANS(lat)) * COS(RADIANS(lon - in_start_lon))
          )) + 360) % 360) + 180
        ) % 360 + 360
      ) % 360
    ) AS angle_degrees
  FROM player_data_with_coordinates
)
SELECT
  ROW_NUMBER() OVER (ORDER BY player_display_name, elapsed_time) AS id,
  player_display_name,
  elapsed_time AS seconds_since_midnight,
  start_time,
  finish_time,
  (finish_time - start_time) AS duration_seconds,
  angle_degrees,
  actual_dist_in,
  actual_dist_out
FROM turn_analysis
WHERE (angle_degrees <= 135 OR angle_degrees >= 225)
  AND actual_dist_in BETWEEN 4.5 AND 5.5
  AND actual_dist_out BETWEEN 3.5 AND 4.5
  AND start_time IS NOT NULL AND finish_time IS NOT NULL
ORDER BY player_display_name, elapsed_time
        "#,
        view = view_name
    );

    let rows = match sqlx::query(&base_cte)
        .bind(s1)
        .bind(e1)
        .bind(s2)
        .bind(e2)
        .fetch_all(&pool)
        .await
    {
        Ok(r) => r,
        Err(e) => return Json(json!({"sharp_angles": [], "error": format!("db error: {}", e)})),
    };

    let data: Vec<Value> = rows
        .into_iter()
        .map(|r| {
            json!({
                "id": r.try_get::<i64,_>("id").unwrap_or(0),
                "player_display_name": r.try_get::<String,_>("player_display_name").unwrap_or_default(),
                "seconds_since_midnight": r.try_get::<f64,_>("seconds_since_midnight").unwrap_or(0.0),
                "start_time": r.try_get::<f64,_>("start_time").unwrap_or(0.0),
                "finish_time": r.try_get::<f64,_>("finish_time").unwrap_or(0.0),
                "duration_seconds": r.try_get::<f64,_>("duration_seconds").unwrap_or(0.0),
                "angle_degrees": r.try_get::<f64,_>("angle_degrees").unwrap_or(0.0),
                "actual_dist_in": r.try_get::<f64,_>("actual_dist_in").unwrap_or(0.0),
                "actual_dist_out": r.try_get::<f64,_>("actual_dist_out").unwrap_or(0.0)
            })
        })
        .collect();

    Json(json!({"sharp_angles": data}))
}

