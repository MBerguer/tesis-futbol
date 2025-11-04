use axum::extract::State;
use axum::Json;
use chrono::{DateTime, Utc};
use serde::Serialize;
use serde_json::{json, Value};
use sqlx::{PgPool, Row};

#[derive(Debug, Serialize)]
pub struct WcsComparisonData {
    pub metric: String,
    pub match_average: f64,
    pub wcs_1min: f64,
    pub increase_1min_pct: f64,
}

#[derive(Debug, Serialize)]
pub struct PlayerWcsProfile {
    pub position: String,
    pub avg_1min_peak: f64,
    pub total_wcs_events: i64,
    pub player_count: i64,
}

#[derive(Debug, Serialize)]
pub struct WcsMatchInfo {
    pub match_name: String,
    pub match_date: Option<String>,
    pub player_count: i64,
    pub wcs_count: i64,
}

#[derive(Debug, Serialize)]
pub struct WcsComparisonByPosition {
    pub position: String,
    pub match_average: f64,
    pub wcs_1min: f64,
    pub increase_1min_pct: f64,
    pub player_count: i64,
}

#[derive(Debug, Serialize)]
pub struct WcsTrendByDate {
    pub match_date: String,
    pub position: String,
    pub avg_wcs_distance: f64,
    pub avg_match_distance: f64,
    pub event_count: i64,
}

pub async fn get_wcs_comparison_data(State(pool): State<PgPool>) -> Json<Value> {
    let result = sqlx::query(
        r#"
        WITH active_play_periods AS (
            SELECT 
                mp.match_name,
                mp.manual_first_half_start,
                mp.manual_first_half_end,
                mp.manual_second_half_start,
                mp.manual_second_half_end,
                ((mp.manual_first_half_end - mp.manual_first_half_start) + 
                 (mp.manual_second_half_end - mp.manual_second_half_start)) / 60.0 as active_minutes
            FROM match_periods mp
            WHERE mp.manual_first_half_start IS NOT NULL
              AND mp.match_name NOT LIKE '%_no_periods'
        ),
        player_match_distances AS (
            SELECT 
                amf.match_name,
                amf.player_display_name,
                app.active_minutes,
                SUM(amf.distancia_total_calc) as total_distance
            FROM all_matches_filtered_accelerations amf
            INNER JOIN active_play_periods app ON app.match_name = amf.match_name
            WHERE amf.speed >= 19.8 AND ((amf.seconds_since_midnight >= app.manual_first_half_start AND amf.seconds_since_midnight <= app.manual_first_half_end)
               OR (amf.seconds_since_midnight >= app.manual_second_half_start AND amf.seconds_since_midnight <= app.manual_second_half_end))
            GROUP BY amf.match_name, amf.player_display_name, app.active_minutes
        ),
        match_averages AS (
            SELECT 
                AVG(total_distance / active_minutes) as avg_distance_per_min
            FROM player_match_distances
            WHERE active_minutes > 0
        ),
        wcs_1min AS (
            SELECT 
                pwc.distance_covered / ((pwc.end_second - pwc.start_second) / 60.0) as distance_per_min
            FROM player_worst_cases_cache pwc
            WHERE pwc.match_name NOT LIKE '%_no_periods'
        )
        SELECT 
            (SELECT avg_distance_per_min FROM match_averages) as match_avg_distance,
            (SELECT AVG(distance_per_min) FROM wcs_1min) as wcs_1min_distance
        "#,
    )
    .fetch_one(&pool)
    .await;

    match result {
        Ok(row) => {
            let match_avg: Option<f64> = row.try_get("match_avg_distance").ok().flatten();
            let wcs_1: Option<f64> = row.try_get("wcs_1min_distance").ok().flatten();

            let match_avg = match_avg.unwrap_or(0.0);
            let wcs_1 = wcs_1.unwrap_or(0.0);

            let data = vec![WcsComparisonData {
                metric: "Total HSR Distance (>19.8 km/h)".to_string(),
                match_average: match_avg,
                wcs_1min: wcs_1,
                increase_1min_pct: if match_avg > 0.0 {
                    ((wcs_1 - match_avg) / match_avg) * 100.0
                } else {
                    0.0
                },
            }];

            Json(json!({
                "status": "ok",
                "data": data
            }))
        }
        Err(e) => {
            eprintln!("Error fetching WCS comparison data: {:?}", e);
            Json(json!({
                "status": "error",
                "message": format!("Database error: {}", e),
                "data": []
            }))
        }
    }
}

