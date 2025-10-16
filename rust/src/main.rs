use axum::{routing::get, Router};
use sqlx::postgres::PgPoolOptions;
use std::env;
use tower_http::cors::{Any, CorsLayer};
use tower_http::services::ServeDir;
use tokio::fs;

mod config;
mod models;
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

    println!("Connected to database");

    // Run SQLx migrations on startup (applies files under ./migrations)
    if let Err(e) = sqlx::migrate!("./migrations").run(&pool).await {
        eprintln!("Failed to run migrations: {}", e);
        panic!("migrations failed");
    }

    println!("Migrations applied");

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    // Ensure uploads directory exists
    let _ = fs::create_dir_all("uploads/player_photos").await;

    let app = Router::new()
        .route("/", get(|| async { "Cantera inagotable API" }))
        .nest("/match", routes::matches_routes::matches_routes(pool.clone()))
        .nest("/player", routes::players_routes::players_routes())
        .nest("/api", routes::admin_api::admin_api(pool.clone()))
        .nest("/research", routes::research_routes::research_routes(pool))
        .nest_service("/uploads", ServeDir::new("uploads"))
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
