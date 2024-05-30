use axum::{routing::get, routing::post, Router};

use axum::extract::{Json, Path, RawPathParams};
use serde_json::{json, Value};

#[tokio::main]
async fn main() {
    // build our application with a single route
    let app = Router::new()
        .route("/", get(health_check))
        .route("/match/details", get(get_match_details))
        .route("/match/details", post(post_match_details))
        .route("/match/gps", get(get_match_gps))
        .route("/match/gps", post(submit_match_gps))
        .route("/match/players", get(get_match_players))
        .route("/match/players", post(submit_match_players))
        .route("/player/:user_id/basic_profile", get(get_players_basic_profile))
        .route("/player/:user_id/physic_stats", get(get_player_physic_stats))
        .route("/player_match/:user_id/:match_id", get(get_player_stats_match))
        ;

    // run our app with hyper, listening globally on port 3000
    let listener = tokio::net::TcpListener::bind("0.0.0.0:8000").await.unwrap();
    axum::serve(listener, app).await.unwrap();

    async fn health_check() -> &'static str{
        "Hello, World!"
    }

    async fn get_match_details() -> Json<Value> {
        Json(json!({ "team_home": "Nacional", "team_away": "Penarol", "date": "2021-09-12", "time": "15:00", "stadium": "Centenario", "referee": "Juan Soto", "status": "pending", "result": "0-0", "match_id": "1234", "match_type": "friendly"}))
    }

    async fn post_match_details() {}

    async fn get_match_gps() -> Json<Value> {
        Json(json!({ "player_id": "1234", "latitude": "1234", "longitude": "1234", "timestamp": "2021-09-12 15:00:00", "match_id": "1234"}))
    }

    async fn submit_match_gps()  {
    }

    async fn get_match_players() -> Json<Value> {
        Json(json!({ "player_id": "1234", "match_id": "1234", "team": "Nacional", "position": "goalkeeper", "status": "active"}))
    }

    async fn submit_match_players() { }

    async fn get_player_physic_stats() -> Json<Value> {
        Json(json!({ "player_id": "1234", "height": "180", "weight": "80", "bmi": "24.69", "fat_percentage": "15", "muscle_mass": "50", "bone_mass": "3", "water_percentage": "60"}))
    }

    // `Path` gives you the path parameters and deserializes them.
    async fn get_players_basic_profile(Path(user_id): Path<u32>) -> String{
        (1 + user_id).to_string()
    }

    async fn get_player_stats_match(params: RawPathParams) -> Json<Value> {

        let mut user_id = None;
        let mut match_id = None;

        for (key, value) in &params {
            if key == "user_id" {
                user_id = Some(value);
            } else if key == "match_id" {
                match_id = Some(value);
            }
        }        

        if user_id.is_none() || match_id.is_none() {
            return Json(json!({ "error": "missing parameters" }));
        }

        Json(json!({ "player_id": user_id.unwrap(), "match_id": match_id.unwrap() }))
    }

}
