// src/routes/users.rs

use axum::{extract::Extension, response::Json, Router};
use sqlx::PgPool;

pub fn users_routes() -> Router {
    Router::new().route("/users", axum::handler::get(get_users))
}

async fn get_users(state: Extension<PgPool>) -> Json<Vec<String>> {
    let pool = state.into_inner();
    let mut conn = pool.acquire().await.unwrap();
    let rows = sqlx::query("SELECT name FROM users")
        .fetch_all(&mut conn)
        .await
        .unwrap();

    let names: Vec<String> = rows.iter().map(|row| row.get(0)).collect();
    Json(names)
}
