use axum::{extract::{Path, State}, Json};
use serde::Deserialize;
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
// With Administrativo as source of truth, we expose read-only search here.
pub async fn create_player() -> Result<Json<serde_json::Value>, (axum::http::StatusCode, String)> {
    Err((axum::http::StatusCode::METHOD_NOT_ALLOWED, "Create via administrativo import".into()))
}

pub async fn search_players(State(pool): State<Db>, axum::extract::Query(q): axum::extract::Query<std::collections::HashMap<String, String>>) -> Result<Json<Vec<Player>>, (axum::http::StatusCode, String)> {
    let search = q.get("search").map(|s| format!("%{}%", s)).unwrap_or("%%".to_string());
    let recs = sqlx::query_as!(
        Player,
        r#"SELECT 
                "Documento_de_Identidad"      as documento_de_identidad,
                "Jugador"                      as "jugador?",
                "Fecha_Nacimiento"            as "fecha_nacimiento?",
                "Pasaporte"                    as "pasaporte?",
                "Telefono"                     as "telefono?",
                "Celular"                      as "celular?",
                "Email"                        as "email?",
                "Cobertura_Medica"            as "cobertura_medica?",
                "Estudios"                     as "estudios?",
                "Oriundo"                      as "oriundo?",
                "Club_de_Origen"              as "club_de_origen?",
                "Club_de_Origen_Porcentaje"   as "club_de_origen_porcentaje?",
                "Posicion"                     as "posicion?",
                nombre                          as "nombre?",
                NULL::date                      as birthdate,
                NULL::uuid                      as current_team_id,
                NULL::text                      as position,
                NULL::bool                      as active
           FROM administrativo
          WHERE "Jugador" ILIKE $1 OR CAST("Documento_de_Identidad" AS TEXT) ILIKE $1
          ORDER BY "Jugador"
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
pub struct LineupItem { pub player_id: i32, pub team_id: Uuid, pub role: String, pub position: Option<String>, pub jersey_number: Option<i32> }
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
    pub player_id: Option<i32>,
    pub related_player_id: Option<i32>,
    pub minute: i32,
    pub added_time: Option<i32>,
    pub r#type: EventType,
    pub assist_player_id: Option<i32>,
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

// Read-only: get lineup for a match
pub async fn get_lineup(State(pool): State<Db>, Path(id): Path<Uuid>) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, String)> {
    let rows = sqlx::query!(
        r#"SELECT 
              mp.match_player_id,
              mp.match_id,
              mp.team_id,
              t.name AS team_name,
              mp.player_id,
              a."Jugador" as jugador,
              mp.role,
              mp.position,
              mp.jersey_number,
              -- minutes estimate: from 0 or sub_on minute to sub_off minute or 90
              COALESCE(
                (SELECT MIN(eo.minute) FROM events eo 
                   WHERE eo.match_id = mp.match_id AND eo.team_id = mp.team_id 
                     AND eo.type = 'sub_off' AND eo.player_id = mp.player_id),
                90
              ) - COALESCE(
                (SELECT MIN(ei.minute) FROM events ei 
                   WHERE ei.match_id = mp.match_id AND ei.team_id = mp.team_id 
                     AND ei.type = 'sub_on' AND ei.player_id = mp.player_id),
                0
              ) AS minutes_played
           FROM match_players mp
           JOIN teams t ON t.team_id = mp.team_id
           LEFT JOIN administrativo a ON a."Documento_de_Identidad" = mp.player_id
          WHERE mp.match_id = $1
          ORDER BY (CASE WHEN mp.role = 'starter' THEN 0 ELSE 1 END), a."Jugador" NULLS LAST, mp.match_player_id"#,
        id
    )
    .fetch_all(&pool)
    .await
    .map_err(internal_err)?;

    let data: Vec<serde_json::Value> = rows
        .into_iter()
        .map(|r| json!({
            "match_player_id": r.match_player_id,
            "match_id": r.match_id,
            "team_id": r.team_id,
            "team_name": r.team_name,
            "player_id": r.player_id,
            "jugador": r.jugador,
            "role": r.role,
            "position": r.position,
            "jersey_number": r.jersey_number,
            "minutes_played": r.minutes_played
        }))
        .collect();
    Ok(Json(json!({"lineup": data})))
}

// Read-only: get events for a match
pub async fn get_events(State(pool): State<Db>, Path(id): Path<Uuid>) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, String)> {
    #[derive(Debug)]
    struct EventRow {
        event_id: Uuid,
        match_id: Uuid,
        team_id: Uuid,
        team_name: String,
        player_id: Option<i32>,
        jugador: Option<String>,
        related_player_id: Option<i32>,
        related_jugador: Option<String>,
        minute: i32,
        added_time: Option<i32>,
        etype: EventType,
        assist_player_id: Option<i32>,
        assist_jugador: Option<String>,
        reason: Option<String>,
        data_json: Option<serde_json::Value>,
    }

    let rows = sqlx::query_as!(
        EventRow,
        r#"SELECT 
              e.event_id,
              e.match_id,
              e.team_id,
              t.name as team_name,
              e.player_id,
              ap."Jugador" as jugador,
              e.related_player_id,
              ar."Jugador" as related_jugador,
              e.minute,
              e.added_time,
              e.type as "etype: EventType",
              e.assist_player_id,
              aa."Jugador" as assist_jugador,
              e.reason,
              e.data_json
           FROM events e
           JOIN teams t ON t.team_id = e.team_id
           LEFT JOIN administrativo ap ON ap."Documento_de_Identidad" = e.player_id
           LEFT JOIN administrativo ar ON ar."Documento_de_Identidad" = e.related_player_id
           LEFT JOIN administrativo aa ON aa."Documento_de_Identidad" = e.assist_player_id
          WHERE e.match_id = $1
          ORDER BY e.minute, e.added_time NULLS LAST, e.event_id"#,
        id
    )
    .fetch_all(&pool)
    .await
    .map_err(internal_err)?;

    let data: Vec<serde_json::Value> = rows
        .into_iter()
        .map(|r| json!({
            "event_id": r.event_id,
            "match_id": r.match_id,
            "team_id": r.team_id,
            "team_name": r.team_name,
            "player_id": r.player_id,
            "jugador": r.jugador,
            "related_player_id": r.related_player_id,
            "related_jugador": r.related_jugador,
            "minute": r.minute,
            "added_time": r.added_time,
            "type": r.etype,
            "assist_player_id": r.assist_player_id,
            "assist_jugador": r.assist_jugador,
            "reason": r.reason,
            "data_json": r.data_json
        }))
        .collect();
    Ok(Json(json!({"events": data})))
}

