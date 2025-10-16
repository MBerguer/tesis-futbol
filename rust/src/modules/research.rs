use axum::extract::{Query, State};
use axum::Json;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sqlx::PgPool;

const Z2_MIN_KMH: f64 = 19.8;
const Z2_MAX_KMH: f64 = 25.2;
const SPRINT_THRESHOLD_KMH: f64 = 25.2;
const HIGH_ACCEL_THRESHOLD: f64 = 3.0;
const NORMALIZED_MATCH_DURATION: f64 = 100.0;

// Unified endpoint that computes all chart data in a single query
pub async fn get_all_charts_data(
    State(pool): State<PgPool>,
    Query(params): Query<TimeSeriesParams>,
) -> Json<Value> {
    let min_minutes = params.min_minutes_played.unwrap_or(85.0);

    let query = r#"
        WITH match_durations AS (
            SELECT 
                match_name,
                MIN(seconds_since_midnight) as match_start,
                MAX(seconds_since_midnight) as match_end,
                (MAX(seconds_since_midnight) - MIN(seconds_since_midnight)) / 60.0 as total_duration_minutes
            FROM all_matches_filtred
            WHERE match_name IS NOT NULL AND seconds_since_midnight IS NOT NULL
            GROUP BY match_name
        ),
        player_minutes AS (
            SELECT 
                amf.match_name,
                amf.player_display_name,
                (MAX(amf.seconds_since_midnight) - MIN(amf.seconds_since_midnight)) / 60.0 as minutes_played,
                md.total_duration_minutes,
                md.match_start,
                md.match_end
            FROM all_matches_filtred amf
            JOIN match_durations md ON md.match_name = amf.match_name
            WHERE amf.seconds_since_midnight IS NOT NULL
            GROUP BY amf.match_name, amf.player_display_name, md.total_duration_minutes, md.match_start, md.match_end
            HAVING (MAX(amf.seconds_since_midnight) - MIN(amf.seconds_since_midnight)) / 60.0 >= $1
        ),
        normalized_data AS (
            SELECT 
                amf.player_display_name,
                amf.match_name,
                FLOOR(((amf.seconds_since_midnight - pm.match_start) / (pm.match_end - pm.match_start)) * $2)::integer as normalized_minute,
                amf.speed,
                amf.player_acceleration_final_smooth,
                (amf.speed / 3.6) * 0.1 as distance_per_sample,
                CASE 
                    WHEN amf.speed >= $3 AND amf.speed < $4 THEN (amf.speed / 3.6) * 0.1
                    ELSE 0 
                END as z2_distance_sample,
                CASE 
                    WHEN amf.speed >= $4 THEN (amf.speed / 3.6) * 0.1
                    ELSE 0 
                END as sprint_distance_sample,
                CASE 
                    WHEN ABS(amf.player_acceleration_final_smooth) >= $5 THEN 1
                    ELSE 0
                END as high_intensity_event,
                CASE 
                    WHEN amf.player_acceleration_final_smooth > 0 THEN amf.player_acceleration_final_smooth
                    ELSE 0
                END as acceleration_value,
                CASE 
                    WHEN amf.player_acceleration_final_smooth < 0 THEN ABS(amf.player_acceleration_final_smooth)
                    ELSE 0
                END as deceleration_value
            FROM all_matches_filtred amf
            JOIN player_minutes pm 
                ON pm.match_name = amf.match_name 
                AND pm.player_display_name = amf.player_display_name
            WHERE amf.seconds_since_midnight IS NOT NULL
        ),
        player_minute_aggregates AS (
            SELECT 
                player_display_name,
                match_name,
                normalized_minute,
                SUM(distance_per_sample) as player_distance,
                SUM(z2_distance_sample) as player_z2_distance,
                SUM(sprint_distance_sample) as player_sprint_distance,
                SUM(high_intensity_event) as player_high_intensity,
                AVG(CASE WHEN acceleration_value > 0 THEN acceleration_value END) as player_acceleration,
                AVG(CASE WHEN deceleration_value > 0 THEN deceleration_value END) as player_deceleration
            FROM normalized_data
            WHERE normalized_minute >= 0 AND normalized_minute < $2
            GROUP BY player_display_name, match_name, normalized_minute
        ),
        aggregated_by_minute AS (
            SELECT 
                normalized_minute,
                AVG(player_distance)::float as avg_distance,
                COUNT(CASE WHEN player_distance > 0 THEN 1 END) as dtr_count,
                AVG(player_z2_distance)::float as avg_z2_distance,
                COUNT(CASE WHEN player_z2_distance > 0 THEN 1 END) as z2_count,
                AVG(player_sprint_distance)::float as avg_sprint_distance,
                COUNT(CASE WHEN player_sprint_distance > 0 THEN 1 END) as sprint_count,
                AVG(player_high_intensity)::float as avg_high_intensity,
                COUNT(*) as hi_count,
                AVG(player_acceleration)::float as avg_acceleration,
                COUNT(CASE WHEN player_acceleration IS NOT NULL THEN 1 END) as accel_count,
                AVG(player_deceleration)::float as avg_deceleration,
                COUNT(CASE WHEN player_deceleration IS NOT NULL THEN 1 END) as decel_count
            FROM player_minute_aggregates
            GROUP BY normalized_minute
        )
        SELECT 
            normalized_minute,
            avg_distance as avg_dtr,
            dtr_count,
            avg_z2_distance as avg_z2,
            z2_count,
            avg_sprint_distance as avg_sprint,
            sprint_count,
            avg_high_intensity,
            hi_count,
            avg_acceleration,
            accel_count,
            avg_deceleration,
            decel_count,
            (avg_acceleration::float / NULLIF(avg_deceleration, 0)::float) as acdc_ratio
        FROM aggregated_by_minute
        ORDER BY normalized_minute
    "#;

    match sqlx::query_as::<
        _,
        (
            i32,
            Option<f64>,
            i64,
            Option<f64>,
            i64,
            Option<f64>,
            i64,
            Option<f64>,
            i64,
            Option<f64>,
            i64,
            Option<f64>,
            i64,
            Option<f64>,
        ),
    >(query)
    .bind(min_minutes)
    .bind(NORMALIZED_MATCH_DURATION)
    .bind(Z2_MIN_KMH)
    .bind(SPRINT_THRESHOLD_KMH)
    .bind(HIGH_ACCEL_THRESHOLD)
    .fetch_all(&pool)
    .await
    {
        Ok(rows) => {
            let mut dtr_data = Vec::new();
            let mut z2_data = Vec::new();
            let mut sprint_data = Vec::new();
            let mut high_accel_data = Vec::new();
            let mut accel_decel_data = Vec::new();
            let mut ratio_data = Vec::new();

            for (
                minute,
                dtr,
                dtr_cnt,
                z2,
                z2_cnt,
                sprint,
                sprint_cnt,
                hi,
                hi_cnt,
                accel,
                accel_cnt,
                decel,
                decel_cnt,
                ratio,
            ) in rows
            {
                dtr_data.push(json!({
                    "normalized_minute": minute,
                    "distance_m_per_min": dtr.unwrap_or(0.0),
                    "sample_count": dtr_cnt
                }));

                z2_data.push(json!({
                    "normalized_minute": minute,
                    "distance_m_per_min": z2.unwrap_or(0.0),
                    "sample_count": z2_cnt
                }));

                sprint_data.push(json!({
                    "normalized_minute": minute,
                    "distance_m_per_min": sprint.unwrap_or(0.0),
                    "sample_count": sprint_cnt
                }));

                high_accel_data.push(json!({
                    "normalized_minute": minute,
                    "count_per_min": hi.unwrap_or(0.0),
                    "sample_count": hi_cnt
                }));

                accel_decel_data.push(json!({
                    "normalized_minute": minute,
                    "avg_acceleration": accel.unwrap_or(0.0),
                    "avg_deceleration": decel.unwrap_or(0.0),
                    "accel_count": accel_cnt,
                    "decel_count": decel_cnt
                }));

                ratio_data.push(json!({
                    "normalized_minute": minute,
                    "ratio": ratio.unwrap_or(1.0),
                    "accel_count": accel_cnt,
                    "decel_count": decel_cnt
                }));
            }

            // Calculate medians for metadata
            let dtr_median = if !dtr_data.is_empty() {
                dtr_data
                    .iter()
                    .filter_map(|v| v.get("distance_m_per_min").and_then(|d| d.as_f64()))
                    .sum::<f64>()
                    / dtr_data.len() as f64
            } else {
                0.0
            };

            let z2_median = if !z2_data.is_empty() {
                z2_data
                    .iter()
                    .filter_map(|v| v.get("distance_m_per_min").and_then(|d| d.as_f64()))
                    .sum::<f64>()
                    / z2_data.len() as f64
            } else {
                0.0
            };

            let sprint_median = if !sprint_data.is_empty() {
                sprint_data
                    .iter()
                    .filter_map(|v| v.get("distance_m_per_min").and_then(|d| d.as_f64()))
                    .sum::<f64>()
                    / sprint_data.len() as f64
            } else {
                0.0
            };

            let high_accel_median = if !high_accel_data.is_empty() {
                high_accel_data
                    .iter()
                    .filter_map(|v| v.get("count_per_min").and_then(|d| d.as_f64()))
                    .sum::<f64>()
                    / high_accel_data.len() as f64
            } else {
                0.0
            };

            let (accel_median, decel_median) = if !accel_decel_data.is_empty() {
                let accel = accel_decel_data
                    .iter()
                    .filter_map(|v| v.get("avg_acceleration").and_then(|d| d.as_f64()))
                    .sum::<f64>()
                    / accel_decel_data.len() as f64;
                let decel = accel_decel_data
                    .iter()
                    .filter_map(|v| v.get("avg_deceleration").and_then(|d| d.as_f64()))
                    .sum::<f64>()
                    / accel_decel_data.len() as f64;
                (accel, decel)
            } else {
                (0.0, 0.0)
            };

            let ratio_median = if !ratio_data.is_empty() {
                ratio_data
                    .iter()
                    .filter_map(|v| v.get("ratio").and_then(|d| d.as_f64()))
                    .sum::<f64>()
                    / ratio_data.len() as f64
            } else {
                1.0
            };

            Json(json!({
                "dtr": {
                    "data": dtr_data,
                    "metadata": {
                        "min_minutes_played": min_minutes,
                        "normalized_duration": NORMALIZED_MATCH_DURATION,
                        "median": dtr_median
                    }
                },
                "z2": {
                    "data": z2_data,
                    "metadata": {
                        "zone": format!("{}-{} km/h", Z2_MIN_KMH, Z2_MAX_KMH),
                        "min_minutes_played": min_minutes,
                        "normalized_duration": NORMALIZED_MATCH_DURATION,
                        "median": z2_median
                    }
                },
                "sprint": {
                    "data": sprint_data,
                    "metadata": {
                        "zone": format!(">{} km/h", SPRINT_THRESHOLD_KMH),
                        "threshold_kmh": SPRINT_THRESHOLD_KMH,
                        "min_minutes_played": min_minutes,
                        "normalized_duration": NORMALIZED_MATCH_DURATION,
                        "median": sprint_median
                    }
                },
                "high_accel": {
                    "data": high_accel_data,
                    "metadata": {
                        "threshold": HIGH_ACCEL_THRESHOLD,
                        "min_minutes_played": min_minutes,
                        "normalized_duration": NORMALIZED_MATCH_DURATION,
                        "median": high_accel_median
                    }
                },
                "accel_decel": {
                    "data": accel_decel_data,
                    "metadata": {
                        "min_minutes_played": min_minutes,
                        "normalized_duration": NORMALIZED_MATCH_DURATION,
                        "median_acceleration": accel_median,
                        "median_deceleration": decel_median
                    }
                },
                "ratio": {
                    "data": ratio_data,
                    "metadata": {
                        "min_minutes_played": min_minutes,
                        "normalized_duration": NORMALIZED_MATCH_DURATION,
                        "median": ratio_median
                    }
                }
            }))
        }
        Err(e) => Json(json!({
            "error": format!("Database error: {}", e)
        })),
    }
}

