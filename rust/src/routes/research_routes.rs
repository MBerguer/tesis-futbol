use crate::modules::research as handlers;
use axum::{routing::get, Router};
use sqlx::PgPool;

pub fn research_routes(pool: PgPool) -> Router {
    Router::new()
        .route("/all-charts-data", get(handlers::get_all_charts_data))
        .route(
            "/distance-per-minute",
            get(handlers::get_distance_per_minute),
        )
        .route(
            "/distance-in-zone-per-minute",
            get(handlers::get_distance_in_zone_per_minute),
        )
        .route(
            "/sprint-distance-per-minute",
            get(handlers::get_sprint_distance_per_minute),
        )
        .route(
            "/high-accel-decel-per-minute",
            get(handlers::get_high_accel_decel_per_minute),
        )
        .route(
            "/accel-decel-separated-per-minute",
            get(handlers::get_accel_decel_separated_per_minute),
        )
        .route(
            "/accel-decel-ratio-per-minute",
            get(handlers::get_accel_decel_ratio_per_minute),
        )
        .route("/available-matches", get(handlers::get_available_matches))
        .route(
            "/speed-zones-summary",
            get(handlers::get_speed_zones_summary),
        )
        .route(
            "/match-aggregate-stats",
            get(handlers::get_match_aggregate_stats),
        )
        .route(
            "/acceleration-charts-data",
            get(handlers::get_acceleration_charts_data),
        )
        .with_state(pool)
}
