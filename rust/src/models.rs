use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use sqlx::FromRow;
use uuid::Uuid;

// Database enum: event_type
#[derive(sqlx::Type, Debug, Clone, Copy, Serialize, Deserialize)]
#[sqlx(type_name = "event_type", rename_all = "snake_case")] 
pub enum EventType {
    Goal,
    PenGoal,
    OwnGoal,
    Yellow,
    SecondYellow,
    Red,
    SubOn,
    SubOff,
}

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct Team {
    pub team_id: Uuid,
    pub name: String,
    pub category: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct Competition {
    pub competition_id: Uuid,
    pub name: String,
    pub season: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct Venue {
    pub venue_id: Uuid,
    pub name: String,
    pub city: Option<String>,
    pub latitude: Option<f64>,
    pub longitude: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct Player {
    // Adapted to administrativo table (Documento_de_Identidad as int)
    pub documento_de_identidad: i32,
    pub jugador: Option<String>,
    // administrative raw fields (stored as text in DB)
    pub fecha_nacimiento: Option<String>,
    pub pasaporte: Option<String>,
    pub telefono: Option<String>,
    pub celular: Option<String>,
    pub email: Option<String>,
    pub cobertura_medica: Option<String>,
    pub estudios: Option<String>,
    pub oriundo: Option<String>,
    pub club_de_origen: Option<String>,
    pub club_de_origen_porcentaje: Option<String>,
    pub posicion: Option<String>,
    pub nombre: Option<String>,
    // legacy optional fields for compatibility
    pub birthdate: Option<NaiveDate>,
    pub current_team_id: Option<Uuid>,
    pub position: Option<String>,
    pub active: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct Match {
    pub match_id: Uuid,
    pub competition_id: Option<Uuid>,
    pub match_date: DateTime<Utc>,
    pub venue_id: Option<Uuid>,
    pub category: Option<String>,
    pub home_team_id: Uuid,
    pub away_team_id: Uuid,
    pub result_home: i32,
    pub result_away: i32,
    pub youtube_link: Option<String>,
    pub notes: Option<String>,
    pub source_pdf_hash: Option<String>,
    pub parse_confidence: Option<f32>,
    pub gps_table_name: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct MatchPlayer {
    pub match_player_id: Uuid,
    pub match_id: Uuid,
    pub team_id: Uuid,
    pub player_id: i32, // references administrativo.Documento_de_Identidad
    pub role: String,                 // 'starter' | 'sub'
    pub position: Option<String>,
    pub jersey_number: Option<i32>,   // youth jerseys rotate; optional
}

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct Event {
    pub event_id: Uuid,
    pub match_id: Uuid,
    pub team_id: Uuid,
    pub player_id: Option<i32>,
    pub related_player_id: Option<i32>,
    pub minute: i32,
    pub added_time: Option<i32>,
    pub r#type: EventType,
    pub assist_player_id: Option<i32>,
    pub reason: Option<String>,
    pub data_json: Option<JsonValue>,
}


