use axum::extract::Path;
use axum::extract::{Json, RawPathParams};
use serde_json::{json, Value};

use crate::config::dbconfig::DbConfig;

pub async fn get_players_basic_profile(Path(user_id): Path<u32>) -> String {
    (1 + user_id).to_string()
}

pub async fn get_player_stats_match(params: RawPathParams) -> Json<Value> {
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

    Json(json!({
        "player_id": user_id.unwrap(),
        "match_id": match_id.unwrap()
    }))
}

pub async fn get_all_players() -> Json<Value> {
    //instanciate a dbconfig from the impl DbConfig

    let dbconfig = DbConfig::new();
    //format a url to connect to the database with the dbconfig

    // connect to pg
    let pool = sqlx::PgPool::connect(&dbconfig.get_postgres_connection_string())
        .await
        .unwrap();

    // fetch all players in the database, particularly the table administrativo

    let players = sqlx::query!("SELECT * FROM administrativo")
        .fetch_all(&pool)
        .await
        .unwrap();

    let mut serialized_players = Vec::new();

    // the attribute of a player are:
    // Jugador, Fecha_Nacimiento, `Documento_de_Identidad`, `Pasaporte`, `Telefono`, `Celular`, `Email`, `Cobertura_Medica`, `Estudios`, `Oriundo`, `Club_de_Origen`, `Club_de_Origen_Porcentaje, `Posicion`

    players.iter().for_each(|player| {
        serialized_players.push(json!({
            "Jugador": player.Jugador,
            "Fecha_Nacimiento": player.Fecha_Nacimiento,
            "Documento_de_Identidad": player.Documento_de_Identidad,
            "Pasaporte": player.Pasaporte,
            "Telefono": player.Telefono,
            "Celular": player.Celular,
            "Email": player.Email,
            "Cobertura_Medica": player.Cobertura_Medica,
            "Estudios": player.Estudios,
            "Oriundo": player.Oriundo,
            "Club_de_Origen": player.Club_de_Origen,
            "Club_de_Origen_Porcentaje": player.Club_de_Origen_Porcentaje,
            "Posicion": player.Posicion
        }))
    });

    Json(json!({
        "players": serialized_players
    }))
}

pub async fn get_all_players_photos() -> Json<Value> {
    //instanciate a dbconfig from the impl DbConfig

    let dbconfig = DbConfig::new();
    //format a url to connect to the database with the dbconfig

    // connect to pg
    let pool = sqlx::PgPool::connect(&dbconfig.get_postgres_connection_string())
        .await
        .unwrap();

    // fetch all players in the database, particularly the table administrativo

    let fotos = sqlx::query!("SELECT * FROM fotos_path")
        .fetch_all(&pool)
        .await
        .unwrap();

    let mut serialized_fotos = Vec::new();

    // the attribute of a fotos_path are:
    // id, categoria, nombre, path_foto

    fotos.iter().for_each(|foto| {
        serialized_fotos.push(json!({
            "id": foto.id,
            "categoria": foto.categoria,
            "nombre": foto.nombre,
            "path": foto.path_foto
        }))
    });

    Json(json!({
        "fotos": serialized_fotos
    }))
}