#[derive(Debug, Deserialize)]
pub struct TimeSeriesParams {
    min_minutes_played: Option<f64>,
    matches: Option<String>,
}

#[derive(Debug, Serialize)]
struct TimeSeriesPoint {
    normalized_minute: i32,
    value: f64,
    count: i32,
}

pub async fn get_distance_per_minute(
    State(pool): State<PgPool>,
    Query(params): Query<TimeSeriesParams>,
) -> Json<Value> {
    let min_minutes = params.min_minutes_played.unwrap_or(85.0);

    let query = r#"
        WITH match_durations AS (
            SELECT 
                match_name,
                MIN(seconds_since_midnight) as match_start,
                MAX(seconds_since_midnight) as match_end,
                (MAX(seconds_since_midnight) - MIN(seconds_since_midnight)) / 60.0 as total_duration_minutes
            FROM all_matches_filtred
            WHERE match_name IS NOT NULL AND seconds_since_midnight IS NOT NULL
            GROUP BY match_name
        ),
        player_minutes AS (
            SELECT 
                amf.match_name,
                amf.player_display_name,
                (MAX(amf.seconds_since_midnight) - MIN(amf.seconds_since_midnight)) / 60.0 as minutes_played,
                md.total_duration_minutes,
                md.match_start,
                md.match_end
            FROM all_matches_filtred amf
            JOIN match_durations md ON md.match_name = amf.match_name
            WHERE amf.seconds_since_midnight IS NOT NULL
            GROUP BY amf.match_name, amf.player_display_name, md.total_duration_minutes, md.match_start, md.match_end
            HAVING (MAX(amf.seconds_since_midnight) - MIN(amf.seconds_since_midnight)) / 60.0 >= $1
        ),
        normalized_data AS (
            SELECT 
                amf.player_display_name,
                amf.match_name,
                FLOOR(((amf.seconds_since_midnight - pm.match_start) / (pm.match_end - pm.match_start)) * $2)::integer as normalized_minute,
                amf.speed,
                (amf.speed / 3.6) * 0.1 as distance_per_sample
            FROM all_matches_filtred amf
            JOIN player_minutes pm 
                ON pm.match_name = amf.match_name 
                AND pm.player_display_name = amf.player_display_name
            WHERE amf.seconds_since_midnight IS NOT NULL
        ),
        minute_distances AS (
            SELECT 
                player_display_name,
                match_name,
                normalized_minute,
                SUM(distance_per_sample) as distance_in_minute
            FROM normalized_data
            WHERE normalized_minute >= 0 AND normalized_minute < $2
            GROUP BY player_display_name, match_name, normalized_minute
        )
        SELECT 
            normalized_minute,
            AVG(distance_in_minute) as avg_distance,
            COUNT(*) as sample_count
        FROM minute_distances
        WHERE distance_in_minute > 0
        GROUP BY normalized_minute
        ORDER BY normalized_minute
    "#;

    match sqlx::query_as::<_, (i32, Option<f64>, i64)>(query)
        .bind(min_minutes)
        .bind(NORMALIZED_MATCH_DURATION)
        .fetch_all(&pool)
        .await
    {
        Ok(rows) => {
            let data: Vec<Value> = rows
                .into_iter()
                .map(|(minute, dist, count)| {
                    json!({
                        "normalized_minute": minute,
                        "distance_m_per_min": dist.unwrap_or(0.0),
                        "sample_count": count
                    })
                })
                .collect();

            let median = data
                .iter()
                .filter_map(|v| v.get("distance_m_per_min").and_then(|d| d.as_f64()))
                .sum::<f64>()
                / data.len() as f64;

            Json(json!({
                "data": data,
                "metadata": {
                    "min_minutes_played": min_minutes,
                    "normalized_duration": NORMALIZED_MATCH_DURATION,
                    "median": median
                }
            }))
        }
        Err(e) => Json(json!({
            "error": format!("Database error: {}", e),
            "data": []
        })),
    }
}

