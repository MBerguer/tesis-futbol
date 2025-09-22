use crate::modules::players;
use axum::{routing::get, Router};
use axum::routing::post;

// Already binded to /players in main.rs
pub fn players_routes() -> Router {
    Router::new()
        .route("/", get(players::get_all_players))
        .route("/photos", get(players::get_all_players_photos))
        .route("/photo-blocks", get(players::get_player_photo_blocks))
        .route("/photo-blocks/add", post(players::add_player_photo_block))
        .route("/photo-blocks/remove", post(players::remove_player_photo_block))
        .route("/custom-photo", get(players::get_custom_photos))
        .route("/custom-photo/upload", post(players::upload_custom_photo))
        .route("/custom-photo/delete", post(players::delete_custom_photo))
        .route("/metrics/extrema", get(players::get_player_metrics_extrema))
        .route("/:user_id", get(players::get_players_basic_profile))
        .route(
            "/:user_id/matches/:match_id",
            get(players::get_player_stats_match),
        )
        .route(
            "/:user_id/metrics/max",
            get(players::get_player_max_metrics),
        )
}
