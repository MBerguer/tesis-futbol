# ML Injury Risk Modeling

## Setup
1. Create a Python venv (optional)
2. Install deps:

```bash
pip install -r ml/requirements.txt
```

3. Copy env template and fill DB creds:

```bash
cp ml/.env.example ml/.env
```

## Data assumptions
- GPS at 10Hz with columns: `player_id`, `match_id`, `ts` (timestamp), `speed`, `accel` (or `velocidad`, `aceleracion`), optional `pos_x`, `pos_y`
- Matches: `match_id`, `is_home`, optional `match_date`
- Players: `player_id`, `birthdate`, `position`
- Risk intervals table or CSV: `player_id`, `match_id`, `ts_start`, `ts_end`

## Notebook
Open `ml/notebooks/01_lstm_risk_sequences.ipynb` and run cells.

## Outputs
- Trained model: `ml/models/lstm_baseline.keras`
- Metrics printed + plots in notebook

## Next improvements
- Map your real column names (e.g., `velocidad`, `aceleracion`, `momento_de_tiempo`) in the notebook.
- Add class weights to handle class imbalance in `model.fit`.
- Try GRU/1D-CNN or add more context features (score, cards, minute).
- Tune window length and thresholds; consider per-position models.
- Export per-timestep risk probabilities for in-match dashboards.
