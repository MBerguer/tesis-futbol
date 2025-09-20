use axum::{extract::{Path, State}, Json};
use axum::extract::Multipart;
use once_cell::sync::Lazy;
use std::collections::HashMap;
use std::sync::Mutex;
use axum::extract::Query;
use serde::Deserialize;
use serde_json::json;
use sqlx::PgPool;
use sqlx::Row;
use uuid::Uuid;

use crate::models::{Competition, EventType, Match, Player, Team, Venue};

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

pub async fn update_team(State(pool): State<Db>, Path(id): Path<Uuid>, Json(t): Json<Team>) -> Result<Json<Team>, (axum::http::StatusCode, String)> {
    let rec = sqlx::query_as!(
        Team,
        r#"UPDATE teams SET name = $2, category = $3 WHERE team_id = $1 RETURNING team_id, name, category"#,
        id, t.name, t.category
    ).fetch_one(&pool).await.map_err(internal_err)?;
    Ok(Json(rec))
}

pub async fn delete_team(State(pool): State<Db>, Path(id): Path<Uuid>) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, String)> {
    sqlx::query!("DELETE FROM teams WHERE team_id = $1", id).execute(&pool).await.map_err(internal_err)?;
    Ok(Json(json!({"status":"ok"})))
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

// Active players across the last N matches (default 10), joined with administrativo
// GET /api/players/active?limit_matches=10
pub async fn get_active_players(
    State(pool): State<Db>,
    Query(q): Query<std::collections::HashMap<String, String>>,
) -> Result<Json<Vec<serde_json::Value>>, (axum::http::StatusCode, String)> {
    let limit_matches: i64 = q
        .get("limit_matches")
        .and_then(|s| s.parse::<i64>().ok())
        .filter(|v| *v > 0)
        .unwrap_or(10);

    let rows = sqlx::query(
        r#"
        WITH recent_matches AS (
            SELECT match_id, match_date
            FROM matches
            ORDER BY match_date DESC
            LIMIT $1
        ),
        mp AS (
            SELECT mp.player_id, rm.match_date, mp.position
            FROM match_players mp
            JOIN recent_matches rm ON rm.match_id = mp.match_id
        )
        SELECT 
            a."Documento_de_Identidad"        AS documento_de_identidad,
            a."Jugador"                        AS jugador,
            a."Fecha_Nacimiento"              AS fecha_nacimiento,
            a."Pasaporte"                      AS pasaporte,
            a."Telefono"                       AS telefono,
            a."Celular"                        AS celular,
            a."Email"                          AS email,
            a."Cobertura_Medica"              AS cobertura_medica,
            a."Estudios"                       AS estudios,
            a."Oriundo"                        AS oriundo,
            a."Club_de_Origen"                AS club_de_origen,
            a."Club_de_Origen_Porcentaje"     AS club_de_origen_porcentaje,
            a."Posicion"                       AS posicion_adm,
            a.nombre                            AS nombre,
            COUNT(DISTINCT mp.match_date)       AS appearances,
            MAX(mp.match_date)                  AS last_match_date,
            MAX(mp.position) FILTER (WHERE mp.match_date = (SELECT MAX(match_date) FROM mp WHERE mp.player_id = a."Documento_de_Identidad")) AS last_position
        FROM mp
        LEFT JOIN administrativo a ON a."Documento_de_Identidad" = mp.player_id
        GROUP BY 
            a."Documento_de_Identidad",
            a."Jugador",
            a."Fecha_Nacimiento",
            a."Pasaporte",
            a."Telefono",
            a."Celular",
            a."Email",
            a."Cobertura_Medica",
            a."Estudios",
            a."Oriundo",
            a."Club_de_Origen",
            a."Club_de_Origen_Porcentaje",
            a."Posicion",
            a.nombre
        ORDER BY last_match_date DESC NULLS LAST, jugador NULLS LAST
        "#,
    )
    .bind(limit_matches)
    .fetch_all(&pool)
    .await
    .map_err(internal_err)?;

    let data: Vec<serde_json::Value> = rows
        .into_iter()
        .map(|r| {
            // Map to JSON, using documento_de_identidad as id
            let id: i32 = r.try_get("documento_de_identidad").unwrap_or(0);
            json!({
                "id": id,
                "Documento_de_Identidad": id,
                "Jugador": r.try_get::<String, _>("jugador").ok(),
                "nombre": r.try_get::<String, _>("nombre").ok(),
                "Fecha_Nacimiento": r.try_get::<String, _>("fecha_nacimiento").ok(),
                "Pasaporte": r.try_get::<String, _>("pasaporte").ok(),
                "Telefono": r.try_get::<String, _>("telefono").ok(),
                "Celular": r.try_get::<String, _>("celular").ok(),
                "Email": r.try_get::<String, _>("email").ok(),
                "Cobertura_Medica": r.try_get::<String, _>("cobertura_medica").ok(),
                "Estudios": r.try_get::<String, _>("estudios").ok(),
                "Oriundo": r.try_get::<String, _>("oriundo").ok(),
                "Club_de_Origen": r.try_get::<String, _>("club_de_origen").ok(),
                "Club_de_Origen_Porcentaje": r.try_get::<String, _>("club_de_origen_porcentaje").ok(),
                // Prefer last_position when available, otherwise administrativo.Posicion
                "Posicion": r.try_get::<String, _>("last_position").ok().or_else(|| r.try_get::<String, _>("posicion_adm").ok()),
                "appearances": r.try_get::<i64, _>("appearances").unwrap_or(0),
                "last_match_date": r.try_get::<chrono::DateTime<chrono::Utc>, _>("last_match_date").ok()
            })
        })
        .collect();

    Ok(Json(data))
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
    pub gps_table_name: Option<String>,
}

pub async fn create_match(State(pool): State<Db>, Json(mp): Json<MatchPayload>) -> Result<Json<Match>, (axum::http::StatusCode, String)> {
    // idempotency by source_pdf_hash
    if let Some(ref h) = mp.source_pdf_hash {
        if let Some(existing) = sqlx::query_as!(
            Match,
            r#"SELECT match_id, competition_id, match_date, venue_id, category, home_team_id, away_team_id, result_home, result_away, youtube_link, notes, source_pdf_hash, parse_confidence, gps_table_name
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
        r#"INSERT INTO matches (match_id, competition_id, match_date, venue_id, category, home_team_id, away_team_id, youtube_link, notes, source_pdf_hash, gps_table_name)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
           RETURNING match_id, competition_id, match_date, venue_id, category, home_team_id, away_team_id, result_home, result_away, youtube_link, notes, source_pdf_hash, parse_confidence, gps_table_name"#,
        Uuid::new_v4(), mp.competition_id, mp.match_date, mp.venue_id, mp.category, mp.home_team_id, mp.away_team_id, mp.youtube_link, mp.notes, mp.source_pdf_hash, mp.gps_table_name
    )
    .fetch_one(&pool)
    .await
    .map_err(internal_err)?;
    Ok(Json(rec))
}

pub async fn list_matches(State(pool): State<Db>) -> Result<Json<Vec<serde_json::Value>>, (axum::http::StatusCode, String)> {
    let rows = sqlx::query!(
        r#"
        SELECT 
          m.match_id,
          m.competition_id,
          m.match_date,
          m.venue_id,
          m.category,
          m.home_team_id,
          m.away_team_id,
          m.result_home,
          m.result_away,
          m.youtube_link,
          m.notes,
          m.source_pdf_hash,
          m.parse_confidence,
          m.gps_table_name,
          th.name AS home_team_name,
          ta.name AS away_team_name
        FROM matches m
        JOIN teams th ON th.team_id = m.home_team_id
        JOIN teams ta ON ta.team_id = m.away_team_id
        ORDER BY m.match_date DESC
        "#
    )
    .fetch_all(&pool)
    .await
    .map_err(internal_err)?;

    let data: Vec<serde_json::Value> = rows
        .into_iter()
        .map(|r| json!({
            "match_id": r.match_id,
            "competition_id": r.competition_id,
            "match_date": r.match_date,
            "venue_id": r.venue_id,
            "category": r.category,
            "home_team_id": r.home_team_id,
            "away_team_id": r.away_team_id,
            "result_home": r.result_home,
            "result_away": r.result_away,
            "youtube_link": r.youtube_link,
            "notes": r.notes,
            "source_pdf_hash": r.source_pdf_hash,
            "parse_confidence": r.parse_confidence,
            "gps_table_name": r.gps_table_name,
            "home_team_name": r.home_team_name,
            "away_team_name": r.away_team_name,
        }))
        .collect();

    Ok(Json(data))
}

// Get single match with team names
pub async fn get_match(State(pool): State<Db>, Path(id): Path<Uuid>) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, String)> {
    let r = sqlx::query!(
        r#"
        SELECT 
          m.match_id,
          m.competition_id,
          m.match_date,
          m.venue_id,
          m.category,
          m.home_team_id,
          m.away_team_id,
          m.result_home,
          m.result_away,
          m.youtube_link,
          m.notes,
          m.source_pdf_hash,
          m.parse_confidence,
          m.gps_table_name,
          th.name AS home_team_name,
          ta.name AS away_team_name,
          c.name  AS competition_name,
          v.name  AS venue_name,
          v.city  AS venue_city,
          v.latitude AS venue_latitude,
          v.longitude AS venue_longitude,
          v.orientation AS venue_orientation
        FROM matches m
        JOIN teams th ON th.team_id = m.home_team_id
        JOIN teams ta ON ta.team_id = m.away_team_id
        LEFT JOIN competitions c ON c.competition_id = m.competition_id
        LEFT JOIN venues v ON v.venue_id = m.venue_id
        WHERE m.match_id = $1
        "#,
        id
    ).fetch_one(&pool).await.map_err(internal_err)?;

    Ok(Json(json!({
        "match_id": r.match_id,
        "competition_id": r.competition_id,
        "competition_name": r.competition_name,
        "match_date": r.match_date,
        "venue_id": r.venue_id,
        "venue_name": r.venue_name,
        "venue_city": r.venue_city,
        "venue_latitude": r.venue_latitude,
        "venue_longitude": r.venue_longitude,
        "venue_orientation": r.venue_orientation,
        "category": r.category,
        "home_team_id": r.home_team_id,
        "away_team_id": r.away_team_id,
        "result_home": r.result_home,
        "result_away": r.result_away,
        "youtube_link": r.youtube_link,
        "notes": r.notes,
        "source_pdf_hash": r.source_pdf_hash,
        "parse_confidence": r.parse_confidence,
        "gps_table_name": r.gps_table_name,
        "home_team_name": r.home_team_name,
        "away_team_name": r.away_team_name,
    })))
}

// Update/delete match
#[derive(Deserialize)]
pub struct MatchUpdatePayload {
    pub competition_id: Option<Uuid>,
    pub match_date: Option<chrono::DateTime<chrono::Utc>>,
    pub venue_id: Option<Uuid>,
    pub category: Option<String>,
    pub home_team_id: Option<Uuid>,
    pub away_team_id: Option<Uuid>,
    pub result_home: Option<i32>,
    pub result_away: Option<i32>,
    pub youtube_link: Option<String>,
    pub notes: Option<String>,
    pub gps_table_name: Option<String>,
}
pub async fn update_match(State(pool): State<Db>, Path(id): Path<Uuid>, Json(mp): Json<MatchUpdatePayload>) -> Result<Json<Match>, (axum::http::StatusCode, String)> {
    let rec = sqlx::query_as!(
        Match,
        r#"UPDATE matches SET
             competition_id = COALESCE($2, competition_id),
             match_date     = COALESCE($3, match_date),
             venue_id       = COALESCE($4, venue_id),
             category       = COALESCE($5, category),
             home_team_id   = COALESCE($6, home_team_id),
             away_team_id   = COALESCE($7, away_team_id),
             result_home    = COALESCE($8, result_home),
             result_away    = COALESCE($9, result_away),
             youtube_link   = COALESCE($10, youtube_link),
             notes          = COALESCE($11, notes),
             gps_table_name = COALESCE($12, gps_table_name)
           WHERE match_id = $1
           RETURNING match_id, competition_id, match_date, venue_id, category, home_team_id, away_team_id, result_home, result_away, youtube_link, notes, source_pdf_hash, parse_confidence, gps_table_name"#,
        id, mp.competition_id, mp.match_date, mp.venue_id, mp.category, mp.home_team_id, mp.away_team_id, mp.result_home, mp.result_away, mp.youtube_link, mp.notes, mp.gps_table_name
    ).fetch_one(&pool).await.map_err(internal_err)?;
    Ok(Json(rec))
}
pub async fn delete_match(State(pool): State<Db>, Path(id): Path<Uuid>) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, String)> {
    sqlx::query!("DELETE FROM matches WHERE match_id = $1", id).execute(&pool).await.map_err(internal_err)?;
    Ok(Json(json!({"status":"ok"})))
}

