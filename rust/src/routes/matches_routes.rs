use crate::modules::matches;
use axum::{routing::get, routing::post, Router};

// Already binded to /match in main.rs
pub fn matches_routes() -> Router {
    Router::new()
    .route("/:match_id/details", get(matches::get_match_details))
    .route("/:match_id/gps", get(matches::get_match_gps_players_details))
    .route("/:match_id/players", post(matches::submit_match_players))
}