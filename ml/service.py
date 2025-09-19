from __future__ import annotations

import json
import os
from pathlib import Path
from typing import List, Dict, Any

import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from tensorflow.keras.models import load_model


def _resolve_models_dir() -> Path:
    # 1) Env var override
    env_dir = os.getenv('FORECAST_MODEL_DIR')
    if env_dir:
        p = Path(env_dir).expanduser()
        if (p / 'forecast_config.json').exists():
            return p
    # 2) Common relative paths
    candidates = [
        Path.cwd() / 'ml' / 'models',
        Path.cwd() / 'models',
        Path(__file__).parent / 'models',
        Path(__file__).parent.parent / 'ml' / 'models',
        Path(__file__).parent.parent / 'models',
        Path('/workspaces/tesis-futbol/ml/models'),
    ]
    for p in candidates:
        try:
            if (p / 'forecast_config.json').exists():
                return p
        except Exception:
            continue
    # 3) Fallback to env or cwd even if missing (will error later with clear path)
    return Path(env_dir or (Path.cwd() / 'ml' / 'models'))

MODELS_DIR = _resolve_models_dir()
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
    if CONF_PATH.exists():
        with open(CONF_PATH, 'r') as f:
            return json.load(f)
    # Fallback to env/defaults so the service can start without a file
    hz = int(os.getenv('FORECAST_HZ', '10'))
    window_seconds = float(os.getenv('FORECAST_WINDOW_SECONDS', '4'))
    window_steps = int(os.getenv('FORECAST_WINDOW_STEPS', str(hz * int(window_seconds))))
    seq_features = [s.strip() for s in os.getenv('FORECAST_SEQ_FEATURES', 'speed_z,accel_z').split(',') if s.strip()]
    threshold = float(os.getenv('FORECAST_THRESHOLD', '0.5'))
    print(f"[forecast] WARNING: config file not found at {CONF_PATH}. Using ENV/defaults.")
    return {
        'horizon_seconds': float(os.getenv('FORECAST_HORIZON_SECONDS', '5')),
        'window_seconds': window_seconds,
        'hz': hz,
        'window_steps': window_steps,
        'seq_features': seq_features,
        'threshold': threshold,
    }


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
        # try env override or first .keras under MODELS_DIR
        env_model = os.getenv('FORECAST_MODEL_PATH')
        path = Path(env_model).expanduser() if env_model else None
        if env_model and Path(path).exists():
            model_path = Path(path)
        else:
            # scan for .keras
            keras_files = list(MODELS_DIR.glob('*.keras'))
            if not keras_files:
                raise RuntimeError(f"Model not found. Checked {MODEL_PATH} and no *.keras under {MODELS_DIR}")
            model_path = keras_files[0]
    else:
        model_path = MODEL_PATH
    # compile=False speeds up load for inference
    print(f"[forecast] Using model: {model_path}")
    print(f"[forecast] Using config source: {CONF_PATH if CONF_PATH.exists() else 'ENV/defaults'}")
    MODEL = load_model(model_path, compile=False)
    # Ensure seq_features length matches model input dims when config is missing/mismatched
    try:
        expected_features = int(getattr(MODEL, 'input_shape', [None, None, 0])[-1] or 0)
    except Exception:
        expected_features = 0
    if expected_features:
        seq_features = CONF.get('seq_features', [])
        if not isinstance(seq_features, list) or len(seq_features) != expected_features:
            # Build a fallback feature list placing known names first
            base = ['speed_z', 'accel_z']
            filler = [f'f{i}' for i in range(max(0, expected_features - len(base)))]
            CONF['seq_features'] = (base + filler)[:expected_features]
            print(f"[forecast] Adjusted seq_features to match model input dims: {CONF['seq_features']}")


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