pub async fn get_distance_in_zone_per_minute(
    State(pool): State<PgPool>,
    Query(params): Query<TimeSeriesParams>,
) -> Json<Value> {
    let min_minutes = params.min_minutes_played.unwrap_or(85.0);

    let query = r#"
        WITH match_durations AS (
            SELECT 
                match_name,
                MIN(seconds_since_midnight) as match_start,
                MAX(seconds_since_midnight) as match_end,
                (MAX(seconds_since_midnight) - MIN(seconds_since_midnight)) / 60.0 as total_duration_minutes
            FROM all_matches_filtred
            WHERE match_name IS NOT NULL AND seconds_since_midnight IS NOT NULL
            GROUP BY match_name
        ),
        player_minutes AS (
            SELECT 
                amf.match_name,
                amf.player_display_name,
                (MAX(amf.seconds_since_midnight) - MIN(amf.seconds_since_midnight)) / 60.0 as minutes_played,
                md.total_duration_minutes,
                md.match_start,
                md.match_end
            FROM all_matches_filtred amf
            JOIN match_durations md ON md.match_name = amf.match_name
            WHERE amf.seconds_since_midnight IS NOT NULL
            GROUP BY amf.match_name, amf.player_display_name, md.total_duration_minutes, md.match_start, md.match_end
            HAVING (MAX(amf.seconds_since_midnight) - MIN(amf.seconds_since_midnight)) / 60.0 >= $1
        ),
        normalized_data AS (
            SELECT 
                amf.player_display_name,
                amf.match_name,
                FLOOR(((amf.seconds_since_midnight - pm.match_start) / (pm.match_end - pm.match_start)) * $2)::integer as normalized_minute,
                amf.speed,
                (amf.speed / 3.6) * 0.1 as distance_per_sample
            FROM all_matches_filtred amf
            JOIN player_minutes pm 
                ON pm.match_name = amf.match_name 
                AND pm.player_display_name = amf.player_display_name
            WHERE amf.seconds_since_midnight IS NOT NULL
        ),
        minute_zone_distances AS (
            SELECT 
                player_display_name,
                match_name,
                normalized_minute,
                SUM(CASE 
                    WHEN speed >= $3 AND speed < $4 THEN distance_per_sample
                    ELSE 0
                END) as z2_distance_m
            FROM normalized_data
            WHERE normalized_minute >= 0 AND normalized_minute < $2
            GROUP BY player_display_name, match_name, normalized_minute
        )
        SELECT 
            normalized_minute,
            AVG(z2_distance_m) as avg_z2_distance,
            COUNT(*) as sample_count
        FROM minute_zone_distances
        GROUP BY normalized_minute
        ORDER BY normalized_minute
    "#;

    match sqlx::query_as::<_, (i32, Option<f64>, i64)>(query)
        .bind(min_minutes)
        .bind(NORMALIZED_MATCH_DURATION)
        .bind(Z2_MIN_KMH)
        .bind(Z2_MAX_KMH)
        .fetch_all(&pool)
        .await
    {
        Ok(rows) => {
            let data: Vec<Value> = rows
                .into_iter()
                .map(|(minute, dist, count)| {
                    json!({
                        "normalized_minute": minute,
                        "distance_m_per_min": dist.unwrap_or(0.0),
                        "sample_count": count
                    })
                })
                .collect();

            let median = data
                .iter()
                .filter_map(|v| v.get("distance_m_per_min").and_then(|d| d.as_f64()))
                .sum::<f64>()
                / data.len() as f64;

            Json(json!({
                "data": data,
                "metadata": {
                    "min_minutes_played": min_minutes,
                    "normalized_duration": NORMALIZED_MATCH_DURATION,
                    "zone": format!("{} - {} km/h", Z2_MIN_KMH, Z2_MAX_KMH),
                    "median": median
                }
            }))
        }
        Err(e) => Json(json!({
            "error": format!("Database error: {}", e),
            "data": []
        })),
    }
}

