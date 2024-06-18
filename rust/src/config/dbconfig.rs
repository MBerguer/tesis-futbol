/// Database config
/// reads the dablue fom the env variables and export it so it can be used
use std::env;

pub struct DbConfig {
    pub host: String,
    pub port: String,
    pub user: String,
    pub password: String,
    pub database: String,
}

impl DbConfig {
    pub fn new() -> Self {
        dotenv::dotenv().ok();
        Self {
            user: env::var("POSTGRES_USER").expect("POSTGRES_USER must be set"),
            password: env::var("POSTGRES_PASSWORD").expect("POSTGRES_PASSWORD must be set"),
            host: env::var("POSTGRES_HOSTNAME").expect("POSTGRES_HOSTNAME must be set"),
            port: env::var("POSTGRES_PORT").expect("POSTGRES_PORT must be set"),
            database: env::var("POSTGRES_DB").expect("POSTGRES_DB must be set"),
        }
    }

    //get the connection strig for postgres
    pub fn get_postgres_connection_string(&self) -> String {
        format!(
            "postgres://{}:{}@{}:{}/{}",
            self.user, self.password, self.host, self.port, self.database
        )
    }
}
