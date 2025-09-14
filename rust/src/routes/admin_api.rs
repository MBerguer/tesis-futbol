use crate::modules::admin_api as handlers;
use axum::{routing::{get, post, put}, Router};
use sqlx::PgPool;

// Mounted under /api in main.rs
pub fn admin_api(pool: PgPool) -> Router {
    Router::new()
        // Teams
        .route("/teams", post(handlers::create_team).get(handlers::list_teams))
        // Players
        .route("/players", post(handlers::create_player).get(handlers::search_players))
        .route("/players/import", post(handlers::import_players))
        // Matches
        .route("/matches", post(handlers::create_match).get(handlers::list_matches))
        .route("/matches/:id/lineup", put(handlers::upsert_lineup))
        .route("/matches/:id/events", put(handlers::upsert_events))
        .route("/matches/:id/confirm", post(handlers::confirm_match))
        // Upload/OCR pipeline
        .route("/upload_pdf", post(handlers::upload_pdf))
        .route("/uploads/:id/status", get(handlers::upload_status))
        .with_state(pool)
}