// Read-only: normalized substitutions per match (paired)
pub async fn get_subs(State(pool): State<Db>, Path(id): Path<Uuid>) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, String)> {
    #[derive(Debug)]
    struct SubRow {
        minute: i32,
        team_id: Uuid,
        team_name: String,
        player_out_id: Option<i32>,
        player_out_name: Option<String>,
        player_in_id: Option<i32>,
        player_in_name: Option<String>,
    }

    let rows = sqlx::query_as!(
        SubRow,
        r#"SELECT 
              so.minute,
              so.team_id,
              t.name as team_name,
              so.player_id as player_out_id,
              aout."Jugador" as player_out_name,
              si.player_id as player_in_id,
              ain."Jugador" as player_in_name
           FROM events so
           JOIN events si ON si.match_id = so.match_id AND si.team_id = so.team_id AND si.minute = so.minute
                         AND so.type = 'sub_off' AND si.type = 'sub_on'
                         AND si.related_player_id = so.player_id AND so.related_player_id = si.player_id
           JOIN teams t ON t.team_id = so.team_id
           LEFT JOIN administrativo aout ON aout."Documento_de_Identidad" = so.player_id
           LEFT JOIN administrativo ain  ON ain."Documento_de_Identidad" = si.player_id
          WHERE so.match_id = $1
          ORDER BY so.minute, so.team_id"#,
        id
    )
    .fetch_all(&pool)
    .await
    .map_err(internal_err)?;

    let data: Vec<serde_json::Value> = rows
        .into_iter()
        .map(|r| json!({
            "minute": r.minute,
            "team_id": r.team_id,
            "team_name": r.team_name,
            "player_out_id": r.player_out_id,
            "player_out_name": r.player_out_name,
            "player_in_id": r.player_in_id,
            "player_in_name": r.player_in_name
        }))
        .collect();
    Ok(Json(json!({"subs": data})))
}