// Competitions CRUD
pub async fn create_competition(State(pool): State<Db>, Json(mut c): Json<Competition>) -> Result<Json<Competition>, (axum::http::StatusCode, String)> {
    if c.competition_id.is_nil() { c.competition_id = Uuid::new_v4(); }
    let rec = sqlx::query_as!(
        Competition,
        r#"INSERT INTO competitions (competition_id, name, season)
           VALUES ($1,$2,$3)
           RETURNING competition_id, name, season"#,
        c.competition_id, c.name, c.season
    ).fetch_one(&pool).await.map_err(internal_err)?;
    Ok(Json(rec))
}
pub async fn list_competitions(State(pool): State<Db>) -> Result<Json<Vec<Competition>>, (axum::http::StatusCode, String)> {
    let recs = sqlx::query_as!(Competition, r#"SELECT competition_id, name, season FROM competitions ORDER BY name"#)
        .fetch_all(&pool).await.map_err(internal_err)?;
    Ok(Json(recs))
}
pub async fn update_competition(State(pool): State<Db>, Path(id): Path<Uuid>, Json(c): Json<Competition>) -> Result<Json<Competition>, (axum::http::StatusCode, String)> {
    let rec = sqlx::query_as!(
        Competition,
        r#"UPDATE competitions SET name = $2, season = $3 WHERE competition_id = $1
           RETURNING competition_id, name, season"#,
        id, c.name, c.season
    ).fetch_one(&pool).await.map_err(internal_err)?;
    Ok(Json(rec))
}
pub async fn delete_competition(State(pool): State<Db>, Path(id): Path<Uuid>) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, String)> {
    sqlx::query!("DELETE FROM competitions WHERE competition_id = $1", id).execute(&pool).await.map_err(internal_err)?;
    Ok(Json(json!({"status":"ok"})))
}

