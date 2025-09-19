use std::collections::HashMap;
use std::fs;
use std::env;

use axum::extract::{Path, Query, State};
use axum::Json;
use serde_json::{json, Value};
use sqlx::{PgPool, Row};

use super::forecast_client::*;

fn zscore(values: &[(f64, f64)]) -> (Vec<f64>, Vec<f64>) {
    // values: (speed_kmh, sec)
    // compute acceleration in m/s^2 from speed in km/h
    let mut acc: Vec<f64> = Vec::with_capacity(values.len());
    let mut sp_z: Vec<f64> = Vec::with_capacity(values.len());

    let speeds_ms: Vec<f64> = values.iter().map(|(s, _)| s / 3.6).collect();
    let secs: Vec<f64> = values.iter().map(|(_, t)| *t).collect();

    acc.push(0.0);
    for i in 1..values.len() {
        let dt = (secs[i] - secs[i - 1]).max(1e-6);
        let dv = speeds_ms[i] - speeds_ms[i - 1];
        acc.push(dv / dt);
    }

    // z-score for speed_kmh
    let mean_s = if values.is_empty() { 0.0 } else { values.iter().map(|(s, _)| *s).sum::<f64>() / (values.len() as f64) };
    let std_s = {
        let v = values.iter().map(|(s, _)| (*s - mean_s).powi(2)).sum::<f64>() / (values.len().max(1) as f64);
        v.sqrt().max(1e-6)
    };
    for (s, _) in values.iter() { sp_z.push((*s - mean_s) / std_s); }

    // z-score for acceleration
    let mean_a = if acc.is_empty() { 0.0 } else { acc.iter().copied().sum::<f64>() / (acc.len() as f64) };
    let std_a = {
        let v = acc.iter().map(|a| (*a - mean_a).powi(2)).sum::<f64>() / (acc.len().max(1) as f64);
        v.sqrt().max(1e-6)
    };
    let acc_z: Vec<f64> = acc.into_iter().map(|a| (a - mean_a) / std_a).collect();

    (sp_z, acc_z)
}

/// POST /match/table/:table_name/forecast?center_sec=...&horizon_s=5.0
pub async fn forecast_realtime(
    State(pool): State<PgPool>,
    Path(table_name): Path<String>,
    Query(params): Query<HashMap<String, String>>,
) -> Json<Value> {
    let center_sec: f64 = params
        .get("center_sec")
        .and_then(|s| s.parse::<f64>().ok())
        .unwrap_or(0.0);
    let horizon_s: f64 = params
        .get("horizon_s")
        .and_then(|s| s.parse::<f64>().ok())
        .unwrap_or(5.0);

    // Load config from Python model if available; otherwise ENV/defaults
    let conf_path = env::var("FORECAST_CONFIG_PATH")
        .ok()
        .or_else(|| env::var("FORECAST_MODEL_DIR").ok().map(|d| format!("{}/forecast_config.json", d)))
        .unwrap_or_else(|| "/workspaces/tesis-futbol/ml/models/forecast_config.json".to_string());

    let (window_steps, hz) = match fs::read_to_string(&conf_path) {
        Ok(s) => {
            let conf: serde_json::Value = serde_json::from_str(&s).unwrap_or(json!({}));
            let ws = conf.get("window_steps").and_then(|v| v.as_i64()).unwrap_or(40);
            let hz = conf.get("hz").and_then(|v| v.as_i64()).unwrap_or(10);
            (ws, hz)
        }
        Err(_) => {
            let hz: i64 = env::var("FORECAST_HZ").ok().and_then(|v| v.parse().ok()).unwrap_or(10);
            let win_s: f64 = env::var("FORECAST_WINDOW_SECONDS").ok().and_then(|v| v.parse().ok()).unwrap_or(4.0);
            let ws_env: Option<i64> = env::var("FORECAST_WINDOW_STEPS").ok().and_then(|v| v.parse().ok());
            let ws = ws_env.unwrap_or(((hz as f64) * win_s).round() as i64);
            (ws, hz)
        }
    };
    let window_seconds = (window_steps as f64) / (hz as f64);

    let view_name = format!("{}_sql_player_gemini_processed_view", table_name);
    let lo = center_sec - window_seconds - 0.1; // small pad
    let hi = center_sec + 1e-6;

    let sql = format!(
        r#"
        SELECT player_display_name,
               (seconds_since_midnight)::double precision AS sec,
               speed
        FROM public.{view}
        WHERE (seconds_since_midnight)::double precision BETWEEN $1 AND $2
        ORDER BY player_display_name, sec
        "#,
        view = view_name
    );

    let rows = match sqlx::query(&sql).bind(lo).bind(hi).fetch_all(&pool).await {
        Ok(r) => r,
        Err(e) => return Json(json!({"error": format!("db error: {}", e)})),
    };
    if rows.is_empty() { return Json(json!({"horizon_s": horizon_s, "results": []})); }

    // group by player -> last window_steps samples
    let mut by_player: HashMap<String, Vec<(f64, f64)>> = HashMap::new();
    for r in rows {
        let name: String = r.try_get("player_display_name").unwrap_or_default();
        let sec: f64 = r.try_get("sec").unwrap_or(0.0);
        let sp: f64 = r.try_get("speed").unwrap_or(0.0);
        by_player.entry(name).or_default().push((sp, sec));
    }
    for v in by_player.values_mut() {
        // keep last window_steps
        if v.len() as i64 > window_steps { v.drain(0..(v.len() - window_steps as usize)); }
    }

    // Build request
    let mut players_req: Vec<ForecastPlayerWindow> = Vec::new();
    for (name, seq) in by_player.into_iter() {
        let (speed_z, accel_z) = zscore(&seq);
        let mut samples: Vec<ForecastSample> = Vec::with_capacity(seq.len());
        for ((_, ts), (sz, az)) in seq.iter().zip(speed_z.iter().zip(accel_z.iter())) {
            samples.push(ForecastSample { ts: *ts, speed_z: Some(*sz), accel_z: Some(*az) });
        }
        // ensure exactly window_steps by left-padding
        if (samples.len() as i64) < window_steps {
            if let Some(first) = samples.first().cloned() {
                let need = (window_steps as usize) - samples.len();
                let mut pad = vec![first; need];
                pad.extend(samples);
                samples = pad;
            }
        } else if (samples.len() as i64) > window_steps {
            samples = samples[samples.len() - window_steps as usize..].to_vec();
        }
        players_req.push(ForecastPlayerWindow { id: name.clone(), name, samples });
    }

    if players_req.is_empty() { return Json(json!({"horizon_s": horizon_s, "results": []})); }

    let fc = ForecastClient::new(std::env::var("FORECAST_URL").unwrap_or_else(|_| "http://localhost:8001".to_string()));
    let req = ForecastRequest { horizon_s, players: players_req };
    let out = match fc.forecast(&req).await { Ok(v) => v, Err(e) => return Json(json!({"error": format!("forecast error: {}", e)})) };
    Json(serde_json::to_value(out).unwrap_or(json!({"error": "serialize"})))
}