pub async fn get_available_matches(State(pool): State<PgPool>) -> Json<Value> {
    let query = r#"
        SELECT DISTINCT 
            match_name,
            COUNT(DISTINCT player_display_name) as player_count,
            (MAX(seconds_since_midnight) - MIN(seconds_since_midnight)) / 60.0 as duration_minutes
        FROM all_matches_filtred
        WHERE match_name IS NOT NULL AND seconds_since_midnight IS NOT NULL
        GROUP BY match_name
        ORDER BY match_name
    "#;

    match sqlx::query_as::<_, (String, i64, Option<f64>)>(query)
        .fetch_all(&pool)
        .await
    {
        Ok(rows) => {
            let matches: Vec<Value> = rows
                .into_iter()
                .map(|(name, players, duration)| {
                    json!({
                        "match_name": name,
                        "player_count": players,
                        "duration_minutes": duration
                    })
                })
                .collect();
            Json(json!({ "matches": matches }))
        }
        Err(e) => Json(json!({
            "error": format!("Database error: {}", e),
            "matches": []
        })),
    }
}

pub async fn get_speed_zones_summary(State(pool): State<PgPool>) -> Json<Value> {
    let query = r#"
        WITH match_player_stats AS (
            SELECT 
                match_name,
                player_display_name,
                (MAX(seconds_since_midnight) - MIN(seconds_since_midnight)) / 60.0 as minutes_played,
                COUNT(CASE WHEN speed >= $1 AND speed < $2 THEN 1 END) as z2_count,
                COUNT(CASE WHEN speed >= $2 THEN 1 END) as sprint_count
            FROM all_matches_filtred
            WHERE match_name IS NOT NULL AND seconds_since_midnight IS NOT NULL
            GROUP BY match_name, player_display_name
            HAVING (MAX(seconds_since_midnight) - MIN(seconds_since_midnight)) / 60.0 >= 85.0
        )
        SELECT 
            AVG(z2_count) as avg_z2_samples,
            AVG(sprint_count) as avg_sprint_samples,
            COUNT(DISTINCT match_name) as total_matches,
            COUNT(*) as total_player_matches
        FROM match_player_stats
    "#;

    match sqlx::query_as::<_, (Option<f64>, Option<f64>, i64, i64)>(query)
        .bind(Z2_MIN_KMH)
        .bind(SPRINT_THRESHOLD_KMH)
        .fetch_one(&pool)
        .await
    {
        Ok((z2_avg, sprint_avg, matches, player_matches)) => Json(json!({
            "avg_z2_samples_per_player": z2_avg.unwrap_or(0.0),
            "avg_sprint_samples_per_player": sprint_avg.unwrap_or(0.0),
            "total_matches": matches,
            "total_player_matches": player_matches
        })),
        Err(e) => Json(json!({
            "error": format!("Database error: {}", e)
        })),
    }
}

