use axum::extract::Json;
use axum::extract::Path;
use axum::extract::State;
use serde_json::{json, Value};
use sqlx::PgPool;
use sqlx::Row;

pub async fn get_match_details() -> Json<Value> {
    Json(json!({
        "match_id": "1234",
        "date": "2021-10-10",
        "time": "20:00",
        "location": "Estadio Centenario",
        "home_team": "Nacional",
        "away_team": "Peñarol",
        "status": "active"
    }))
}

pub async fn get_match_players_by_id() -> Json<Value> {
    Json(json!({
        "match_id": "1234",
        "players": [
            {
                "player_id": "1234",
                "team": "Nacional",
                "position": "goalkeeper",
                "status": "active"
            },
            {
                "player_id": "1235",
                "team": "Nacional",
                "position": "defender",
                "status": "active"
            },
            {
                "player_id": "1236",
                "team": "Nacional",
                "position": "midfielder",
                "status": "active"
            },
            {
                "player_id": "1237",
                "team": "Nacional",
                "position": "forward",
                "status": "active"
            }
        ]
    }))
}

pub async fn get_match_gps_players_details() -> Json<Value> {
    Json(json!({
        "match_id": "1234",
        "players": [
            {
                "player_id": "1234",
                "team": "Nacional",
                "position": "goalkeeper",
                "status": "active",
                "gps": {
                    "latitude": "1234",
                    "longitude": "1234"
                }
            },
            {
                "player_id": "1235",
                "team": "Nacional",
                "position": "defender",
                "status": "active",
                "gps": {
                    "latitude": "1234",
                    "longitude": "1234"
                }
            },
            {
                "player_id": "1236",
                "team": "Nacional",
                "position": "midfielder",
                "status": "active",
                "gps": {
                    "latitude": "1234",
                    "longitude": "1234"
                }
            },
            {
                "player_id": "1237",
                "team": "Nacional",
                "position": "forward",
                "status": "active",
                "gps": {
                    "latitude": "1234",
                    "longitude": "1234"
                }
            }
        ]
    }))
}

pub async fn submit_match_players() {}

pub async fn list_match_tables(State(pool): State<PgPool>) -> Json<Value> {
    let tables = sqlx::query!(
        r#"
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name NOT LIKE '%_view'
        ORDER BY table_name DESC
        "#
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    let table_names: Vec<String> = tables
        .into_iter()
        .filter_map(|row| row.table_name)
        .collect();

    Json(json!({
        "tables": table_names
    }))
}

pub async fn get_match_players(
    State(pool): State<PgPool>,
    Path(table_name): Path<String>,
) -> Json<Value> {
    let query = format!(
        r#"
        SELECT DISTINCT player_display_name 
        FROM "{}"
        ORDER BY player_display_name
        "#,
        table_name
    );

    let players = sqlx::query(&query)
        .fetch_all(&pool)
        .await
        .unwrap_or_default();

    let player_names: Vec<String> = players
        .into_iter()
        .filter_map(|row| row.try_get("player_display_name").ok())
        .collect();

    Json(json!({
        "players": player_names
    }))
}
