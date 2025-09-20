use reqwest::Client;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ForecastSample { pub ts: f64, pub speed_z: Option<f64>, pub accel_z: Option<f64> }

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ForecastPlayerWindow { pub id: String, pub name: String, pub samples: Vec<ForecastSample> }

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ForecastRequest { pub horizon_s: f64, pub players: Vec<ForecastPlayerWindow> }

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ForecastResult { pub id: String, pub name: String, pub prob: f64, pub above_thr: bool }

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ForecastResponse { pub horizon_s: f64, pub results: Vec<ForecastResult> }

#[derive(Clone)]
pub struct ForecastClient { http: Client, base_url: String }

impl ForecastClient {
    pub fn new<S: Into<String>>(base_url: S) -> Self { Self { http: Client::new(), base_url: base_url.into() } }

    pub async fn forecast(&self, req: &ForecastRequest) -> anyhow::Result<ForecastResponse> {
        let url = format!("{}/forecast", self.base_url.trim_end_matches('/'));
        let resp = self.http.post(url).json(req).send().await?;
        if !resp.status().is_success() { anyhow::bail!("forecast http {}", resp.status()); }
        let out: ForecastResponse = resp.json().await?;
        Ok(out)
    }
}

// A minimal ring buffer to keep last W samples
pub struct RingBuffer { buf: Vec<ForecastSample>, cap: usize }
impl RingBuffer {
    pub fn new(cap: usize) -> Self { Self { buf: Vec::with_capacity(cap), cap } }
    pub fn push(&mut self, s: ForecastSample) { if self.buf.len() == self.cap { self.buf.remove(0); } self.buf.push(s); }
    pub fn window(&self) -> Vec<ForecastSample> { self.buf.clone() }
}




