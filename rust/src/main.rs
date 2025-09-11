use axum::{routing::get, Router};
use sqlx::postgres::PgPoolOptions;
use std::env;
use tower_http::cors::{Any, CorsLayer};

mod config;
mod modules;
mod routes;

#[tokio::main]
async fn main() {
    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .expect("Failed to connect to database");

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/", get(|| async { "Cantera inagotable API" }))
        .nest("/match", routes::matches_routes::matches_routes(pool))
        .nest("/player", routes::players_routes::players_routes())
        .nest("/api", routes::admin_api::admin_api(pool))
        .layer(cors);

    // Allow overriding the port via environment variable API_PORT (defaults to 8000)
    let port: u16 = env
        ::var("API_PORT")
        .ok()
        .and_then(|s| s.parse::<u16>().ok())
        .unwrap_or(8000);
    let bind_addr = format!("0.0.0.0:{}", port);
    let listener = tokio::net::TcpListener::bind(&bind_addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