pub async fn get_sprint_distance_per_minute(
    State(pool): State<PgPool>,
    Query(params): Query<TimeSeriesParams>,
) -> Json<Value> {
    let min_minutes = params.min_minutes_played.unwrap_or(85.0);

    let query = r#"
        WITH match_durations AS (
            SELECT 
                match_name,
                MIN(seconds_since_midnight) as match_start,
                MAX(seconds_since_midnight) as match_end,
                (MAX(seconds_since_midnight) - MIN(seconds_since_midnight)) / 60.0 as total_duration_minutes
            FROM all_matches_filtred
            WHERE match_name IS NOT NULL AND seconds_since_midnight IS NOT NULL
            GROUP BY match_name
        ),
        player_minutes AS (
            SELECT 
                amf.match_name,
                amf.player_display_name,
                (MAX(amf.seconds_since_midnight) - MIN(amf.seconds_since_midnight)) / 60.0 as minutes_played,
                md.total_duration_minutes,
                md.match_start,
                md.match_end
            FROM all_matches_filtred amf
            JOIN match_durations md ON md.match_name = amf.match_name
            WHERE amf.seconds_since_midnight IS NOT NULL
            GROUP BY amf.match_name, amf.player_display_name, md.total_duration_minutes, md.match_start, md.match_end
            HAVING (MAX(amf.seconds_since_midnight) - MIN(amf.seconds_since_midnight)) / 60.0 >= $1
        ),
        normalized_data AS (
            SELECT 
                amf.player_display_name,
                amf.match_name,
                FLOOR(((amf.seconds_since_midnight - pm.match_start) / (pm.match_end - pm.match_start)) * $2)::integer as normalized_minute,
                amf.speed,
                (amf.speed / 3.6) * 0.1 as distance_per_sample
            FROM all_matches_filtred amf
            JOIN player_minutes pm 
                ON pm.match_name = amf.match_name 
                AND pm.player_display_name = amf.player_display_name
            WHERE amf.seconds_since_midnight IS NOT NULL
        ),
        minute_sprint_distances AS (
            SELECT 
                player_display_name,
                match_name,
                normalized_minute,
                SUM(CASE 
                    WHEN speed >= $3 THEN distance_per_sample
                    ELSE 0
                END) as sprint_distance_m
            FROM normalized_data
            WHERE normalized_minute >= 0 AND normalized_minute < $2
            GROUP BY player_display_name, match_name, normalized_minute
        )
        SELECT 
            normalized_minute,
            AVG(sprint_distance_m) as avg_sprint_distance,
            COUNT(*) as sample_count
        FROM minute_sprint_distances
        GROUP BY normalized_minute
        ORDER BY normalized_minute
    "#;

    match sqlx::query_as::<_, (i32, Option<f64>, i64)>(query)
        .bind(min_minutes)
        .bind(NORMALIZED_MATCH_DURATION)
        .bind(SPRINT_THRESHOLD_KMH)
        .fetch_all(&pool)
        .await
    {
        Ok(rows) => {
            let data: Vec<Value> = rows
                .into_iter()
                .map(|(minute, dist, count)| {
                    json!({
                        "normalized_minute": minute,
                        "distance_m_per_min": dist.unwrap_or(0.0),
                        "sample_count": count
                    })
                })
                .collect();

            let median = data
                .iter()
                .filter_map(|v| v.get("distance_m_per_min").and_then(|d| d.as_f64()))
                .sum::<f64>()
                / data.len() as f64;

            Json(json!({
                "data": data,
                "metadata": {
                    "min_minutes_played": min_minutes,
                    "normalized_duration": NORMALIZED_MATCH_DURATION,
                    "zone": format!("> {} km/h (Sprint)", SPRINT_THRESHOLD_KMH),
                    "median": median
                }
            }))
        }
        Err(e) => Json(json!({
            "error": format!("Database error: {}", e),
            "data": []
        })),
    }
}

