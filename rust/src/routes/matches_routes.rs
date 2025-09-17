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
        .route("/by-id/:match_id/table", get(matches::resolve_table_for_match))
        .route("/:match_id/players", post(matches::submit_match_players))
        .route("/tables", get(matches::list_match_tables))
        .route(
            "/table/:table_name/players",
            get(matches::get_match_players),
        )
        .route(
            "/table/:table_name/entries",
            get(matches::get_match_entries_seconds_since_midnight),
        )
        .route(
            "/table/:table_name/periods/detect-notebook",
            get(matches::detect_match_periods_notebook),
        )
        .route(
            "/table/:table_name/periods/patch",
            post(matches::patch_match_periods),
        )
        .route(
            "/table/:table_name/worst-cases-from-view",
            get(matches::get_player_worst_cases_from_view),
        )
        .route(
            "/table/:table_name/sprints-in-worst-cases",
            get(matches::get_sprints_in_worst_cases),
        )
        .route(
            "/table/:table_name/positions/window",
            get(matches::get_positions_window),
        )
        .route(
            "/table/:table_name/accelerations",
            get(matches::get_accelerations_hardcoded),
        )
        .route(
            "/table/:table_name/sprints",
            get(matches::get_sprint_events_full),
        )
        .route(
            "/table/:table_name/sharp-angles",
            get(matches::get_sharp_angles),
        )
        .route(
            "/table/:table_name/trace",
            get(matches::get_player_trace_window),
        )
        .with_state(pool)
}
