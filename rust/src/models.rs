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
}

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct Player {
    pub player_id: Uuid,
    pub full_name: String,
    pub national_id: String,
    pub birthdate: Option<NaiveDate>,
    pub current_team_id: Option<Uuid>,
    pub position: Option<String>,
    pub active: bool,
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
}

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct MatchPlayer {
    pub match_player_id: Uuid,
    pub match_id: Uuid,
    pub team_id: Uuid,
    pub player_id: Uuid,
    pub role: String,                 // 'starter' | 'sub'
    pub position: Option<String>,
    pub jersey_number: Option<i32>,   // youth jerseys rotate; optional
}

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct Event {
    pub event_id: Uuid,
    pub match_id: Uuid,
    pub team_id: Uuid,
    pub player_id: Option<Uuid>,
    pub related_player_id: Option<Uuid>,
    pub minute: i32,
    pub added_time: Option<i32>,
    pub r#type: EventType,
    pub assist_player_id: Option<Uuid>,
    pub reason: Option<String>,
    pub data_json: Option<JsonValue>,
}