pub async fn get_high_accel_decel_per_minute(
    State(pool): State<PgPool>,
    Query(params): Query<TimeSeriesParams>,
) -> Json<Value> {
    let min_minutes = params.min_minutes_played.unwrap_or(85.0);

    let query = r#"
        WITH match_durations AS (
            SELECT 
                match_name,
                MIN(seconds_since_midnight) as match_start,
                MAX(seconds_since_midnight) as match_end,
                (MAX(seconds_since_midnight) - MIN(seconds_since_midnight)) / 60.0 as total_duration_minutes
            FROM all_matches_filtred
            WHERE match_name IS NOT NULL AND seconds_since_midnight IS NOT NULL
            GROUP BY match_name
        ),
        player_minutes AS (
            SELECT 
                amf.match_name,
                amf.player_display_name,
                (MAX(amf.seconds_since_midnight) - MIN(amf.seconds_since_midnight)) / 60.0 as minutes_played,
                md.total_duration_minutes,
                md.match_start,
                md.match_end
            FROM all_matches_filtred amf
            JOIN match_durations md ON md.match_name = amf.match_name
            WHERE amf.seconds_since_midnight IS NOT NULL
            GROUP BY amf.match_name, amf.player_display_name, md.total_duration_minutes, md.match_start, md.match_end
            HAVING (MAX(amf.seconds_since_midnight) - MIN(amf.seconds_since_midnight)) / 60.0 >= $1
        ),
        normalized_data AS (
            SELECT 
                amf.player_display_name,
                amf.match_name,
                FLOOR(((amf.seconds_since_midnight - pm.match_start) / (pm.match_end - pm.match_start)) * $2)::integer as normalized_minute,
                amf.player_acceleration_final_smooth
            FROM all_matches_filtred amf
            JOIN player_minutes pm 
                ON pm.match_name = amf.match_name 
                AND pm.player_display_name = amf.player_display_name
            WHERE amf.seconds_since_midnight IS NOT NULL
                AND amf.player_acceleration_final_smooth IS NOT NULL
        ),
        minute_high_accels AS (
            SELECT 
                player_display_name,
                match_name,
                normalized_minute,
                COUNT(CASE WHEN ABS(player_acceleration_final_smooth) >= $3 THEN 1 END) as high_accel_count
            FROM normalized_data
            WHERE normalized_minute >= 0 AND normalized_minute < $2
            GROUP BY player_display_name, match_name, normalized_minute
        )
        SELECT 
            normalized_minute,
            AVG(high_accel_count)::float as avg_high_accel_count,
            COUNT(*)::bigint as sample_count
        FROM minute_high_accels
        GROUP BY normalized_minute
        ORDER BY normalized_minute
    "#;

    match sqlx::query_as::<_, (i32, Option<f64>, i64)>(query)
        .bind(min_minutes)
        .bind(NORMALIZED_MATCH_DURATION)
        .bind(HIGH_ACCEL_THRESHOLD)
        .fetch_all(&pool)
        .await
    {
        Ok(rows) => {
            let data: Vec<Value> = rows
                .into_iter()
                .map(|(minute, count, samples)| {
                    json!({
                        "normalized_minute": minute,
                        "count_per_min": count.unwrap_or(0.0),
                        "sample_count": samples
                    })
                })
                .collect();

            let median = data
                .iter()
                .filter_map(|v| v.get("count_per_min").and_then(|d| d.as_f64()))
                .sum::<f64>()
                / data.len() as f64;

            Json(json!({
                "data": data,
                "metadata": {
                    "min_minutes_played": min_minutes,
                    "normalized_duration": NORMALIZED_MATCH_DURATION,
                    "threshold": format!("> {} m/s²", HIGH_ACCEL_THRESHOLD),
                    "median": median
                }
            }))
        }
        Err(e) => Json(json!({
            "error": format!("Database error: {}", e),
            "data": []
        })),
    }
}

