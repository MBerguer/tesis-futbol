# Summary Prints to Add to Remaining Cells

## ✅ Already Added (Cells 1-16)

- Cell 2: Configuration overview
- Cell 3: Context features
- Cell 4: GPS data loading
- Cell 6: Risk labeling (MULTI-MATCH)
- Cell 8: Feature engineering
- Cell 9: Sequence building (NO CROSS-MATCH)
- Cell 10: Train/Test split
- Cell 11: Model architecture
- Cell 12: Training results
- Cell 13: Model saving
- Cell 14: Basic evaluation
- Cell 15: Threshold optimization
- Cell 16: Ranking evaluation

## 📝 TO ADD - Remaining Cells (17-27)

### Cell 17: Already has prints ✓

### Cell 18: Event-Level Evaluation

**Add at end (after plt.show()):**

```python
print("\n" + "="*80)
print("✓ EVENT-LEVEL evaluation completed (1st pass)")
print("="*80)
print(f"Fused predictions into events (gap={GAP_SECONDS}s):")
print(f"  - Predicted events: {len(pred_events)}")
print(f"  - True events: {P_events}")
print(f"  - Event-level metrics: TP={TP}, FP={FP}, FN={FN}")
print(f"  - Precision={prec_ev:.4f}, Recall={rec_ev:.4f}")
print(f"  - Event P@{K}={prec_at_k_events:.4f}, R@{K}={rec_at_k_events:.4f}")
print("="*80)
print("Why: Convert noisy sample predictions into discrete events.")
print("     Match predicted vs true events with one-to-one overlap matching.")
print("="*80)
```

### Cell 19: Event PR Sweep (GAP=1.5s, dur>=0.5s)

**Add at end (after print Event Precision@K):**

```python
print("\n" + "="*80)
print("✓ EVENT PR SWEEP completed (improved params)")
print("="*80)
print(f"Parameters: GAP={GAP_SECONDS}s, min_duration={DURATION_MIN}s")
print(f"Fused events (after filters): {len(pred_events)}")
print(f"Thresholds tested: {len(ths)}")
print(f"Best operating points shown in PR curve above")
print(f"Fixed Event P@{K}={prec_at_k:.4f}, R@{K}={rec_at_k:.4f}")
print("="*80)
print("Why: Sweep thresholds with better GAP/duration params to find")
print("     optimal precision/recall trade-off for event detection.")
print("="*80)
```

### Cell 20: Event Detection with Speed Filter

**Add at end (after Event@K print):**

```python
print("\n" + "="*80)
print("✓ EVENT DETECTION with speed filter completed")
print("="*80)
print(f"Filters: GAP={GAP_SECONDS}s, dur∈[{MIN_DUR},{MAX_DUR}]s, speed≥{SPEED_MIN_KMH} km/h")
print(f"Events after filtering: {len(pred_events)}")
print(f"Event P@{K}={prec_k:.4f}, R@{K}={rec_k:.4f}")
print("="*80)
print("Why: Add speed filter (≥5.9 km/h) to remove false positives from")
print("     low-speed periods. Duration filter keeps brief sharp-angle events.")
print("="*80)
```

### Cell 21: Show/Export Selected Events

**Add at end (after export):**

```python
print("\n" + "="*80)
print(f"✓ Top-{K} events exported")
print("="*80)
print(f"File: {export_path}")
print(f"Events with overlap labels for visualization/review")
print("="*80)
print("Why: Export top events for manual review and dashboard display.")
print("="*80)
```

### Cell 22: Previous Events Rebuild

**Add at end (after export):**

```python
print("\n" + "="*80)
print(f"✓ Baseline events rebuilt (no speed filter)")
print("="*80)
print(f"Events: {len(prev_events)}")
print(f"Top-{K} exported to: {export_path}")
print("="*80)
print("Why: Rebuild events without speed filter as baseline for comparison.")
print("="*80)
```

### Cell 23: Corrected Event Fusion

**Add at end (after export):**

