use crate::modules::admin_api as handlers;
use axum::{
    routing::{delete, get, post, put},
    Router,
};
use sqlx::PgPool;

// Mounted under /api in main.rs
pub fn admin_api(pool: PgPool) -> Router {
    Router::new()
        // Teams
        .route(
            "/teams",
            post(handlers::create_team).get(handlers::list_teams),
        )
        .route("/teams/:id", put(handlers::update_team))
        .route("/teams/:id", delete(handlers::delete_team))
        // Players
        .route(
            "/players",
            post(handlers::create_player).get(handlers::search_players),
        )
        .route("/players/active", get(handlers::get_active_players))
        .route("/players/import", post(handlers::import_players))
        // Competitions
        .route(
            "/competitions",
            post(handlers::create_competition).get(handlers::list_competitions),
        )
        .route("/competitions/:id", put(handlers::update_competition))
        .route("/competitions/:id", delete(handlers::delete_competition))
        // Venues
        .route(
            "/venues",
            post(handlers::create_venue).get(handlers::list_venues),
        )
        .route("/venues/:id", put(handlers::update_venue))
        .route(
            "/venues/:id/orientation",
            put(handlers::update_venue_orientation),
        )
        .route("/venues/:id", delete(handlers::delete_venue))
        // Matches
        .route(
            "/matches",
            post(handlers::create_match).get(handlers::list_matches),
        )
        .route("/matches/:id", get(handlers::get_match))
        .route("/matches/:id", put(handlers::update_match))
        .route("/matches/:id", delete(handlers::delete_match))
        .route("/matches/:id/lineup", get(handlers::get_lineup))
        .route("/matches/:id/lineup", put(handlers::upsert_lineup))
        .route("/matches/:id/events", get(handlers::get_events))
        .route("/matches/:id/events", put(handlers::upsert_events))
        .route("/matches/:id/subs", get(handlers::get_subs))
        .route("/matches/:id/confirm", post(handlers::confirm_match))
        // Match Players CRUD
        .route("/match-players", post(handlers::create_match_player))
        .route("/match-players/:id", get(handlers::get_match_player))
        .route("/match-players/:id", put(handlers::update_match_player))
        .route("/match-players/:id", delete(handlers::delete_match_player))
        .route(
            "/matches/:match_id/players",
            get(handlers::get_match_players_by_match),
        )
        // Upload/OCR pipeline
        .route("/upload_pdf", post(handlers::upload_pdf))
        .route("/upload_pdf_csv", post(handlers::upload_pdf_csv))
        .route("/uploads/:id/status", get(handlers::upload_status))
        // SQL execution (from LLM output)
        .route("/sql/execute", post(handlers::execute_sql))
        .with_state(pool)
}
