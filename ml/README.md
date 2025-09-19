python -m pip install python-dotenv
pip install -U scikit-learn scipy matplotlib
pip install --ignore-installed --upgrade tensorflow

Inference microservice (FastAPI)
--------------------------------

1) Install deps:

```
pip install -r ml/requirements.txt
```

2) Run service:

```
uvicorn ml.service:app --host 0.0.0.0 --port 8001 --reload
```

3) Request example:

```
curl -X POST http://localhost:8001/forecast \
  -H 'Content-Type: application/json' \
  -d '{
        "horizon_s": 5.0,
        "players": [
          {"id":"10","name":"juan perez","samples": [
             {"ts": 33600.0, "speed_z": 0.1, "accel_z": -0.2}
          ]}
        ]
      }'
```