// Venues CRUD
pub async fn create_venue(State(pool): State<Db>, Json(mut v): Json<Venue>) -> Result<Json<Venue>, (axum::http::StatusCode, String)> {
    if v.venue_id.is_nil() { v.venue_id = Uuid::new_v4(); }
    let rec = sqlx::query_as!(
        Venue,
        r#"INSERT INTO venues (venue_id, name, city, latitude, longitude, orientation)
           VALUES ($1,$2,$3,$4,$5,$6)
           RETURNING venue_id, name, city, latitude, longitude, orientation"#,
        v.venue_id, v.name, v.city, v.latitude, v.longitude, v.orientation
    ).fetch_one(&pool).await.map_err(internal_err)?;
    Ok(Json(rec))
}
pub async fn list_venues(State(pool): State<Db>) -> Result<Json<Vec<Venue>>, (axum::http::StatusCode, String)> {
    let recs = sqlx::query_as!(Venue, r#"SELECT venue_id, name, city, latitude, longitude, orientation FROM venues ORDER BY name"#)
        .fetch_all(&pool).await.map_err(internal_err)?;
    Ok(Json(recs))
}
pub async fn update_venue(State(pool): State<Db>, Path(id): Path<Uuid>, Json(v): Json<Venue>) -> Result<Json<Venue>, (axum::http::StatusCode, String)> {
    let rec = sqlx::query_as!(
        Venue,
        r#"UPDATE venues SET name = $2, city = $3, latitude = $4, longitude = $5, orientation = $6 WHERE venue_id = $1
           RETURNING venue_id, name, city, latitude, longitude, orientation"#,
        id, v.name, v.city, v.latitude, v.longitude, v.orientation
    ).fetch_one(&pool).await.map_err(internal_err)?;
    Ok(Json(rec))
}
pub async fn delete_venue(State(pool): State<Db>, Path(id): Path<Uuid>) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, String)> {
    sqlx::query!("DELETE FROM venues WHERE venue_id = $1", id).execute(&pool).await.map_err(internal_err)?;
    Ok(Json(json!({"status":"ok"})))
}