// Se guarda por la vista match_minutes_played
/* SELECT DISTINCT
      amf.match_name,
      amf.player_display_name,
      amf.player_id,
      COALESCE(
          (SELECT MIN(e.minute)
            FROM events e
            JOIN matches m ON m.match_id = e.match_id
            JOIN administrativo a ON a."Documento_de_Identidad" = e.player_id
            WHERE m.gps_table_name = amf.match_name
              AND a."player_gps_id" = amf.player_id
              AND e.type = 'sub_off'),
          90
      ) as minutes_played
  FROM all_matches_filtered_accelerations amf
  WHERE amf.match_name IS NOT NULL
    AND amf.player_id IS NOT NULL
*/
pub async fn get_player_wcs_profiles(State(pool): State<PgPool>) -> Json<Value> {
    let result = sqlx::query(
        r#"
        WITH player_minutes AS (
            SELECT 
                match_name,
                player_display_name,
                player_id,
                minutes_played
            FROM match_minutes_played
            WHERE match_name NOT LIKE '%_no_periods'
        ),
        wcs_by_player AS (
            SELECT 
                pwc.player_display_name,
                pwc.match_name,
                player_id,
                pwc.distance_covered as distance_per_min,
                minutes_played
            FROM player_worst_cases_cache pwc
            INNER JOIN player_minutes pm 
                ON pm.match_name = pwc.match_name 
                AND pm.player_display_name = pwc.player_display_name
            WHERE pwc.match_name NOT LIKE '%_no_periods'
        )
        SELECT 
            TRIM(a."Posicion") as position,
            AVG(wbp.distance_per_min) as avg_1min_peak,
            COUNT(*) as total_wcs_events,
            COUNT(DISTINCT wbp.player_display_name) as player_count
        FROM wcs_by_player wbp
        LEFT JOIN administrativo a ON a.player_gps_id = wbp.player_id
        WHERE a."Posicion" IS NOT NULL AND TRIM(a."Posicion") != ''
        GROUP BY TRIM(a."Posicion")
        ORDER BY avg_1min_peak DESC NULLS last
         "#,
    )
    .fetch_all(&pool)
    .await;

    match result {
        Ok(rows) => {
            let profiles: Vec<PlayerWcsProfile> = rows
                .iter()
                .map(|row| {
                    let position: Option<String> = row.try_get("position").ok().flatten();
                    let avg_1min: Option<f64> = row.try_get("avg_1min_peak").ok().flatten();
                    let total: Option<i64> = row.try_get("total_wcs_events").ok().flatten();
                    let player_count: Option<i64> = row.try_get("player_count").ok().flatten();

                    PlayerWcsProfile {
                        position: position.unwrap_or_else(|| "Unknown".to_string()),
                        avg_1min_peak: avg_1min.unwrap_or(0.0),
                        total_wcs_events: total.unwrap_or(0),
                        player_count: player_count.unwrap_or(0),
                    }
                })
                .collect();

            Json(json!({
                "status": "ok",
                "data": profiles,
                "metadata": {
                    "total_players": profiles.len()
                }
            }))
        }
        Err(e) => {
            eprintln!("Error fetching player WCS profiles: {:?}", e);
            Json(json!({
                "status": "error",
                "message": format!("Database error: {}", e),
                "data": []
            }))
        }
    }
}

