use axum::{extract::{Path, State}, Json};
use serde::{Deserialize, Serialize};
use serde_json::json;
use sqlx::PgPool;
use std::sync::Arc;
use uuid::Uuid;

use crate::models::{Competition, EventType, Match, MatchPlayer, Player, Team};

// Wrap pool in State
type Db = PgPool;

// Teams
pub async fn create_team(State(pool): State<Db>, Json(mut t): Json<Team>) -> Result<Json<Team>, (axum::http::StatusCode, String)> {
    if t.team_id.is_nil() { t.team_id = Uuid::new_v4(); }
    let rec = sqlx::query_as!(
        Team,
        r#"INSERT INTO teams (team_id, name, category) VALUES ($1,$2,$3) RETURNING team_id, name, category"#,
        t.team_id, t.name, t.category
    )
    .fetch_one(&pool)
    .await
    .map_err(internal_err)?;
    Ok(Json(rec))
}

pub async fn list_teams(State(pool): State<Db>) -> Result<Json<Vec<Team>>, (axum::http::StatusCode, String)> {
    let recs = sqlx::query_as!(Team, r#"SELECT team_id, name, category FROM teams ORDER BY name"#)
        .fetch_all(&pool)
        .await
        .map_err(internal_err)?;
    Ok(Json(recs))
}

// Players
#[derive(Deserialize)]
pub struct PlayerPayload {
    pub full_name: String,
    pub national_id: String,
    pub birthdate: Option<chrono::NaiveDate>,
    pub current_team_id: Option<Uuid>,
    pub position: Option<String>,
}

pub async fn create_player(State(pool): State<Db>, Json(p): Json<PlayerPayload>) -> Result<Json<Player>, (axum::http::StatusCode, String)> {
    let rec = sqlx::query_as!(
        Player,
        r#"INSERT INTO players (player_id, full_name, national_id, birthdate, current_team_id, position, active)
           VALUES ($1,$2,$3,$4,$5,$6, TRUE)
           RETURNING player_id, full_name, national_id, birthdate, current_team_id, position, active"#,
        Uuid::new_v4(), p.full_name, p.national_id, p.birthdate, p.current_team_id, p.position
    )
    .fetch_one(&pool)
    .await
    .map_err(internal_err)?;
    Ok(Json(rec))
}

pub async fn search_players(State(pool): State<Db>, axum::extract::Query(q): axum::extract::Query<std::collections::HashMap<String, String>>) -> Result<Json<Vec<Player>>, (axum::http::StatusCode, String)> {
    let search = q.get("search").map(|s| format!("%{}%", s)).unwrap_or("%%".to_string());
    let recs = sqlx::query_as!(
        Player,
        r#"SELECT player_id, full_name, national_id, birthdate, current_team_id, position, active
            FROM players
            WHERE full_name ILIKE $1 OR national_id ILIKE $1
            ORDER BY full_name
        "#,
        search
    )
    .fetch_all(&pool)
    .await
    .map_err(internal_err)?;
    Ok(Json(recs))
}

// CSV/Excel import stub (to be implemented later)
pub async fn import_players() -> Json<serde_json::Value> {
    Json(json!({"status": "not_implemented"}))
}

// Matches
#[derive(Deserialize)]
pub struct MatchPayload {
    pub competition_id: Option<Uuid>,
    pub match_date: chrono::DateTime<chrono::Utc>,
    pub venue_id: Option<Uuid>,
    pub category: Option<String>,
    pub home_team_id: Uuid,
    pub away_team_id: Uuid,
    pub youtube_link: Option<String>,
    pub notes: Option<String>,
    pub source_pdf_hash: Option<String>,
}

pub async fn create_match(State(pool): State<Db>, Json(mp): Json<MatchPayload>) -> Result<Json<Match>, (axum::http::StatusCode, String)> {
    // idempotency by source_pdf_hash
    if let Some(ref h) = mp.source_pdf_hash {
        if let Some(existing) = sqlx::query_as!(
            Match,
            r#"SELECT match_id, competition_id, match_date, venue_id, category, home_team_id, away_team_id, result_home, result_away, youtube_link, notes, source_pdf_hash, parse_confidence
               FROM matches WHERE source_pdf_hash = $1"#,
            h
        )
        .fetch_optional(&pool)
        .await
        .map_err(internal_err)? {
            return Ok(Json(existing));
        }
    }

    let rec = sqlx::query_as!(
        Match,
        r#"INSERT INTO matches (match_id, competition_id, match_date, venue_id, category, home_team_id, away_team_id, youtube_link, notes, source_pdf_hash)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
           RETURNING match_id, competition_id, match_date, venue_id, category, home_team_id, away_team_id, result_home, result_away, youtube_link, notes, source_pdf_hash, parse_confidence"#,
        Uuid::new_v4(), mp.competition_id, mp.match_date, mp.venue_id, mp.category, mp.home_team_id, mp.away_team_id, mp.youtube_link, mp.notes, mp.source_pdf_hash
    )
    .fetch_one(&pool)
    .await
    .map_err(internal_err)?;
    Ok(Json(rec))
}

pub async fn list_matches(State(pool): State<Db>) -> Result<Json<Vec<Match>>, (axum::http::StatusCode, String)> {
    let recs = sqlx::query_as!(
        Match,
        r#"SELECT match_id, competition_id, match_date, venue_id, category, home_team_id, away_team_id, result_home, result_away, youtube_link, notes, source_pdf_hash, parse_confidence
            FROM matches ORDER BY match_date DESC"#
    )
    .fetch_all(&pool)
    .await
    .map_err(internal_err)?;
    Ok(Json(recs))
}

// Lineup bulk upsert
#[derive(Deserialize)]
pub struct LineupItem { pub player_id: Uuid, pub team_id: Uuid, pub role: String, pub position: Option<String>, pub jersey_number: Option<i32> }
pub async fn upsert_lineup(State(pool): State<Db>, Path(id): Path<Uuid>, Json(items): Json<Vec<LineupItem>>) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, String)> {
    let mut tx = pool.begin().await.map_err(internal_err)?;
    // simplify: delete and insert
    sqlx::query!("DELETE FROM match_players WHERE match_id = $1", id)
        .execute(&mut *tx).await.map_err(internal_err)?;
    for it in items {
        sqlx::query!(
            r#"INSERT INTO match_players (match_player_id, match_id, team_id, player_id, role, position, jersey_number)
               VALUES ($1,$2,$3,$4,$5,$6,$7)"#,
            Uuid::new_v4(), id, it.team_id, it.player_id, it.role, it.position, it.jersey_number
        ).execute(&mut *tx).await.map_err(internal_err)?;
    }
    tx.commit().await.map_err(internal_err)?;
    Ok(Json(json!({"status": "ok"})))
}

