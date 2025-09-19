from __future__ import annotations

import json
from pathlib import Path
from typing import List, Dict, Any

import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from tensorflow.keras.models import load_model


MODELS_DIR = Path('/workspaces/tesis-futbol/ml/models')
MODEL_PATH = MODELS_DIR / 'forecast_lstm.keras'
CONF_PATH = MODELS_DIR / 'forecast_config.json'


class Sample(BaseModel):
    ts: float
    # Expect already-normalized feature names as saved in config seq_features
    # Extra keys are ignored
    speed_z: float | None = None
    accel_z: float | None = None


class PlayerWindow(BaseModel):
    id: str
    name: str
    samples: List[Sample] = Field(description="Last W seconds at model Hz, ordered by ts ascending")


class ForecastRequest(BaseModel):
    horizon_s: float
    players: List[PlayerWindow]


class ForecastResult(BaseModel):
    id: str
    name: str
    prob: float
    above_thr: bool


class ForecastResponse(BaseModel):
    horizon_s: float
    results: List[ForecastResult]


def _load_config() -> Dict[str, Any]:
    if not CONF_PATH.exists():
        raise RuntimeError(f"Config not found at {CONF_PATH}")
    with open(CONF_PATH, 'r') as f:
        return json.load(f)


def _ensure_window(samples: List[Sample], window_steps: int) -> List[Sample]:
    # take the last window_steps samples; if fewer, left-pad by repeating first
    s = list(samples)
    if len(s) >= window_steps:
        return s[-window_steps:]
    if not s:
        return []
    pad = [s[0]] * (window_steps - len(s))
    return pad + s


app = FastAPI(title="Forecast LSTM Service", version="1.0")


@app.on_event("startup")
def _startup() -> None:
    global MODEL, CONF
    CONF = _load_config()
    if not MODEL_PATH.exists():
        raise RuntimeError(f"Model not found at {MODEL_PATH}")
    # compile=False speeds up load for inference
    MODEL = load_model(MODEL_PATH, compile=False)


@app.post("/forecast", response_model=ForecastResponse)
def forecast(req: ForecastRequest) -> ForecastResponse:
    try:
        seq_features: List[str] = list(CONF['seq_features'])
        window_steps: int = int(CONF['window_steps'])
        threshold: float = float(CONF.get('threshold', 0.5))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Bad config: {e}")

    # build batch tensor [N, W, F]
    batch: List[np.ndarray] = []
    players_meta: List[PlayerWindow] = []
    for p in req.players:
        win = _ensure_window(p.samples, window_steps)
        if len(win) != window_steps:
            # if completely empty, skip
            continue
        row = []
        for smp in win:
            feat_vals = []
            d = smp.dict()
            for f in seq_features:
                v = d.get(f, 0.0)
                feat_vals.append(0.0 if v is None else float(v))
            row.append(feat_vals)
        batch.append(np.asarray(row, dtype=float))
        players_meta.append(p)

    if not batch:
        raise HTTPException(status_code=400, detail="No valid player windows provided")

    X = np.stack(batch, axis=0)
    probs = MODEL.predict(X, verbose=0).ravel()

    results: List[ForecastResult] = []
    for p, prob in zip(players_meta, probs.tolist()):
        results.append(ForecastResult(id=p.id, name=p.name, prob=float(prob), above_thr=bool(prob >= threshold)))

    return ForecastResponse(horizon_s=req.horizon_s, results=results)