pub async fn get_wcs_matches_info(State(pool): State<PgPool>) -> Json<Value> {
    let result = sqlx::query(
        r#"
        SELECT 
            pwc.match_name,
            m.match_date,
            COUNT(DISTINCT pwc.player_display_name) as player_count,
            COUNT(*) as wcs_count
        FROM player_worst_cases_cache pwc
        LEFT JOIN matches m ON m.gps_table_name = pwc.match_name
        WHERE pwc.match_name NOT LIKE '%_no_periods'
        GROUP BY pwc.match_name, m.match_date
        ORDER BY m.match_date DESC NULLS LAST, pwc.match_name
        "#,
    )
    .fetch_all(&pool)
    .await;

    match result {
        Ok(rows) => {
            let matches: Vec<WcsMatchInfo> = rows
                .iter()
                .map(|row| {
                    let match_name: Option<String> = row.try_get("match_name").ok().flatten();
                    let match_date: Option<DateTime<Utc>> =
                        row.try_get("match_date").ok().flatten();
                    let player_count: Option<i64> = row.try_get("player_count").ok().flatten();
                    let wcs_count: Option<i64> = row.try_get("wcs_count").ok().flatten();

                    WcsMatchInfo {
                        match_name: match_name.unwrap_or_default(),
                        match_date: match_date.map(|d| d.format("%Y-%m-%d").to_string()),
                        player_count: player_count.unwrap_or(0),
                        wcs_count: wcs_count.unwrap_or(0),
                    }
                })
                .collect();

            Json(json!({
                "status": "ok",
                "matches": matches,
                "metadata": {
                    "total_matches": matches.len()
                }
            }))
        }
        Err(e) => {
            eprintln!("Error fetching WCS matches info: {:?}", e);
            Json(json!({
                "status": "error",
                "message": format!("Database error: {}", e),
                "matches": []
            }))
        }
    }
}

pub async fn get_wcs_detailed_events(State(pool): State<PgPool>) -> Json<Value> {
    let result = sqlx::query(
        r#"
        SELECT 
            pwc.match_name,
            pwc.player_display_name,
            pwc.start_second,
            pwc.end_second,
            pwc.distance_covered,
            (pwc.end_second - pwc.start_second) as window_duration_sec,
            pwc.distance_covered / ((pwc.end_second - pwc.start_second) / 60.0) as distance_per_min,
            mp.manual_first_half_start,
            mp.manual_first_half_end,
            mp.manual_second_half_start,
            mp.manual_second_half_end,
            CASE 
                WHEN mp.manual_first_half_start IS NOT NULL 
                     AND pwc.start_second >= mp.manual_first_half_start 
                     AND pwc.start_second <= mp.manual_first_half_end 
                THEN ROUND((pwc.start_second - mp.manual_first_half_start) / 60.0)
                WHEN mp.manual_second_half_start IS NOT NULL 
                     AND pwc.start_second >= mp.manual_second_half_start 
                     AND pwc.start_second <= mp.manual_second_half_end 
                THEN 45 + ROUND((pwc.start_second - mp.manual_second_half_start) / 60.0)
                ELSE NULL
            END as match_minute,
            CASE 
                WHEN mp.manual_first_half_start IS NOT NULL 
                     AND pwc.start_second >= mp.manual_first_half_start 
                     AND pwc.start_second <= mp.manual_first_half_end 
                THEN 'First Half'
                WHEN mp.manual_second_half_start IS NOT NULL 
                     AND pwc.start_second >= mp.manual_second_half_start 
                     AND pwc.start_second <= mp.manual_second_half_end 
                THEN 'Second Half'
                ELSE 'Unknown'
            END as match_period,
            a."Posicion" as position
        FROM player_worst_cases_cache pwc
        LEFT JOIN match_periods mp ON mp.match_name = pwc.match_name
        LEFT JOIN match_minutes_played mm ON mm.match_name = pwc.match_name AND mm.player_display_name = pwc.player_display_name
        LEFT JOIN administrativo a ON a.player_gps_id = mm.player_id
        WHERE pwc.match_name NOT LIKE '%_no_periods'
        ORDER BY pwc.match_name, pwc.player_display_name, pwc.start_second
        "#,
    )
    .fetch_all(&pool)
    .await;

    match result {
        Ok(rows) => {
            let events: Vec<Value> = rows
                .iter()
                .map(|row| {
                    let match_name: Option<String> = row.try_get("match_name").ok().flatten();
                    let player_name: Option<String> =
                        row.try_get("player_display_name").ok().flatten();
                    let position: Option<String> = row.try_get("position").ok().flatten();
                    let start_second: Option<f64> = row.try_get("start_second").ok().flatten();
                    let end_second: Option<f64> = row.try_get("end_second").ok().flatten();
                    let window_duration: Option<f64> =
                        row.try_get("window_duration_sec").ok().flatten();
                    let distance_covered: Option<f64> =
                        row.try_get("distance_covered").ok().flatten();
                    let distance_per_min: Option<f64> =
                        row.try_get("distance_per_min").ok().flatten();
                    let match_minute: Option<f64> = row.try_get("match_minute").ok().flatten();
                    let match_period: Option<String> = row.try_get("match_period").ok().flatten();

                    json!({
                        "match_name": match_name,
                        "player_name": player_name,
                        "position": position,
                        "start_second": start_second,
                        "end_second": end_second,
                        "window_duration_sec": window_duration,
                        "distance_covered": distance_covered,
                        "distance_per_min": distance_per_min,
                        "match_minute": match_minute,
                        "match_period": match_period
                    })
                })
                .collect();

            Json(json!({
                "status": "ok",
                "events": events,
                "metadata": {
                    "total_events": events.len()
                }
            }))
        }
        Err(e) => {
            eprintln!("Error fetching WCS detailed events: {:?}", e);
            Json(json!({
                "status": "error",
                "message": format!("Database error: {}", e),
                "events": []
            }))
        }
    }
}

