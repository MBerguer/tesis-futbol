use crate::modules::players;
use axum::{routing::get, routing::post, Router};

// Already binded to /players in main.rs
pub fn players_routes() -> Router {
    Router::new()
        .route("/", get(players::get_all_players))
        .route("/sqlx", get(players::get_all_sqlx))
        .route("/:user_id", get(players::get_players_basic_profile))
        .route(
            "/:user_id/matches/:match_id",
            get(players::get_player_stats_match),
        )
}
