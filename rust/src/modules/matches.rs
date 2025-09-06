use axum::extract::Json;
use axum::extract::Path;
use axum::extract::State;
use chrono::{DateTime, FixedOffset, NaiveDateTime, Utc};
use serde_json::{json, Value};
use sqlx::Column;
use sqlx::Error;
use sqlx::PgPool;
use sqlx::Row;
use std::collections::HashMap;

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

pub async fn get_match_entries_with_centralized_time(
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

    // Now get all entries with centralized time
    let entries_query = format!(
        r#"
        WITH first_timestamps AS (
            SELECT 
                player_display_name,
                MIN(time) as first_time
            FROM "{}"
            GROUP BY player_display_name
        )
        SELECT 
            t.*,
            EXTRACT(EPOCH FROM (
                (to_timestamp(t.time, 'HH24:MI:SS.MS') - to_timestamp(ft.first_time, 'HH24:MI:SS.MS')) + 
                (to_timestamp(ft.first_time, 'HH24:MI:SS.MS') - to_timestamp('{}', 'HH24:MI:SS.MS'))
            ))::text as centralized_elapsed_time
        FROM "{}" t
        JOIN first_timestamps ft ON t.player_display_name = ft.player_display_name
        ORDER BY t.time
        "#,
        table_name,
        earliest_timestamp.format("%H:%M:%S.%f").to_string(),
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
            // Add centralized_elapsed_time first
            if let Ok(value) = row.try_get::<String, _>("centralized_elapsed_time") {
                if let Ok(num) = value.parse::<f64>() {
                    entry["centralized_elapsed_time"] = json!(num);
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
        if let (Some(player), Some(time)) = (
            entry["player_display_name"].as_str(),
            entry["centralized_elapsed_time"].as_f64(),
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
            a["centralized_elapsed_time"]
                .as_f64()
                .partial_cmp(&b["centralized_elapsed_time"].as_f64())
                .unwrap()
        });
        let mut last_time = None;
        for entry in entries {
            let time = entry["centralized_elapsed_time"].as_f64().unwrap();
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
    // 1. Leer todos los datos de la tabla del partido
    let query = format!("SELECT * FROM \"{}\" ORDER BY time", table_name);
    let rows = match sqlx::query(&query).fetch_all(&pool).await {
        Ok(r) => r,
        Err(e) => {
            return Json(json!({"error": format!("Error fetching match data: {}", e)}));
        }
    };
    if rows.is_empty() {
        return Json(json!({"error": "No data found in match table"}));
    }

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

    // 3. Calcular centralized_elapsed_time si no existe
    let has_centralized = columns.iter().any(|c| c == "centralized_elapsed_time");
    let mut min_time = None;
    if !has_centralized {
        // Buscar el mínimo 'time' (asumimos formato HH:MM:SS o HH:MM:SS.MS)
        min_time = data
            .iter()
            .filter_map(|row| row.get("time"))
            .filter_map(|v| v.as_str())
            .min()
            .map(|s| s.to_string());
        if let Some(ref min_time) = min_time {
            for row in data.iter_mut() {
                if let Some(time) = row.get("time").and_then(|v| v.as_str()) {
                    let secs = diff_in_seconds(min_time, time);
                    row.insert("centralized_elapsed_time".to_string(), Value::from(secs));
                }
            }
        }
    }

    // 4. Lógica de análisis de partido (fiel al notebook)
    // Parámetros del notebook
    let velocidad_partido = 5.9;
    let velocidad_partido_entretiempo = 11.0;
    let ventana_primer_tiempo = 10; // segundos
    let ventana_segundo_tiempo = 5; // segundos
    let ventana_entretiempo = 9 * 60; // 9 minutos en segundos
    let ventana_max_entretiempo = 15 * 60; // 15 minutos en segundos
    let duracion_segundo_tiempo = 45 * 60; // 45 minutos en segundos

    // Agrupar por segundo y calcular velocidad promedio por segundo
    let mut second_speed: HashMap<i64, Vec<f64>> = HashMap::new();
    for row in &data {
        if let (Some(sec), Some(speed)) = (
            row.get("centralized_elapsed_time").and_then(|v| v.as_f64()),
            row.get("speed").and_then(|v| v.as_f64()),
        ) {
            let sec = sec.floor() as i64;
            second_speed.entry(sec).or_default().push(speed);
        }
    }
    let mut second_avg_speed: Vec<(i64, f64)> = second_speed
        .iter()
        .map(|(sec, speeds)| {
            let avg = if speeds.is_empty() {
                0.0
            } else {
                speeds.iter().sum::<f64>() / speeds.len() as f64
            };
            (*sec, avg)
        })
        .collect();
    second_avg_speed.sort_by_key(|(sec, _)| *sec);

    // Detectar bloques de entretiempo (velocidad <= 11 durante al menos 9 minutos)
    let mut halftime_blocks = Vec::new();
    let mut current_block = Vec::new();
    for (sec, speed) in &second_avg_speed {
        if *speed <= velocidad_partido_entretiempo {
            current_block.push(*sec);
        } else {
            if current_block.len() as i64 >= ventana_entretiempo {
                halftime_blocks.push(current_block.clone());
            }
            current_block.clear();
        }
    }
    if current_block.len() as i64 >= ventana_entretiempo {
        halftime_blocks.push(current_block.clone());
    }
    // Tomar el primer bloque válido que no sea al principio
    let halftime_block = halftime_blocks
        .into_iter()
        .find(|block| !block.is_empty() && block[0] > 60) // evitar bloques al inicio
        .unwrap_or_default();
    let (halftime_start, halftime_end) = if !halftime_block.is_empty() {
        (halftime_block[0], *halftime_block.last().unwrap())
    } else {
        (0, 0)
    };

    // Detectar inicio del primer tiempo (primer bloque de velocidad > 5.9 durante 10+ segundos)
    let mut first_half_start = 0;
    let mut acc = 0;
    for (sec, speed) in &second_avg_speed {
        if *speed > velocidad_partido {
            acc += 1;
        } else {
            acc = 0;
        }
        if acc >= ventana_primer_tiempo {
            first_half_start = *sec - ventana_primer_tiempo + 1;
            break;
        }
    }
    // Fin del primer tiempo: inicio del entretiempo
    let first_half_end = halftime_start;

    // Detectar inicio del segundo tiempo (después del entretiempo, bloque de velocidad > 11 durante 5+ segundos)
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
    // Fin del segundo tiempo: 45 minutos después del inicio del segundo tiempo o cuando la velocidad baja sostenidamente
    let mut second_half_end = second_half_start + duracion_segundo_tiempo;
    acc = 0;
    for (sec, speed) in second_avg_speed.iter().filter(|(s, _)| *s > second_half_start) {
        if *speed <= velocidad_partido {
            acc += 1;
        } else {
            acc = 0;
        }
        if acc >= 10 {
            second_half_end = *sec;
            break;
        }
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
    "#;
    let _ = sqlx::query(insert_query)
        .bind(&table_name)
        .bind(first_half_start)
        .bind(first_half_end)
        .bind(second_half_start)
        .bind(second_half_end)
        .bind(halftime_start)
        .bind(halftime_end)
        .execute(&pool)
        .await;

    // Leer los valores manuales si existen
    let select_query = r#"
        SELECT * FROM match_periods WHERE match_name = $1
    "#;
    let row = sqlx::query(select_query)
        .bind(&table_name)
        .fetch_one(&pool)
        .await
        .ok();
    if let Some(row) = row {
        let detected_first_half_start: i64 = row.try_get("detected_first_half_start").unwrap_or(0);
        let detected_first_half_end: i64 = row.try_get("detected_first_half_end").unwrap_or(0);
        let detected_second_half_start: i64 = row.try_get("detected_second_half_start").unwrap_or(0);
        let detected_second_half_end: i64 = row.try_get("detected_second_half_end").unwrap_or(0);
        let detected_halftime_start: i64 = row.try_get("detected_halftime_start").unwrap_or(0);
        let detected_halftime_end: i64 = row.try_get("detected_halftime_end").unwrap_or(0);
        let manual_first_half_start: Option<i64> = row.try_get("manual_first_half_start").ok();
        let manual_first_half_end: Option<i64> = row.try_get("manual_first_half_end").ok();
        let manual_second_half_start: Option<i64> = row.try_get("manual_second_half_start").ok();
        let manual_second_half_end: Option<i64> = row.try_get("manual_second_half_end").ok();
        let manual_halftime_start: Option<i64> = row.try_get("manual_halftime_start").ok();
        let manual_halftime_end: Option<i64> = row.try_get("manual_halftime_end").ok();
        return Json(json!({
            "match_name": table_name,
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
        }));
    }
    Json(json!({"error": "Could not fetch match periods after insert/update"}))
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