// Events bulk upsert
#[derive(Deserialize)]
pub struct EventItem {
    pub team_id: Uuid,
    pub player_id: Option<Uuid>,
    pub related_player_id: Option<Uuid>,
    pub minute: i32,
    pub added_time: Option<i32>,
    pub r#type: EventType,
    pub assist_player_id: Option<Uuid>,
    pub reason: Option<String>,
}
pub async fn upsert_events(State(pool): State<Db>, Path(id): Path<Uuid>, Json(items): Json<Vec<EventItem>>) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, String)> {
    let mut tx = pool.begin().await.map_err(internal_err)?;
    sqlx::query!("DELETE FROM events WHERE match_id = $1", id)
        .execute(&mut *tx).await.map_err(internal_err)?;
    for it in items {
        sqlx::query!(
            r#"INSERT INTO events (event_id, match_id, team_id, player_id, related_player_id, minute, added_time, type, assist_player_id, reason)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)"#,
            Uuid::new_v4(), id, it.team_id, it.player_id, it.related_player_id, it.minute, it.added_time, it.r#type as EventType, it.assist_player_id, it.reason
        ).execute(&mut *tx).await.map_err(internal_err)?;
    }
    tx.commit().await.map_err(internal_err)?;
    Ok(Json(json!({"status": "ok"})))
}

pub async fn confirm_match(State(pool): State<Db>, Path(id): Path<Uuid>) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, String)> {
    // simple update to set parse_confidence to 1.0 as a placeholder for "confirmed"
    let _ = sqlx::query!("UPDATE matches SET parse_confidence = 1.0 WHERE match_id = $1", id)
        .execute(&pool).await.map_err(internal_err)?;
    let row = sqlx::query!(
        r#"SELECT match_id, competition_id, match_date, venue_id, category, home_team_id, away_team_id, result_home, result_away, youtube_link, notes, source_pdf_hash, parse_confidence
           FROM matches WHERE match_id = $1"#,
        id
    ).fetch_one(&pool).await.map_err(internal_err)?;
    Ok(Json(json!({
        "status": "ok",
        "match": {
            "match_id": row.match_id,
            "competition_id": row.competition_id,
            "match_date": row.match_date,
            "venue_id": row.venue_id,
            "category": row.category,
            "home_team_id": row.home_team_id,
            "away_team_id": row.away_team_id,
            "result_home": row.result_home,
            "result_away": row.result_away,
            "youtube_link": row.youtube_link,
            "notes": row.notes,
            "source_pdf_hash": row.source_pdf_hash,
            "parse_confidence": row.parse_confidence
        }
    })))
}

// Upload/OCR stubs
pub async fn upload_pdf() -> Json<serde_json::Value> { Json(json!({"status": "not_implemented"})) }
pub async fn upload_status(Path(_id): Path<Uuid>) -> Json<serde_json::Value> { Json(json!({"status": "not_implemented"})) }

fn internal_err<E: std::fmt::Display>(e: E) -> (axum::http::StatusCode, String) {
    (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
}