pub async fn get_accel_decel_separated_per_minute(
    State(pool): State<PgPool>,
    Query(params): Query<TimeSeriesParams>,
) -> Json<Value> {
    let min_minutes = params.min_minutes_played.unwrap_or(85.0);

    let query = r#"
        WITH match_durations AS (
            SELECT 
                match_name,
                MIN(seconds_since_midnight) as match_start,
                MAX(seconds_since_midnight) as match_end,
                (MAX(seconds_since_midnight) - MIN(seconds_since_midnight)) / 60.0 as total_duration_minutes
            FROM all_matches_filtred
            WHERE match_name IS NOT NULL AND seconds_since_midnight IS NOT NULL
            GROUP BY match_name
        ),
        player_minutes AS (
            SELECT 
                amf.match_name,
                amf.player_display_name,
                (MAX(amf.seconds_since_midnight) - MIN(amf.seconds_since_midnight)) / 60.0 as minutes_played,
                md.total_duration_minutes,
                md.match_start,
                md.match_end
            FROM all_matches_filtred amf
            JOIN match_durations md ON md.match_name = amf.match_name
            WHERE amf.seconds_since_midnight IS NOT NULL
            GROUP BY amf.match_name, amf.player_display_name, md.total_duration_minutes, md.match_start, md.match_end
            HAVING (MAX(amf.seconds_since_midnight) - MIN(amf.seconds_since_midnight)) / 60.0 >= $1
        ),
        normalized_data AS (
            SELECT 
                amf.player_display_name,
                amf.match_name,
                FLOOR(((amf.seconds_since_midnight - pm.match_start) / (pm.match_end - pm.match_start)) * $2)::integer as normalized_minute,
                amf.player_acceleration_final_smooth
            FROM all_matches_filtred amf
            JOIN player_minutes pm 
                ON pm.match_name = amf.match_name 
                AND pm.player_display_name = amf.player_display_name
            WHERE amf.seconds_since_midnight IS NOT NULL
                AND amf.player_acceleration_final_smooth IS NOT NULL
        ),
        minute_accels AS (
            SELECT 
                player_display_name,
                match_name,
                normalized_minute,
                AVG(CASE WHEN player_acceleration_final_smooth > 0 THEN player_acceleration_final_smooth END) as avg_accel,
                AVG(CASE WHEN player_acceleration_final_smooth < 0 THEN ABS(player_acceleration_final_smooth) END) as avg_decel,
                COUNT(CASE WHEN player_acceleration_final_smooth > 0 THEN 1 END) as accel_count,
                COUNT(CASE WHEN player_acceleration_final_smooth < 0 THEN 1 END) as decel_count
            FROM normalized_data
            WHERE normalized_minute >= 0 AND normalized_minute < $2
            GROUP BY player_display_name, match_name, normalized_minute
        )
        SELECT 
            normalized_minute,
            AVG(avg_accel)::float as avg_acceleration,
            AVG(avg_decel)::float as avg_deceleration,
            SUM(accel_count)::bigint as total_accel_count,
            SUM(decel_count)::bigint as total_decel_count
        FROM minute_accels
        GROUP BY normalized_minute
        ORDER BY normalized_minute
    "#;

    match sqlx::query_as::<_, (i32, Option<f64>, Option<f64>, Option<i64>, Option<i64>)>(query)
        .bind(min_minutes)
        .bind(NORMALIZED_MATCH_DURATION)
        .fetch_all(&pool)
        .await
    {
        Ok(rows) => {
            let data: Vec<Value> = rows
                .into_iter()
                .map(|(minute, accel, decel, accel_count, decel_count)| {
                    json!({
                        "normalized_minute": minute,
                        "avg_acceleration": accel.unwrap_or(0.0),
                        "avg_deceleration": decel.unwrap_or(0.0),
                        "accel_count": accel_count.unwrap_or(0),
                        "decel_count": decel_count.unwrap_or(0)
                    })
                })
                .collect();

            let median_accel = data
                .iter()
                .filter_map(|v| v.get("avg_acceleration").and_then(|d| d.as_f64()))
                .sum::<f64>()
                / data.len() as f64;

            let median_decel = data
                .iter()
                .filter_map(|v| v.get("avg_deceleration").and_then(|d| d.as_f64()))
                .sum::<f64>()
                / data.len() as f64;

            Json(json!({
                "data": data,
                "metadata": {
                    "min_minutes_played": min_minutes,
                    "normalized_duration": NORMALIZED_MATCH_DURATION,
                    "median_acceleration": median_accel,
                    "median_deceleration": median_decel
                }
            }))
        }
        Err(e) => Json(json!({
            "error": format!("Database error: {}", e),
            "data": []
        })),
    }
}

pub async fn get_accel_decel_ratio_per_minute(
    State(pool): State<PgPool>,
    Query(params): Query<TimeSeriesParams>,
) -> Json<Value> {
    let min_minutes = params.min_minutes_played.unwrap_or(85.0);

    let query = r#"
        WITH match_durations AS (
            SELECT 
                match_name,
                MIN(seconds_since_midnight) as match_start,
                MAX(seconds_since_midnight) as match_end,
                (MAX(seconds_since_midnight) - MIN(seconds_since_midnight)) / 60.0 as total_duration_minutes
            FROM all_matches_filtred
            WHERE match_name IS NOT NULL AND seconds_since_midnight IS NOT NULL
            GROUP BY match_name
        ),
        player_minutes AS (
            SELECT 
                amf.match_name,
                amf.player_display_name,
                (MAX(amf.seconds_since_midnight) - MIN(amf.seconds_since_midnight)) / 60.0 as minutes_played,
                md.total_duration_minutes,
                md.match_start,
                md.match_end
            FROM all_matches_filtred amf
            JOIN match_durations md ON md.match_name = amf.match_name
            WHERE amf.seconds_since_midnight IS NOT NULL
            GROUP BY amf.match_name, amf.player_display_name, md.total_duration_minutes, md.match_start, md.match_end
            HAVING (MAX(amf.seconds_since_midnight) - MIN(amf.seconds_since_midnight)) / 60.0 >= $1
        ),
        normalized_data AS (
            SELECT 
                amf.player_display_name,
                amf.match_name,
                FLOOR(((amf.seconds_since_midnight - pm.match_start) / (pm.match_end - pm.match_start)) * $2)::integer as normalized_minute,
                amf.player_acceleration_final_smooth
            FROM all_matches_filtred amf
            JOIN player_minutes pm 
                ON pm.match_name = amf.match_name 
                AND pm.player_display_name = amf.player_display_name
            WHERE amf.seconds_since_midnight IS NOT NULL
                AND amf.player_acceleration_final_smooth IS NOT NULL
        ),
        minute_ratios AS (
            SELECT 
                player_display_name,
                match_name,
                normalized_minute,
                COUNT(CASE WHEN player_acceleration_final_smooth > 0 THEN 1 END)::float as accel_count,
                COUNT(CASE WHEN player_acceleration_final_smooth < 0 THEN 1 END)::float as decel_count
            FROM normalized_data
            WHERE normalized_minute >= 0 AND normalized_minute < $2
            GROUP BY player_display_name, match_name, normalized_minute
        )
        SELECT 
            normalized_minute,
            AVG(CASE WHEN decel_count > 0 THEN accel_count / decel_count END)::float as avg_ratio
        FROM minute_ratios
        GROUP BY normalized_minute
        ORDER BY normalized_minute
    "#;

    match sqlx::query_as::<_, (i32, Option<f64>)>(query)
        .bind(min_minutes)
        .bind(NORMALIZED_MATCH_DURATION)
        .fetch_all(&pool)
        .await
    {
        Ok(rows) => {
            let data: Vec<Value> = rows
                .into_iter()
                .map(|(minute, ratio)| {
                    json!({
                        "normalized_minute": minute,
                        "ratio": ratio.unwrap_or(0.0)
                    })
                })
                .collect();

            let median = data
                .iter()
                .filter_map(|v| v.get("ratio").and_then(|d| d.as_f64()))
                .sum::<f64>()
                / data.len() as f64;

            Json(json!({
                "data": data,
                "metadata": {
                    "min_minutes_played": min_minutes,
                    "normalized_duration": NORMALIZED_MATCH_DURATION,
                    "median": median
                }
            }))
        }
        Err(e) => Json(json!({
            "error": format!("Database error: {}", e),
            "data": []
        })),
    }
}