// Update only the venue orientation
#[derive(serde::Deserialize)]
pub struct VenueOrientationPayload { pub orientation: i32 }
pub async fn update_venue_orientation(State(pool): State<Db>, Path(id): Path<Uuid>, Json(p): Json<VenueOrientationPayload>) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, String)> {
    let clamped = p.orientation.max(-180).min(180);
    let row = sqlx::query!(
        r#"UPDATE venues SET orientation = $2 WHERE venue_id = $1 RETURNING orientation"#,
        id,
        clamped
    ).fetch_one(&pool).await.map_err(internal_err)?;
    Ok(Json(json!({ "status": "ok", "orientation": row.orientation })))
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
static UPLOAD_JOBS: Lazy<Mutex<HashMap<Uuid, serde_json::Value>>> = Lazy::new(|| Mutex::new(HashMap::new()));

pub async fn upload_status(Path(id): Path<Uuid>) -> Json<serde_json::Value> {
    let jobs = UPLOAD_JOBS.lock().unwrap();
    if let Some(v) = jobs.get(&id) { return Json(v.clone()); }
    Json(json!({"status": "not_found"}))
}

// Minimal PDF + CSV multipart upload confirmation
pub async fn upload_pdf_csv(mut multipart: Multipart) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, String)> {
    use axum::http::StatusCode;

    let mut pdf_meta: Option<(String, usize)> = None;
    let mut pdf_bytes: Option<Vec<u8>> = None;
    let mut csv_meta: Option<(String, usize)> = None;

    while let Ok(Some(field)) = multipart.next_field().await {
        let name = field.name().map(|s| s.to_string());
        let file_name = field.file_name().map(|s| s.to_string()).unwrap_or_else(|| "unknown".to_string());
        let bytes = field.bytes().await.map_err(internal_err)?;
        let size = bytes.len();

        match name.as_deref() {
            Some("pdf") => { pdf_meta = Some((file_name, size)); pdf_bytes = Some(bytes.to_vec()); },
            Some("csv") => csv_meta = Some((file_name, size)),
            _ => {}
        }
    }

    if pdf_meta.is_none() && csv_meta.is_none() {
        return Err((StatusCode::BAD_REQUEST, "At least one of 'pdf' or 'csv' must be provided".into()));
    }

    let upload_id = Uuid::new_v4();

    // Kick off background OpenAI processing if we received a PDF
    if let Some((pdf_name, pdf_size)) = pdf_meta.clone() {
        let job_id = upload_id;
        {
            let mut jobs = UPLOAD_JOBS.lock().unwrap();
            jobs.insert(job_id, json!({
                "status": "processing",
                "type": "pdf",
                "pdf": {"filename": pdf_name, "size": pdf_size}
            }));
        }
        let pdf_name_clone = pdf_name.clone();
        let pdf_payload = pdf_bytes.clone().unwrap_or_default();
        tokio::spawn(async move {
            let result = process_pdf_with_openai(job_id, pdf_name_clone, pdf_payload).await;
            let mut jobs = UPLOAD_JOBS.lock().unwrap();
            jobs.insert(job_id, result);
        });
    }

    Ok(Json(json!({
        "status": "ok",
        "upload_id": upload_id,
        "pdf": pdf_meta.map(|(filename, size)| json!({"filename": filename, "size": size})),
        "csv": csv_meta.map(|(filename, size)| json!({"filename": filename, "size": size}))
    })))
}

