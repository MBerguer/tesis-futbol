use axum::{routing::get, routing::post, Router};

mod config;
mod modules;
mod routes;

#[tokio::main]
async fn main() {
    let app = Router::new()
        .route("/", get(|| async { "Cantera inagotable API" }))
        .nest("/match", routes::matches_routes::matches_routes())
        .nest("/player", routes::players_routes::players_routes());

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8000").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
