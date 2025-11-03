use crate::modules::wcs_analysis as handlers;
use axum::{routing::get, Router};
use sqlx::PgPool;

pub fn wcs_routes(pool: PgPool) -> Router {
    Router::new()
        .route("/comparison-data", get(handlers::get_wcs_comparison_data))
        .route(
            "/comparison-by-position",
            get(handlers::get_wcs_comparison_by_position),
        )
        .route("/player-profiles", get(handlers::get_player_wcs_profiles))
        .route("/matches-info", get(handlers::get_wcs_matches_info))
        .route("/detailed-events", get(handlers::get_wcs_detailed_events))
        .with_state(pool)
}