async fn process_pdf_with_openai(job_id: Uuid, pdf_name: String, pdf_bytes: Vec<u8>) -> serde_json::Value {
    // Read API key from env
    let api_key = std::env::var("OPENAI_API_KEY").unwrap_or_default();
    if api_key.is_empty() {
        return json!({"status": "error", "error": "OPENAI_API_KEY not configured", "job_id": job_id});
    }

    let api_base = std::env::var("OPENAI_API_BASE").unwrap_or_else(|_| "https://api.openai.com".to_string());
    let client = reqwest::Client::new();

    // 1) Upload PDF to Files API
    let form = reqwest::multipart::Form::new()
        .text("purpose", "user_data")
        .part(
            "file",
            reqwest::multipart::Part::bytes(pdf_bytes)
                .file_name(pdf_name.clone())
                .mime_str("application/pdf").unwrap()
        );

    let upload_resp = match client
        .post(format!("{}/v1/files", api_base))
        .bearer_auth(&api_key)
        .multipart(form)
        .send()
        .await
    {
        Ok(r) => r,
        Err(e) => return json!({"status": "error", "error": format!("file upload failed: {}", e), "job_id": job_id}),
    };

    if !upload_resp.status().is_success() {
        let status = upload_resp.status();
        let txt = upload_resp.text().await.unwrap_or_default();
        return json!({"status": "error", "error": format!("file upload http {}: {}", status, txt), "job_id": job_id});
    }

    let upload_json: serde_json::Value = match upload_resp.json().await {
        Ok(j) => j,
        Err(e) => return json!({"status": "error", "error": format!("file upload parse failed: {}", e), "job_id": job_id}),
    };
    let file_id = match upload_json.get("id").and_then(|v| v.as_str()) {
        Some(s) => s.to_string(),
        None => return json!({"status": "error", "error": "no file id returned", "job_id": job_id, "upload": upload_json}),
    };

    // 2) Create a Response with system prompt + file input
    let model = std::env::var("OPENAI_MODEL").unwrap_or_else(|_| "gpt-4o-mini".to_string());
    let body = json!({
        "model": model,
        "input": [
          {
            "role": "system",
            "content": [ { "type": "input_text", "text": "You are an expert in PDFs. Tell me what this is about." } ]
          },
          {
            "role": "user",
            "content": [
              { "type": "input_text", "text": "Please analyze the attached PDF and summarize what it's about." },
              { "type": "input_file", "file_id": file_id }
            ]
          }
        ]
    });

    // Create response with simple retry on rate limits
    let mut attempt: i32 = 0;
    let max_attempts: i32 = 6; // ~ up to ~63s total backoff
    let mut last_err: String = String::new();
    let response_id: String;
    loop {
        attempt += 1;
        let resp_res = client
            .post(format!("{}/v1/responses", api_base))
            .bearer_auth(&api_key)
            .json(&body)
            .send()
            .await;

        match resp_res {
            Ok(resp) => {
                if resp.status().is_success() {
                    let create_json: serde_json::Value = match resp.json().await {
                        Ok(j) => j,
                        Err(e) => return json!({"status": "error", "error": format!("create response parse failed: {}", e), "job_id": job_id}),
                    };
                    if let Some(id) = create_json.get("id").and_then(|v| v.as_str()) {
                        response_id = id.to_string();
                        break;
                    } else {
                        return json!({"status": "error", "error": "no response id returned", "job_id": job_id, "response": create_json});
                    }
                } else {
                    let status = resp.status();
                    let txt = resp.text().await.unwrap_or_default();
                    if status.as_u16() == 429 {
                        last_err = txt.clone();
                        if attempt >= max_attempts {
                            return json!({
                                "status": "error",
                                "error": format!("rate limited creating response after {} attempts: {}", attempt, last_err),
                                "job_id": job_id,
                                "rate_limited": true
                            });
                        }
                        let delay = 1 << attempt.min(5); // 2,4,8,16,32
                        tokio::time::sleep(std::time::Duration::from_secs(delay as u64)).await;
                        continue;
                    }
                    return json!({"status": "error", "error": format!("create response http {}: {}", status, txt), "job_id": job_id});
                }
            }
            Err(e) => return json!({"status": "error", "error": format!("create response failed: {}", e), "job_id": job_id}),
        }
    }

    // 3) Poll until completed/failed
    let mut attempts: i32 = 0;
    loop {
        attempts += 1;
        let r = match client
            .get(format!("{}/v1/responses/{}", api_base, response_id))
            .bearer_auth(&api_key)
            .send()
            .await
        {
            Ok(r) => r,
            Err(e) => return json!({"status": "error", "error": format!("poll failed: {}", e), "job_id": job_id, "response_id": response_id}),
        };
        if !r.status().is_success() {
            let status = r.status();
            let txt = r.text().await.unwrap_or_default();
            if status.as_u16() == 429 {
                // backoff a bit and continue polling
                tokio::time::sleep(std::time::Duration::from_secs(2)).await;
                continue;
            }
            return json!({"status": "error", "error": format!("poll http {}: {}", status, txt), "job_id": job_id, "response_id": response_id});
        }
        let js: serde_json::Value = match r.json().await { Ok(v) => v, Err(e) => json!({"error": format!("poll parse: {}", e)}) };
        let status = js.get("status").and_then(|v| v.as_str()).unwrap_or("");
        if status == "completed" {
            // Try to extract a single text output if present
            let summary = js.get("output_text").cloned().or_else(|| {
                // fallback: traverse output array
                let mut text = String::new();
                if let Some(arr) = js.get("output").and_then(|v| v.as_array()) {
                    for item in arr {
                        if let Some(content_arr) = item.get("content").and_then(|v| v.as_array()) {
                            for c in content_arr {
                                if c.get("type").and_then(|t| t.as_str()) == Some("output_text") {
                                    if let Some(t) = c.get("text").and_then(|t| t.as_str()) { text.push_str(t); text.push('\n'); }
                                }
                            }
                        }
                    }
                }
                if text.is_empty() { None } else { Some(json!(text)) }
            });
            return json!({
                "status": "completed",
                "job_id": job_id,
                "response_id": response_id,
                "summary": summary,
                "raw": js
            });
        } else if status == "failed" || status == "cancelled" || status == "expired" {
            return json!({"status": "error", "job_id": job_id, "response_id": response_id, "raw": js});
        }
        if attempts > 120 { // ~2 minutes at 1s interval
            return json!({"status": "error", "error": "timeout waiting for openai response", "job_id": job_id, "response_id": response_id});
        }
        tokio::time::sleep(std::time::Duration::from_secs(1)).await;
    }
}

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
              COALESCE(mp.position, a."Posicion") AS position,
              mp.jersey_number,
              -- minutes played: starters from 0 to sub_off/90; subs only if sub_on exists
              GREATEST(
                CASE 
                  WHEN mp.role = 'starter' THEN
                    COALESCE(
                      (SELECT MIN(eo.minute) FROM events eo 
                        WHERE eo.match_id = mp.match_id AND eo.team_id = mp.team_id 
                          AND eo.type = 'sub_off' AND eo.player_id = mp.player_id),
                      90
                    )
                  WHEN EXISTS (
                      SELECT 1 FROM events ei 
                      WHERE ei.match_id = mp.match_id AND ei.team_id = mp.team_id 
                        AND ei.type = 'sub_on' AND ei.player_id = mp.player_id
                  ) THEN
                    COALESCE(
                      (SELECT MIN(eo.minute) FROM events eo 
                        WHERE eo.match_id = mp.match_id AND eo.team_id = mp.team_id 
                          AND eo.type = 'sub_off' AND eo.player_id = mp.player_id),
                      90
                    ) - (
                      SELECT MIN(ei.minute) FROM events ei 
                        WHERE ei.match_id = mp.match_id AND ei.team_id = mp.team_id 
                          AND ei.type = 'sub_on' AND ei.player_id = mp.player_id
                    )
                  ELSE 0
                END,
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