pub async fn get_wcs_comparison_by_position(State(pool): State<PgPool>) -> Json<Value> {
    let result = sqlx::query(
        r#"
        WITH active_play_periods AS (
            SELECT 
                mp.match_name,
                mp.manual_first_half_start,
                mp.manual_first_half_end,
                mp.manual_second_half_start,
                mp.manual_second_half_end,
                ((mp.manual_first_half_end - mp.manual_first_half_start) + 
                 (mp.manual_second_half_end - mp.manual_second_half_start)) / 60.0 as active_minutes
            FROM match_periods mp
            WHERE mp.manual_first_half_start IS NOT NULL
              AND mp.match_name NOT LIKE '%_no_periods'
        ),
        player_match_distances AS (
            SELECT 
                amf.match_name,
                amf.player_display_name,
                amf.player_id,
                app.active_minutes,
                SUM(amf.distancia_total_calc) as total_distance
            FROM all_matches_filtered_accelerations amf
            INNER JOIN active_play_periods app ON app.match_name = amf.match_name
            WHERE amf.speed >= 19.8 AND ((amf.seconds_since_midnight >= app.manual_first_half_start AND amf.seconds_since_midnight <= app.manual_first_half_end)
               OR (amf.seconds_since_midnight >= app.manual_second_half_start AND amf.seconds_since_midnight <= app.manual_second_half_end))
            GROUP BY amf.match_name, amf.player_display_name, amf.player_id, app.active_minutes
        ),
        match_averages_by_position AS (
            SELECT 
                TRIM(a."Posicion") as position,
                AVG(pmd.total_distance / pmd.active_minutes) as avg_distance_per_min,
                COUNT(DISTINCT pmd.player_display_name) as player_count
            FROM player_match_distances pmd
            LEFT JOIN administrativo a ON a.player_gps_id = pmd.player_id
            WHERE pmd.active_minutes > 0
              AND a."Posicion" IS NOT NULL 
              AND TRIM(a."Posicion") != ''
            GROUP BY TRIM(a."Posicion")
        ),
        wcs_with_player_id AS (
            SELECT 
                pwc.player_display_name,
                pwc.match_name,
                pwc.distance_covered,
                pwc.start_second,
                pwc.end_second,
                mmp.player_id
            FROM player_worst_cases_cache pwc
            INNER JOIN match_minutes_played mmp 
                ON mmp.match_name = pwc.match_name 
                AND mmp.player_display_name = pwc.player_display_name
            WHERE pwc.match_name NOT LIKE '%_no_periods'
        ),
        wcs_by_position AS (
            SELECT 
                TRIM(a."Posicion") as position,
                AVG(w.distance_covered / ((w.end_second - w.start_second) / 60.0)) as avg_wcs_distance_per_min
            FROM wcs_with_player_id w
            LEFT JOIN administrativo a ON a.player_gps_id = w.player_id
            WHERE a."Posicion" IS NOT NULL 
              AND TRIM(a."Posicion") != ''
            GROUP BY TRIM(a."Posicion")
        )
        SELECT 
            ma.position,
            ma.avg_distance_per_min as match_avg,
            COALESCE(w.avg_wcs_distance_per_min, 0) as wcs_avg,
            ma.player_count
        FROM match_averages_by_position ma
        LEFT JOIN wcs_by_position w ON w.position = ma.position
        ORDER BY ma.position
        "#,
    )
    .fetch_all(&pool)
    .await;

    match result {
        Ok(rows) => {
            let data: Vec<WcsComparisonByPosition> = rows
                .iter()
                .map(|row| {
                    let position: Option<String> = row.try_get("position").ok().flatten();
                    let match_avg: Option<f64> = row.try_get("match_avg").ok().flatten();
                    let wcs_avg: Option<f64> = row.try_get("wcs_avg").ok().flatten();
                    let player_count: Option<i64> = row.try_get("player_count").ok().flatten();

                    let match_avg = match_avg.unwrap_or(0.0);
                    let wcs_avg = wcs_avg.unwrap_or(0.0);

                    WcsComparisonByPosition {
                        position: position.unwrap_or_else(|| "Unknown".to_string()),
                        match_average: match_avg,
                        wcs_1min: wcs_avg,
                        increase_1min_pct: if match_avg > 0.0 {
                            ((wcs_avg - match_avg) / match_avg) * 100.0
                        } else {
                            0.0
                        },
                        player_count: player_count.unwrap_or(0),
                    }
                })
                .collect();

            Json(json!({
                "status": "ok",
                "data": data
            }))
        }
        Err(e) => {
            eprintln!("Error fetching WCS comparison by position: {:?}", e);
            Json(json!({
                "status": "error",
                "message": format!("Database error: {}", e),
                "data": []
            }))
        }
    }
}