pub async fn get_match_aggregate_stats(State(pool): State<PgPool>) -> Json<Value> {
    let query = r#"
        WITH match_stats AS (
            SELECT 
                match_name,
                player_display_name,
                (MAX(seconds_since_midnight) - MIN(seconds_since_midnight)) / 60.0 as minutes_played
            FROM all_matches_filtred
            WHERE match_name IS NOT NULL AND seconds_since_midnight IS NOT NULL
            GROUP BY match_name, player_display_name
            HAVING (MAX(seconds_since_midnight) - MIN(seconds_since_midnight)) / 60.0 >= 85.0
        ),
        player_data AS (
            SELECT 
                amf.match_name,
                amf.player_display_name,
                SUM((amf.speed / 3.6) * 0.1) / ms.minutes_played as dtr,
                SUM(CASE WHEN amf.speed >= 19.8 AND amf.speed < 25.2 THEN (amf.speed / 3.6) * 0.1 ELSE 0 END) / ms.minutes_played as z2_distance,
                SUM(CASE WHEN amf.speed >= 25.2 THEN (amf.speed / 3.6) * 0.1 ELSE 0 END) / ms.minutes_played as sprint_distance,
                AVG(CASE WHEN amf.player_acceleration_final_smooth > 0 THEN amf.player_acceleration_final_smooth END) as accelerations,
                AVG(CASE WHEN amf.player_acceleration_final_smooth < 0 THEN ABS(amf.player_acceleration_final_smooth) END) as decelerations,
                COUNT(CASE WHEN ABS(amf.player_acceleration_final_smooth) >= 3.0 THEN 1 END)::float / ms.minutes_played as high_intensity
            FROM all_matches_filtred amf
            JOIN match_stats ms ON ms.match_name = amf.match_name AND ms.player_display_name = amf.player_display_name
            WHERE amf.seconds_since_midnight IS NOT NULL
            GROUP BY amf.match_name, amf.player_display_name, ms.minutes_played
        )
        SELECT 
            match_name,
            AVG(dtr)::float as avg_dtr,
            AVG(z2_distance)::float as avg_z2_distance,
            AVG(sprint_distance)::float as avg_sprint_distance,
            AVG(accelerations)::float as avg_accelerations,
            AVG(decelerations)::float as avg_decelerations,
            AVG(high_intensity)::float as avg_high_intensity,
            COUNT(DISTINCT player_display_name)::int as player_count
        FROM player_data
        GROUP BY match_name
        ORDER BY match_name
    "#;

    match sqlx::query_as::<
        _,
        (
            String,
            Option<f64>,
            Option<f64>,
            Option<f64>,
            Option<f64>,
            Option<f64>,
            Option<f64>,
            i32,
        ),
    >(query)
    .fetch_all(&pool)
    .await
    {
        Ok(rows) => {
            let matches: Vec<Value> = rows
                .into_iter()
                .map(|(name, dtr, z2, sprint, accel, decel, intensity, count)| {
                    json!({
                        "match_name": name,
                        "dtr": dtr.unwrap_or(0.0),
                        "z2_distance": z2.unwrap_or(0.0),
                        "sprint_distance": sprint.unwrap_or(0.0),
                        "accelerations": accel.unwrap_or(0.0),
                        "decelerations": decel.unwrap_or(0.0),
                        "high_intensity": intensity.unwrap_or(0.0),
                        "player_count": count
                    })
                })
                .collect();
            Json(json!({ "matches": matches }))
        }
        Err(e) => Json(json!({
            "error": format!("Database error: {}", e),
            "matches": []
        })),
    }
}
