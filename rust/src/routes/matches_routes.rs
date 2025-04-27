use crate::modules::matches;
use axum::{routing::get, routing::post, Router};
use sqlx::PgPool;

// Already binded to /match in main.rs
pub fn matches_routes(pool: PgPool) -> Router {
    Router::new()
        .route("/:match_id/details", get(matches::get_match_details))
        .route(
            "/:match_id/gps",
            get(matches::get_match_gps_players_details),
        )
        .route("/:match_id/players", post(matches::submit_match_players))
        .route("/tables", get(matches::list_match_tables))
        .route(
            "/table/:table_name/players",
            get(matches::get_match_players),
        )
        .with_state(pool)
}