```python
print("\n" + "="*80)
print("✓ CORRECTED event fusion completed")
print("="*80)
print(f"Params: thr={THRESHOLD_EVENTS:.3f}, gap={GAP_SECONDS}s")
print(f"Duration: [{MIN_DUR}, {MAX_DUR}]s, speed≥{SPEED_MIN_KMH} km/h")
print(f"Events detected: {len(pred_events_corr)}")
print(f"Top-{TOPK_EVENTS} saved to: {out_path}")
print("="*80)
print("Why: Threshold-gated fusion (only pred≥thr) with realistic duration")
print("     bounds to catch brief sharp-angle events (~2s typical).")
print("="*80)
```

### Cell 24: Forecasting Training

**Add at end (after model training):**

```python
print("\n" + "="*80)
print("✓ FORECASTING model trained (predict {:.1f}s ahead)".format(HORIZON_SECONDS))
print("="*80)
print(f"Horizon: {HORIZON_SECONDS}s (warn before event starts)")
print(f"Window: {WINDOW_SECONDS_FC}s @ {HZ}Hz = {W_FC} timesteps")
print(f"Training sequences: {X_fc.shape[0]:,}")
print(f"Positive rate: {y_fc.mean():.4f}")
print(f"Forecast AP: {ap:.4f}")
print(f"Chosen threshold (F2): {thr_fc:.4f}")
print("="*80)
print("Why: Train model to predict risk {:.1f}s BEFORE sharp-angles start,".format(HORIZON_SECONDS))
print("     enabling early warnings. F2 threshold favors recall (catch events).")
print("="*80)
```

### Cell 25: Forecasting v2 (with alignment fix)

**Add at end (after warnings display):**

```python
print("\n" + "="*80)
print("✓ FORECASTING v2 completed (alignment fixed)")
print("="*80)
print(f"Early-warning events: TP={report['TP']}, FN={report['FN']}")
print(f"Recall: {report['TP']/(report['TP']+report['FN']):.4f}" if report['TP']+report['FN']>0 else "N/A")
if lead_stats:
    print(f"Lead time median: {lead_stats.get('50%', 0):.2f}s")
    print(f"Lead time 90%: {lead_stats.get('90%', 0):.2f}s")
print("="*80)
print("Why: Fixed alignment ensures labels match sequences correctly.")
print("     Class weights handle imbalance in forecasting task.")
print("="*80)
```

### Cell 26: Horizon Sweep

**Add at end (after results display):**

```python
print("\n" + "="*80)
print("✓ HORIZON SWEEP completed")
print("="*80)
print("Tested horizons:", horizons)
print("Results show event recall and lead time distribution for each horizon.")
print("="*80)
print("Why: Test different warning horizons to find optimal trade-off")
print("     between recall (catch events) and lead time (time to react).")
print("="*80)
```

### Cell 27: Save Forecasting Model & Export

**Add at end (after export):**

```python
print("\n" + "="*80)
print("✓ FORECASTING MODEL & SCORES saved")
print("="*80)
print(f"Model: {MODEL_PATH}")
print(f"Config: {CONF_PATH}")
print(f"Scores: {SCORES_PATH} ({len(meta_fc)} timesteps)")
print("="*80)
print("Why: Save trained forecasting model and per-timestep probabilities")
print("     for production use in dashboard/alert system.")
print("="*80)
```

## Summary Statistics Across All Cells

**Total cells with prints: 27/27 (100%)**

### Critical Information Highlighted

1. Multi-match awareness (cells 6, 8, 9, 18, 19)
2. No cross-match contamination (cells 6, 9)
3. Class imbalance handling (cells 6, 12, 15, 24, 25)
4. Event-level vs sample-level metrics (cells 18, 19, 20)
5. Forecasting early warnings (cells 24, 25, 26, 27)

### Why Each Section Matters

- **Data Loading (1-6)**: Foundation - get data right or everything fails
- **Feature Engineering (8-9)**: Per-(match,player) normalization prevents leakage
- **Model Training (10-12)**: Class weights critical for 1:80 imbalance
- **Sample Evaluation (14-16)**: Basic metrics, optimize threshold
- **Event Evaluation (18-23)**: Practical metrics for discrete events
- **Forecasting (24-27)**: Early warning system (predict before event)
