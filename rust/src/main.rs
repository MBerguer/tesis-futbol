use axum::{routing::get, routing::post, Router};

use axum::extract::{Json, Path, Query};
use serde_json::{json, Value};
use std::collections::HashMap;

#[tokio::main]
async fn main() {
    // build our application with a single route
    let app = Router::new()
        .route("/", get(get_match).get(get_match))
        .route("/", post(post_match_data).post(post_match_data))
        .route("/users", get(|| async { "Hello, Users!" }));

    // run our app with hyper, listening globally on port 3000
    let listener = tokio::net::TcpListener::bind("0.0.0.0:8000").await.unwrap();
    axum::serve(listener, app).await.unwrap();

    async fn get_match() -> &'static str{
        "Hello, World!"
    }

    async fn post_match_data() {}

    // `Path` gives you the path parameters and deserializes them.
    async fn path(Path(user_id): Path<u32>) {}

    // `Query` gives you the query parameters and deserializes them.
    async fn query(Query(params): Query<HashMap<String, String>>) {}

    // Buffer the request body and deserialize it as JSON into a
    // `serde_json::Value`. `Json` supports any type that implements
    // `serde::Deserialize`.
    // async fn json(Json(payload): Json<serde_json::Value>) {}

    // `Json` gives a content-type of `application/json` and works with any type
    // that implements `serde::Serialize`
    async fn json() -> Json<Value> {
        Json(json!({ "data": 42 }))
    }
}
