use axum::{extract::{Path, State}, Json};
use axum_extra::extract::Multipart;
use serde::{Deserialize};
use serde_json::json;
use sqlx::PgPool;
use uuid::Uuid;

use crate::models::{EventType, Match, Player, Team};

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
pub async fn import_players(State(pool): State<Db>, mut multipart: Multipart) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, String)> {
    // Expect a single CSV file part named "file". Columns: full_name,national_id,birthdate(YYYY-MM-DD),current_team_id,position
    let mut imported: i64 = 0;
    while let Some(field) = multipart.next_field().await.map_err(internal_err)? {
        let name = field.name().map(|s| s.to_string()).unwrap_or_default();
        if name != "file" { continue; }
        let bytes = field.bytes().await.map_err(internal_err)?;
        let mut rdr = csv::ReaderBuilder::new().flexible(true).from_reader(bytes.as_ref());
        let mut tx = pool.begin().await.map_err(internal_err)?;
        for rec in rdr.records() {
            let rec = rec.map_err(internal_err)?;
            let full_name = rec.get(0).unwrap_or("").trim().to_string();
            let national_id = rec.get(1).unwrap_or("").trim().to_string();
            if full_name.is_empty() || national_id.is_empty() { continue; }
            let birthdate = rec.get(2).and_then(|s| if s.trim().is_empty() { None } else { chrono::NaiveDate::parse_from_str(s.trim(), "%Y-%m-%d").ok() });
            let current_team_id = rec.get(3).and_then(|s| uuid::Uuid::parse_str(s.trim()).ok());
            let position = rec.get(4).map(|s| s.trim().to_string()).filter(|s| !s.is_empty());
            // Upsert by national_id
            sqlx::query!(
                r#"INSERT INTO players (player_id, full_name, national_id, birthdate, current_team_id, position, active)
                   VALUES ($1,$2,$3,$4,$5,$6, TRUE)
                   ON CONFLICT (national_id) DO UPDATE SET
                     full_name = EXCLUDED.full_name,
                     birthdate = EXCLUDED.birthdate,
                     current_team_id = EXCLUDED.current_team_id,
                     position = EXCLUDED.position
                "#,
                Uuid::new_v4(), full_name, national_id, birthdate, current_team_id, position
            ).execute(&mut *tx).await.map_err(internal_err)?;
            imported += 1;
        }
        tx.commit().await.map_err(internal_err)?;
        break;
    }
    Ok(Json(json!({"status": "ok", "imported": imported})))
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
pub async fn upload_pdf(State(pool): State<Db>, mut multipart: Multipart) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, String)> {
    // Accept PDF and optional source_pdf_hash
    use sha2::{Digest, Sha256};
    let mut provided_hash: Option<String> = None;
    let mut computed_hash: Option<String> = None;
    let mut pdf_bytes: Option<bytes::Bytes> = None;
    while let Some(field) = multipart.next_field().await.map_err(internal_err)? {
        let name = field.name().unwrap_or("");
        if name == "source_pdf_hash" {
            let s = field.text().await.map_err(internal_err)?;
            if !s.trim().is_empty() { provided_hash = Some(s.trim().to_string()); }
        } else if name == "file" {
            let bytes = field.bytes().await.map_err(internal_err)?;
            let mut hasher = Sha256::new();
            hasher.update(&bytes);
            computed_hash = Some(format!("sha256:{}", hex::encode(hasher.finalize())));
            pdf_bytes = Some(bytes);
        }
    }
    let hash = provided_hash.or(computed_hash).unwrap_or_else(|| "sha256:empty".to_string());

    // Idempotency: if upload already exists, reuse it and its draft match; otherwise, create them
    let existing = sqlx::query!(
        r#"SELECT upload_id, status, match_id FROM uploads WHERE source_pdf_hash = $1"#,
        hash
    ).fetch_optional(&pool).await.map_err(internal_err)?;

    // Ensure placeholder team exists to satisfy FKs (until parsing fills real teams)
    let placeholder_team = sqlx::query!(
        r#"SELECT team_id FROM teams WHERE name = 'Unknown Team'"#
    ).fetch_optional(&pool).await.map_err(internal_err)?
        .map(|r| r.team_id)
        .unwrap_or({
            let rec = sqlx::query!(
                r#"INSERT INTO teams (team_id, name, category) VALUES ($1,'Unknown Team','Unknown') RETURNING team_id"#,
                Uuid::new_v4()
            ).fetch_one(&pool).await.map_err(internal_err)?;
            rec.team_id
        });
    
    // Derive upload/match ids
    let (upload_id, match_id) = if let Some(existing) = existing {
        (existing.upload_id, existing.match_id)
    } else {
        let draft_match = sqlx::query!(
            r#"INSERT INTO matches (match_id, match_date, home_team_id, away_team_id, notes, source_pdf_hash)
               VALUES ($1, NOW(), $2, $3, $4, $5)
               RETURNING match_id"#,
            Uuid::new_v4(),
            placeholder_team,
            placeholder_team,
            Some("draft created from upload".to_string()),
            Some(hash.clone())
        ).fetch_one(&pool).await.map_err(internal_err)?;

        let up = sqlx::query!(
            r#"INSERT INTO uploads (upload_id, source_pdf_hash, status, match_id)
               VALUES ($1, $2, 'received', $3)
               RETURNING upload_id"#,
            Uuid::new_v4(), hash, draft_match.match_id
        ).fetch_one(&pool).await.map_err(internal_err)?;
        (up.upload_id, draft_match.match_id)
    };
 
    // Synchronous parsing (phase 1): mark processing, do lightweight text extraction heuristics
    let _ = sqlx::query!(
        r#"UPDATE uploads SET status = 'processing', updated_at = NOW() WHERE upload_id = $1"#,
        upload_id
    ).execute(&pool).await.map_err(internal_err)?;

    // Heuristic: try to extract plain text from the PDF bytes (works only if text layer exists)
    let mut detected_home: Option<String> = None;
    let mut detected_away: Option<String> = None;
    let mut detected_date: Option<String> = None;
    if let Some(bytes) = &pdf_bytes {
        // Very naive: search for known tokens; fallback remains empty which the UI will allow to edit
        // Look for patterns like "Nacional", "Juventud", and a date like DD/MM/YYYY or DD-MM-YYYY
        let text = String::from_utf8_lossy(bytes);
        let re_date = regex::Regex::new(r"(?P<d>\b\d{1,2})[\/-](?P<m>\d{1,2})[\/-](?P<y>\d{2,4})").ok();
        if let Some(caps) = re_date.as_ref().and_then(|r| r.captures(&text)) {
            let d = caps.name("d").map(|m| m.as_str()).unwrap_or("");
            let m = caps.name("m").map(|m| m.as_str()).unwrap_or("");
            let y = caps.name("y").map(|m| m.as_str()).unwrap_or("");
            detected_date = Some(format!("{}-{:0>2}-{:0>2}", y, m, d));
        }
        // Team name hints
        if text.contains("Nacional") { detected_home = Some("Nacional".to_string()); }
        if text.contains("Juventud") { detected_away = Some("Juventud".to_string()); }
    }

    // TODO: In a future step, if no text layer, render + OCR and parse structured tables

    let draft = sqlx::query!(
        r#"SELECT match_id, match_date, home_team_id, away_team_id, result_home, result_away
           FROM matches WHERE match_id = $1"#,
        match_id
    ).fetch_one(&pool).await.map_err(internal_err)?;

    let _ = sqlx::query!(
        r#"UPDATE uploads SET status = 'done', updated_at = NOW() WHERE upload_id = $1"#,
        upload_id
    ).execute(&pool).await.map_err(internal_err)?;

    Ok(Json(json!({
        "upload_id": upload_id,
        "status": "done",
        "match_id": match_id,
        "source_pdf_hash": hash,
        "draft": {
            "match": {
                "match_id": draft.match_id,
                "match_date": draft.match_date,
                "home_team_id": draft.home_team_id,
                "away_team_id": draft.away_team_id,
                "result_home": draft.result_home,
                "result_away": draft.result_away,
                "detected_date": detected_date
            },
            "teams": [
                { "hint": detected_home },
                { "hint": detected_away }
            ],
            "players": [],
            "events": []
        }
    })))
}
pub async fn upload_status(State(pool): State<Db>, Path(id): Path<Uuid>) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, String)> {
    let row = sqlx::query!(
        r#"SELECT upload_id, status, match_id, source_pdf_hash, error, created_at, updated_at FROM uploads WHERE upload_id = $1"#,
        id
    ).fetch_optional(&pool).await.map_err(internal_err)?;
    if let Some(r) = row {
        Ok(Json(json!({
            "upload_id": r.upload_id,
            "status": r.status,
            "match_id": r.match_id,
            "source_pdf_hash": r.source_pdf_hash,
            "error": r.error,
            "created_at": r.created_at,
            "updated_at": r.updated_at
        })))
    } else {
        Err((axum::http::StatusCode::NOT_FOUND, "upload not found".to_string()))
    }
}

fn internal_err<E: std::fmt::Display>(e: E) -> (axum::http::StatusCode, String) {
    (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
}