pub async fn get_wcs_trends_by_date(State(pool): State<PgPool>) -> Json<Value> {
    let result = sqlx::query(
        r#"
        WITH active_play_periods AS (
            SELECT 
                mp.match_name,
                mp.manual_first_half_start,
                mp.manual_first_half_end,
                mp.manual_second_half_start,
                mp.manual_second_half_end,
                ((mp.manual_first_half_end - mp.manual_first_half_start) + 
                 (mp.manual_second_half_end - mp.manual_second_half_start)) / 60.0 as active_minutes
            FROM match_periods mp
            WHERE mp.manual_first_half_start IS NOT NULL
              AND mp.match_name NOT LIKE '%_no_periods'
        ),
        player_match_distances AS (
            SELECT 
                amf.match_name,
                amf.player_display_name,
                amf.player_id,
                SUM(amf.distancia_total_calc) as total_hsr_distance
            FROM all_matches_filtered_accelerations amf
            INNER JOIN active_play_periods app ON app.match_name = amf.match_name
            WHERE amf.speed >= 19.8 AND (
              ((amf.seconds_since_midnight >= app.manual_first_half_start AND amf.seconds_since_midnight <= app.manual_first_half_end)
              OR (amf.seconds_since_midnight >= app.manual_second_half_start AND amf.seconds_since_midnight <= app.manual_second_half_end))
            )
            GROUP BY amf.match_name, amf.player_display_name, amf.player_id
        ),
        match_avg_by_date_position AS (
            SELECT 
                m.match_date,
                TRIM(a."Posicion") as position,
                AVG(pmd.total_hsr_distance / mmp.minutes_played) as avg_distance_per_min
            FROM player_match_distances pmd
            INNER JOIN matches m ON m.gps_table_name = pmd.match_name
            INNER JOIN match_minutes_played mmp 
                ON mmp.match_name = pmd.match_name 
                AND mmp.player_display_name = pmd.player_display_name
            LEFT JOIN administrativo a ON a.player_gps_id = pmd.player_id
            WHERE mmp.minutes_played > 0
              AND a."Posicion" IS NOT NULL 
              AND TRIM(a."Posicion") != ''
              AND m.match_date IS NOT NULL
            GROUP BY m.match_date, TRIM(a."Posicion")
        ),
        wcs_with_player_id AS (
            SELECT 
                pwc.player_display_name,
                pwc.match_name,
                pwc.distance_covered,
                pwc.start_second,
                pwc.end_second,
                mmp.player_id
            FROM player_worst_cases_cache pwc
            INNER JOIN match_minutes_played mmp 
                ON mmp.match_name = pwc.match_name 
                AND mmp.player_display_name = pwc.player_display_name
            WHERE pwc.match_name NOT LIKE '%_no_periods'
        ),
        wcs_by_date_position AS (
            SELECT 
                m.match_date,
                TRIM(a."Posicion") as position,
                AVG(w.distance_covered / ((w.end_second - w.start_second) / 60.0)) as avg_wcs_distance_per_min,
                COUNT(*) as event_count
            FROM wcs_with_player_id w
            INNER JOIN matches m ON m.gps_table_name = w.match_name
            LEFT JOIN administrativo a ON a.player_gps_id = w.player_id
            WHERE a."Posicion" IS NOT NULL 
              AND TRIM(a."Posicion") != ''
              AND m.match_date IS NOT NULL
            GROUP BY m.match_date, TRIM(a."Posicion")
        )
        SELECT 
            TO_CHAR(wdp.match_date, 'YYYY-MM-DD') as match_date,
            wdp.position,
            wdp.avg_wcs_distance_per_min as avg_wcs_distance,
            COALESCE(madp.avg_distance_per_min, 0) as avg_match_distance,
            wdp.event_count
        FROM wcs_by_date_position wdp
        LEFT JOIN match_avg_by_date_position madp 
            ON madp.match_date = wdp.match_date 
            AND madp.position = wdp.position
        ORDER BY wdp.match_date, wdp.position
        "#,
    )
    .fetch_all(&pool)
    .await;

    match result {
        Ok(rows) => {
            let data: Vec<WcsTrendByDate> = rows
                .iter()
                .map(|row| {
                    let match_date: Option<String> = row.try_get("match_date").ok().flatten();
                    let position: Option<String> = row.try_get("position").ok().flatten();
                    let avg_wcs: Option<f64> = row.try_get("avg_wcs_distance").ok().flatten();
                    let avg_match: Option<f64> = row.try_get("avg_match_distance").ok().flatten();
                    let event_count: Option<i64> = row.try_get("event_count").ok().flatten();

                    WcsTrendByDate {
                        match_date: match_date.unwrap_or_else(|| "Unknown".to_string()),
                        position: position.unwrap_or_else(|| "Unknown".to_string()),
                        avg_wcs_distance: avg_wcs.unwrap_or(0.0),
                        avg_match_distance: avg_match.unwrap_or(0.0),
                        event_count: event_count.unwrap_or(0),
                    }
                })
                .collect();

            Json(json!({
                "status": "ok",
                "data": data
            }))
        }
        Err(e) => {
            eprintln!("Error fetching WCS trends by date: {:?}", e);
            Json(json!({
                "status": "error",
                "message": format!("Database error: {}", e),
                "data": []
            }))
        }
    }
}
