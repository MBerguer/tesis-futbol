# %%
import sys; print(sys.version)
!pip install pandas mplsoccer pandas-summary scikit-learn psycopg2-binary ipykernel

# %%
# 1. Conexión a PostgreSQL
# Ensure critical deps are available in Alpine containers

import sys

import pandas as pd
import numpy as np
from math import radians, cos, sin, asin, sqrt, acos, degrees
import matplotlib.pyplot as plt
from sqlalchemy import create_engine
from sklearn.model_selection import RepeatedStratifiedKFold, cross_val_predict
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import roc_auc_score, roc_curve, confusion_matrix
import joblib

PG_USER = "nacional"
PG_PASS = "nacional"
PG_HOST = "localhost"
PG_PORT = 5432
PG_DB   = "nacional"
VIEW_NAME = "all_matches_filtred"   # tu materialized view

engine = create_engine(f"postgresql://{PG_USER}:{PG_PASS}@{PG_HOST}:{PG_PORT}/{PG_DB}")
print(f"Python {sys.version.split()[0]} | pandas {pd.__version__} | numpy {np.__version__}")

# %%
# Celda 2 - Leer todos los datos de la materialized view
query = f"SELECT * FROM {VIEW_NAME};"
df_all = pd.read_sql(query, engine)

print("Registros totales:", len(df_all))
display(df_all.head())
print(df_all.columns.tolist())

# %%
# Celda 4 - convertir timestamps del tracking a datetime/segundos
# Detecta columnas posibles con time o elapsed_time
if 'timestamp' in df_all.columns:
    df_all['ts'] = pd.to_datetime(df_all['timestamp'])
elif 'time' in df_all.columns:
    # si 'time' es string HH:MM:SS.xx -> necesitamos un date anchor; usaremos arbitrary date y convertiremos
    df_all['ts'] = pd.to_datetime('2020-01-01 ' + df_all['time'])
elif 'seconds_since_midnight' in df_all.columns:
    # convertir a datetime con anchor
    df_all['ts'] = pd.to_datetime(df_all['seconds_since_midnight'], unit='s', origin='unix')  # ajustar si necesario
else:
    raise ValueError("No se detectó columna de tiempo conocida. Revisa nombres.")

# ordenar
df_all = df_all.sort_values(['match_name','player_display_name','ts']).reset_index(drop=True)
display(df_all[['match_name','player_display_name','ts']].head())

# %%
# Celda 4 - funciones auxiliares
def haversine_m(lat1, lon1, lat2, lon2):
    R = 6371000.0
    lat1, lon1, lat2, lon2 = map(radians, (lat1, lon1, lat2, lon2))
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat/2)**2 + cos(lat1)*cos(lat2)*sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    return R * c

def gps_cod_angle(window_df):
    n = len(window_df)
    if n < 15:
        return np.nan
    try:
        A_lat = window_df.iloc[0:5].lat.mean()
        A_lon = window_df.iloc[0:5].lon.mean()
        B_lat = window_df.iloc[10:15].lat.mean()
        B_lon = window_df.iloc[10:15].lon.mean()
        C_lat = window_df.iloc[-5:].lat.mean()
        C_lon = window_df.iloc[-5:].lon.mean()
    except Exception:
        return np.nan
    a = haversine_m(B_lat, B_lon, C_lat, C_lon)
    c = haversine_m(A_lat, A_lon, B_lat, B_lon)
    b = haversine_m(A_lat, A_lon, C_lat, C_lon)
    if a < 0.5 or c < 0.5:
        return np.nan
    cos_val = (a*a + c*c - b*b) / (2*a*c)
    cos_val = max(min(cos_val, 1.0), -1.0)
    angle_B = acos(cos_val)
    return 180.0 - degrees(angle_B)

# %%
# Celda 5 - Ventanas de 2.5s con offsets 0 y 1.25s
FS = 10
WINDOW_S = 2.5
OFFSETS = [0.0, 1.25]
MIN_SAMPLES_PER_WINDOW = int(0.9 * WINDOW_S * FS)

def extract_windows_for_player(df_ph, match_name, player_id, player_display_name):
    windows = []
    tmin, tmax = df_ph.ts.min(), df_ph.ts.max()
    for offset in OFFSETS:
        cur = tmin + pd.Timedelta(seconds=offset)
        while cur + pd.Timedelta(seconds=WINDOW_S) <= tmax:
            w = df_ph[(df_ph.ts >= cur) & (df_ph.ts < cur + pd.Timedelta(seconds=WINDOW_S))]
            if len(w) >= MIN_SAMPLES_PER_WINDOW:
                feats = {
                    'match_name': match_name,
                    'player_id': player_id,
                    'player_display_name': player_display_name,
                    'window_start': cur,
                    'window_end': cur + pd.Timedelta(seconds=WINDOW_S),
                    'mean_speed': w['speed'].mean(),
                    'min_speed': w['speed'].min(),
                    'max_speed': w['speed'].max(),
                    'mean_inst_accel': w['instantaneous_acceleration'].mean(),
                    'max_inst_accel': w['instantaneous_acceleration'].max(),
                    'min_inst_accel': w['instantaneous_acceleration'].min(),
                    'gps_cod_angle': gps_cod_angle(w),
                }
                windows.append(feats)
            cur += pd.Timedelta(seconds=WINDOW_S)
    return pd.DataFrame(windows)

# Generar features para todos los jugadores
out_frames = []
for (match_name, pid, pdn), df_ph in df_all.groupby(['match_name','player_id', 'player_display_name']):
    df_w = extract_windows_for_player(df_ph, match_name, pid, pdn)
    if not df_w.empty:
        out_frames.append(df_w)

features_df = pd.concat(out_frames, ignore_index=True)
print("Ventanas totales:", len(features_df))
display(features_df.head())

# %%
# Celda 6 - cargar anotaciones de vídeo
# ann = pd.read_csv("data/annotations.csv", parse_dates=['start_ts','end_ts'])

query_ann = """
    SELECT match_name, player_display_name, start_time, finish_time,  CASE
        WHEN angle_degrees > 180 THEN 360 - angle_degrees
        ELSE angle_degrees
    END AS angle_degrees FROM sharp_angles_cache;"""
ann = pd.read_sql(query_ann, engine)


# Convertir start/finish a timestamps anclados al mismo día base que las ventanas (2020-01-01)
BASE_DATE = pd.to_datetime("2020-01-01")
ann["start_ts"] = BASE_DATE + pd.to_timedelta(ann["start_time"].astype(float), unit="s")
ann["end_ts"] = BASE_DATE + pd.to_timedelta(ann["finish_time"].astype(float), unit="s")
ann["label"] = (ann["angle_degrees"] > 45).astype(int)

print("Anotaciones:", len(ann))

def label_window(row, ann_df):
    subset = ann_df[
        (ann_df.match_name == row["match_name"]) &
        (ann_df.player_display_name == row["player_display_name"])
    ]
    if subset.empty:
        return 0
    win_start, win_end = row["window_start"], row["window_end"]
    overlap = subset[(subset.start_ts < win_end) & (subset.end_ts > win_start)]
    return 1 if not overlap.empty else 0

features_df["label"] = features_df.apply(lambda r: label_window(r, ann), axis=1)
print(features_df["label"].value_counts())


# %%
# Celda 7 - Diagnóstico y preparación de datos
df_bal = features_df.copy()

print("=== DIAGNÓSTICO DE COLUMNAS ===")
print("Todas las columnas en features_df:")
print(df_bal.columns.tolist())
print(f"\nShape: {df_bal.shape}")
print("\nTipos de datos:")
print(df_bal.dtypes)

print("\n=== IDENTIFICANDO COLUMNAS CATEGÓRICAS ===")
# Identificar columnas categóricas automáticamente
categorical_cols = []
for col in df_bal.columns:
    if df_bal[col].dtype == 'object' or df_bal[col].dtype.name == 'category':
        categorical_cols.append(col)
        print(f"Categórica: {col} - Valores únicos: {df_bal[col].nunique()}")

# Agregar columnas conocidas que deben excluirse
known_exclude = ['match_name', 'player_id', 'player_display_name', 'window_start', 'window_end', 'label']
for col in known_exclude:
    if col in df_bal.columns and col not in categorical_cols:
        categorical_cols.append(col)

print(f"\nColumnas a excluir: {categorical_cols}")

# Crear X solo con columnas numéricas
X = df_bal.drop(columns=categorical_cols)
y = df_bal['label']

print(f"\n=== COLUMNAS FINALES EN X ===")
print("Columnas en X:", X.columns.tolist())
print(f"Shape de X: {X.shape}")
print("\nTipos de datos en X:")
print(X.dtypes)

# Verificar que todas las columnas son numéricas
print("\n=== VERIFICACIÓN DE VALORES NUMÉRICOS ===")
for col in X.columns:
    try:
        # Intentar convertir a float para verificar
        X[col].astype(float)
        print(f"✓ {col}: OK (tipo: {X[col].dtype})")
    except Exception as e:
        print(f"✗ {col}: ERROR - {e}")
        print(f"  Valores únicos: {X[col].unique()[:10]}")

print(f"\n=== RESUMEN ===")
print(f"Columnas originales: {len(df_bal.columns)}")
print(f"Columnas excluidas: {len(categorical_cols)}")
print(f"Columnas en X: {len(X.columns)}")
print(f"Shape final X: {X.shape}")

# %%
# Celda 8 - Entrenamiento RF (después del diagnóstico)
from sklearn.model_selection import StratifiedKFold, cross_val_predict, RepeatedStratifiedKFold, cross_val_score
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import roc_auc_score

# Opción A: 5-fold simple con OOF
print("=== OPCIÓN A: 5-FOLD CON OOF ===")
skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
rf = RandomForestClassifier(n_estimators=500, max_features='sqrt', random_state=42, n_jobs=-1)

y_probas = cross_val_predict(rf, X, y, cv=skf, method='predict_proba', n_jobs=-1)[:, 1]
auc = roc_auc_score(y, y_probas)
print(f"AUC (5-fold OOF): {auc:.4f}")

# Opción B: Repeticiones para estimación robusta del desempeño
print("\n=== OPCIÓN B: 5x10 REPETICIONES ===")
rkf = RepeatedStratifiedKFold(n_splits=5, n_repeats=10, random_state=42)
rf2 = RandomForestClassifier(n_estimators=500, max_features='sqrt', random_state=42, n_jobs=-1)

scores = cross_val_score(rf2, X, y, cv=rkf, scoring='roc_auc', n_jobs=-1)
print(f"AUC (5x10 CV): mean={scores.mean():.4f}, std={scores.std():.4f}")
print(f"Rango: [{scores.min():.4f}, {scores.max():.4f}]")


# %%
# Celda 9 - Análisis de importancia de features
import matplotlib.pyplot as plt
import seaborn as sns

# Entrenar modelo final para análisis
rf_final = RandomForestClassifier(n_estimators=500, max_features='sqrt', random_state=42, n_jobs=-1)
rf_final.fit(X, y)

# Importancia de features
feature_importance = pd.DataFrame({
    'feature': X.columns,
    'importance': rf_final.feature_importances_
}).sort_values('importance', ascending=False)

print("=== IMPORTANCIA DE FEATURES ===")
print(feature_importance)

# Visualización
plt.figure(figsize=(10, 6))
sns.barplot(data=feature_importance, x='importance', y='feature', palette='viridis')
plt.title('Importancia de Features - Random Forest')
plt.xlabel('Importancia')
plt.tight_layout()
plt.show()

# Estadísticas adicionales
print(f"\nFeature más importante: {feature_importance.iloc[0]['feature']} ({feature_importance.iloc[0]['importance']:.4f})")
print(f"Feature menos importante: {feature_importance.iloc[-1]['feature']} ({feature_importance.iloc[-1]['importance']:.4f})")
print(f"Rango de importancia: {feature_importance['importance'].max() - feature_importance['importance'].min():.4f}")


# %%
# Celda 10 - Curvas ROC y Precision-Recall
from sklearn.metrics import roc_curve, precision_recall_curve, confusion_matrix, classification_report
import numpy as np

# Calcular métricas usando las predicciones OOF de la Opción A
fpr, tpr, roc_thresholds = roc_curve(y, y_probas)
precision, recall, pr_thresholds = precision_recall_curve(y, y_probas)

# Crear figura con subplots
fig, axes = plt.subplots(2, 2, figsize=(15, 12))

# 1. Curva ROC
axes[0, 0].plot(fpr, tpr, color='darkorange', lw=2, label=f'ROC (AUC = {auc:.4f})')
axes[0, 0].plot([0, 1], [0, 1], color='navy', lw=2, linestyle='--', label='Random')
axes[0, 0].set_xlim([0.0, 1.0])
axes[0, 0].set_ylim([0.0, 1.05])
axes[0, 0].set_xlabel('Tasa de Falsos Positivos')
axes[0, 0].set_ylabel('Tasa de Verdaderos Positivos')
axes[0, 0].set_title('Curva ROC')
axes[0, 0].legend(loc="lower right")
axes[0, 0].grid(True, alpha=0.3)

# 2. Curva Precision-Recall
pr_auc = np.trapz(precision, recall)
axes[0, 1].plot(recall, precision, color='darkred', lw=2, label=f'PR (AUC = {pr_auc:.4f})')
axes[0, 1].axhline(y=y.mean(), color='navy', linestyle='--', label=f'Baseline (P={y.mean():.4f})')
axes[0, 1].set_xlim([0.0, 1.0])
axes[0, 1].set_ylim([0.0, 1.05])
axes[0, 1].set_xlabel('Recall')
axes[0, 1].set_ylabel('Precision')
axes[0, 1].set_title('Curva Precision-Recall')
axes[0, 1].legend(loc="lower left")
axes[0, 1].grid(True, alpha=0.3)

# 3. Matriz de confusión (usando umbral 0.5)
y_pred_binary = (y_probas >= 0.5).astype(int)
cm = confusion_matrix(y, y_pred_binary)
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', ax=axes[1, 0])
axes[1, 0].set_title('Matriz de Confusión (Umbral = 0.5)')
axes[1, 0].set_xlabel('Predicción')
axes[1, 0].set_ylabel('Verdadero')

# 4. Distribución de probabilidades
axes[1, 1].hist(y_probas[y == 0], bins=50, alpha=0.7, label='Clase 0', color='blue', density=True)
axes[1, 1].hist(y_probas[y == 1], bins=50, alpha=0.7, label='Clase 1', color='red', density=True)
axes[1, 1].axvline(x=0.5, color='black', linestyle='--', label='Umbral 0.5')
axes[1, 1].set_xlabel('Probabilidad Predicha')
axes[1, 1].set_ylabel('Densidad')
axes[1, 1].set_title('Distribución de Probabilidades')
axes[1, 1].legend()
axes[1, 1].grid(True, alpha=0.3)

plt.tight_layout()
plt.show()

# Métricas adicionales
print("=== MÉTRICAS DETALLADAS ===")
print(f"ROC AUC: {auc:.4f}")
print(f"PR AUC: {pr_auc:.4f}")
print(f"Prevalencia de clase positiva: {y.mean():.4f}")
print(f"\nClasificación con umbral 0.5:")
print(classification_report(y, y_pred_binary, target_names=['No Cod', 'Cod']))


# %%
# Celda 11 - Análisis de umbrales óptimos
from sklearn.metrics import precision_score, recall_score, f1_score

# Calcular métricas para diferentes umbrales
thresholds = np.arange(0.1, 1.0, 0.05)
metrics = []

for threshold in thresholds:
    y_pred_thresh = (y_probas >= threshold).astype(int)
    
    if y_pred_thresh.sum() > 0:  # Solo si hay predicciones positivas
        precision = precision_score(y, y_pred_thresh)
        recall = recall_score(y, y_pred_thresh)
        f1 = f1_score(y, y_pred_thresh)
        
        metrics.append({
            'threshold': threshold,
            'precision': precision,
            'recall': recall,
            'f1': f1
        })

metrics_df = pd.DataFrame(metrics)

# Encontrar umbral óptimo por F1
optimal_idx = metrics_df['f1'].idxmax()
optimal_threshold = metrics_df.loc[optimal_idx, 'threshold']
optimal_f1 = metrics_df.loc[optimal_idx, 'f1']

print("=== ANÁLISIS DE UMBRALES ===")
print(f"Umbral óptimo (F1): {optimal_threshold:.3f}")
print(f"F1 máximo: {optimal_f1:.4f}")
print(f"Precision en umbral óptimo: {metrics_df.loc[optimal_idx, 'precision']:.4f}")
print(f"Recall en umbral óptimo: {metrics_df.loc[optimal_idx, 'recall']:.4f}")

# Visualización de métricas por umbral
fig, axes = plt.subplots(1, 2, figsize=(15, 5))

# Gráfico de métricas vs umbral
axes[0].plot(metrics_df['threshold'], metrics_df['precision'], 'o-', label='Precision', color='blue')
axes[0].plot(metrics_df['threshold'], metrics_df['recall'], 's-', label='Recall', color='red')
axes[0].plot(metrics_df['threshold'], metrics_df['f1'], '^-', label='F1', color='green')
axes[0].axvline(x=optimal_threshold, color='black', linestyle='--', label=f'Óptimo ({optimal_threshold:.3f})')
axes[0].set_xlabel('Umbral')
axes[0].set_ylabel('Métrica')
axes[0].set_title('Métricas vs Umbral')
axes[0].legend()
axes[0].grid(True, alpha=0.3)

# Gráfico de trade-off Precision-Recall
axes[1].plot(metrics_df['recall'], metrics_df['precision'], 'o-', color='purple')
axes[1].scatter(metrics_df.loc[optimal_idx, 'recall'], metrics_df.loc[optimal_idx, 'precision'], 
               color='red', s=100, zorder=5, label=f'Óptimo (F1={optimal_f1:.3f})')
axes[1].set_xlabel('Recall')
axes[1].set_ylabel('Precision')
axes[1].set_title('Curva Precision-Recall (Discreta)')
axes[1].legend()
axes[1].grid(True, alpha=0.3)

plt.tight_layout()
plt.show()

# Matriz de confusión con umbral óptimo
y_pred_optimal = (y_probas >= optimal_threshold).astype(int)
cm_optimal = confusion_matrix(y, y_pred_optimal)

print(f"\n=== MATRIZ DE CONFUSIÓN (Umbral óptimo = {optimal_threshold:.3f}) ===")
print("Confusion Matrix:")
print(cm_optimal)
print(f"\nClasificación con umbral óptimo:")
print(classification_report(y, y_pred_optimal, target_names=['No Cod', 'Cod']))


# %%
# Celda 12 - Guardar modelo y resultados
import joblib
from datetime import datetime

# Crear directorio para modelos si no existe
import os
model_dir = "models"
if not os.path.exists(model_dir):
    os.makedirs(model_dir)

# Guardar modelo entrenado
model_path = f"{model_dir}/rf_cod_model_{datetime.now().strftime('%Y%m%d_%H%M%S')}.joblib"
joblib.dump(rf_final, model_path)
print(f"Modelo guardado en: {model_path}")

# Guardar resultados en un diccionario
results = {
    'model_type': 'RandomForest',
    'n_estimators': 500,
    'max_features': 'sqrt',
    'features': X.columns.tolist(),
    'n_samples': len(X),
    'n_features': len(X.columns),
    'class_distribution': y.value_counts().to_dict(),
    'auc_5fold_oof': float(auc),
    'auc_5x10_mean': float(scores.mean()),
    'auc_5x10_std': float(scores.std()),
    'auc_5x10_min': float(scores.min()),
    'auc_5x10_max': float(scores.max()),
    'optimal_threshold': float(optimal_threshold),
    'optimal_f1': float(optimal_f1),
    'feature_importance': feature_importance.to_dict('records'),
    'training_date': datetime.now().isoformat()
}

# Guardar resultados como JSON
import json
results_path = f"{model_dir}/rf_cod_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
with open(results_path, 'w') as f:
    json.dump(results, f, indent=2)
print(f"Resultados guardados en: {results_path}")

# Resumen final
print("\n=== RESUMEN FINAL ===")
print(f"Modelo: Random Forest")
print(f"Muestras: {len(X):,}")
print(f"Features: {len(X.columns)}")
print(f"Distribución de clases: {y.value_counts().to_dict()}")
print(f"AUC (5-fold OOF): {auc:.4f}")
print(f"AUC (5x10 CV): {scores.mean():.4f} ± {scores.std():.4f}")
print(f"Umbral óptimo: {optimal_threshold:.3f}")
print(f"F1 óptimo: {optimal_f1:.4f}")
print(f"Features más importantes:")
for i, row in feature_importance.head(3).iterrows():
    print(f"  {i+1}. {row['feature']}: {row['importance']:.4f}")


# %%
# Celda 13 - Down-sampling para balancear clases
print("=== DOWN-SAMPLING PARA BALANCEAR CLASES ===")
print(f"Distribución original:")
print(f"  Clase 0 (No COD): {len(df_bal[df_bal['label'] == 0]):,}")
print(f"  Clase 1 (COD): {len(df_bal[df_bal['label'] == 1]):,}")
print(f"  Ratio: {len(df_bal[df_bal['label'] == 0]) / len(df_bal[df_bal['label'] == 1]):.1f}:1")

# 1. Separar clases
df_minority = df_bal[df_bal['label'] == 1].copy()
df_majority = df_bal[df_bal['label'] == 0].copy()

print(f"\nClase minoritaria (COD): {len(df_minority):,} muestras")
print(f"Clase mayoritaria (No COD): {len(df_majority):,} muestras")

# 2. Down-sampling de la clase mayoritaria
n_minority = len(df_minority)
df_majority_downsampled = df_majority.sample(n=n_minority, random_state=42)

print(f"\nDespués del down-sampling:")
print(f"  Clase 0 (No COD): {len(df_majority_downsampled):,}")
print(f"  Clase 1 (COD): {len(df_minority):,}")
print(f"  Ratio: 1:1 ✓")

# 3. Combinar el dataset balanceado
df_bal_final = pd.concat([df_majority_downsampled, df_minority]).sample(frac=1, random_state=42).reset_index(drop=True)

# 4. Re-definir X e y con el dataset balanceado
X_balanced = df_bal_final.drop(columns=categorical_cols)
y_balanced = df_bal_final['label']

print(f"\n=== DATASET BALANCEADO ===")
print(f"Shape final X: {X_balanced.shape}")
print(f"Distribución de clases balanceada:")
print(y_balanced.value_counts())
print(f"Proporción clase 1: {y_balanced.mean():.4f}")

# Verificar que no hay NaNs
print(f"\nNaNs en X_balanced: {X_balanced.isnull().sum().sum()}")
if X_balanced.isnull().sum().sum() > 0:
    print("Columnas con NaNs:")
    print(X_balanced.isnull().sum()[X_balanced.isnull().sum() > 0])
    # Eliminar filas con NaNs
    X_balanced = X_balanced.dropna()
    y_balanced = y_balanced.loc[X_balanced.index]
    print(f"Después de eliminar NaNs: {X_balanced.shape}")


# %%
# Celda 14 - Entrenamiento RF con datos balanceados
from sklearn.model_selection import StratifiedKFold, cross_val_predict, RepeatedStratifiedKFold, cross_val_score
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import roc_auc_score

print("=== ENTRENAMIENTO RF CON DATOS BALANCEADOS ===")

# Opción A: 5-fold simple con OOF
print("Opción A: 5-fold con OOF")
skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
rf_balanced = RandomForestClassifier(n_estimators=500, max_features='sqrt', random_state=42, n_jobs=-1)

y_probas_balanced = cross_val_predict(rf_balanced, X_balanced, y_balanced, cv=skf, method='predict_proba', n_jobs=-1)[:, 1]
auc_balanced = roc_auc_score(y_balanced, y_probas_balanced)
print(f"AUC (5-fold OOF balanceado): {auc_balanced:.4f}")

# Opción B: Repeticiones para estimación robusta del desempeño
print("\nOpción B: 5x10 repeticiones")
rkf = RepeatedStratifiedKFold(n_splits=5, n_repeats=10, random_state=42)
rf2_balanced = RandomForestClassifier(n_estimators=500, max_features='sqrt', random_state=42, n_jobs=-1)

scores_balanced = cross_val_score(rf2_balanced, X_balanced, y_balanced, cv=rkf, scoring='roc_auc', n_jobs=-1)
print(f"AUC (5x10 CV balanceado): mean={scores_balanced.mean():.4f}, std={scores_balanced.std():.4f}")
print(f"Rango: [{scores_balanced.min():.4f}, {scores_balanced.max():.4f}]")

# Comparación con datos desbalanceados
print(f"\n=== COMPARACIÓN ===")
print(f"AUC desbalanceado: {auc:.4f}")
print(f"AUC balanceado: {auc_balanced:.4f}")
print(f"Diferencia: {auc_balanced - auc:.4f}")


# %%
# Celda 15 - Análisis de umbral óptimo para igualar Sensibilidad y Especificidad
from sklearn.metrics import roc_curve, precision_recall_curve, confusion_matrix, classification_report
import numpy as np

print("=== ANÁLISIS DE UMBRAL ÓPTIMO (BALANCEADO) ===")

# 1. Calcular ROC curve para encontrar el umbral óptimo
fpr, tpr, thresholds = roc_curve(y_balanced, y_probas_balanced)

# 2. Encontrar el punto donde Sensibilidad y Especificidad se igualan
specificity = 1 - fpr
# Buscar el punto donde (tpr - specificity) está cerca de cero
optimal_idx = np.argmin(np.abs(tpr - specificity))
optimal_threshold_balanced = thresholds[optimal_idx]

print(f"Umbral óptimo para igualar Sen/Spec: {optimal_threshold_balanced:.4f}")
print(f"(El estudio usó 0.62)")

# 3. Calcular métricas con umbral óptimo
y_pred_optimal_balanced = (y_probas_balanced >= optimal_threshold_balanced).astype(int)
cm_optimal_balanced = confusion_matrix(y_balanced, y_pred_optimal_balanced)

# Calcular Sensibilidad y Especificidad
tn, fp, fn, tp = cm_optimal_balanced.ravel()
sensitivity = tp / (tp + fn)  # Recall
specificity = tn / (tn + fp)

print(f"\n=== MÉTRICAS CON UMBRAL ÓPTIMO ===")
print(f"Sensibilidad (Recall): {sensitivity:.4f}")
print(f"Especificidad: {specificity:.4f}")
print(f"Diferencia |Sen - Spec|: {abs(sensitivity - specificity):.4f}")

print(f"\nMatriz de confusión (umbral {optimal_threshold_balanced:.4f}):")
print(cm_optimal_balanced)

print(f"\nReporte de clasificación:")
print(classification_report(y_balanced, y_pred_optimal_balanced, target_names=['No COD', 'COD']))

# 4. También probar con umbral del estudio (0.62)
y_pred_study = (y_probas_balanced >= 0.62).astype(int)
cm_study = confusion_matrix(y_balanced, y_pred_study)
tn_s, fp_s, fn_s, tp_s = cm_study.ravel()
sensitivity_s = tp_s / (tp_s + fn_s)
specificity_s = tn_s / (tn_s + fp_s)

print(f"\n=== COMPARACIÓN CON UMBRAL DEL ESTUDIO (0.62) ===")
print(f"Sensibilidad: {sensitivity_s:.4f}")
print(f"Especificidad: {specificity_s:.4f}")
print(f"Diferencia |Sen - Spec|: {abs(sensitivity_s - specificity_s):.4f}")


# %%
# Celda 16 - Visualizaciones con datos balanceados
import matplotlib.pyplot as plt
import seaborn as sns

print("=== VISUALIZACIONES CON DATOS BALANCEADOS ===")

# Crear figura con subplots
fig, axes = plt.subplots(2, 2, figsize=(15, 12))

# 1. Curva ROC (balanceada)
fpr_bal, tpr_bal, _ = roc_curve(y_balanced, y_probas_balanced)
axes[0, 0].plot(fpr_bal, tpr_bal, color='darkorange', lw=2, label=f'ROC Balanceado (AUC = {auc_balanced:.4f})')
axes[0, 0].plot([0, 1], [0, 1], color='navy', lw=2, linestyle='--', label='Random')
axes[0, 0].set_xlim([0.0, 1.0])
axes[0, 0].set_ylim([0.0, 1.05])
axes[0, 0].set_xlabel('Tasa de Falsos Positivos')
axes[0, 0].set_ylabel('Tasa de Verdaderos Positivos')
axes[0, 0].set_title('Curva ROC (Balanceado)')
axes[0, 0].legend(loc="lower right")
axes[0, 0].grid(True, alpha=0.3)

# 2. Curva Precision-Recall (balanceada)
precision_bal, recall_bal, _ = precision_recall_curve(y_balanced, y_probas_balanced)
pr_auc_bal = np.trapz(precision_bal, recall_bal)
axes[0, 1].plot(recall_bal, precision_bal, color='darkred', lw=2, label=f'PR Balanceado (AUC = {pr_auc_bal:.4f})')
axes[0, 1].axhline(y=y_balanced.mean(), color='navy', linestyle='--', label=f'Baseline (P={y_balanced.mean():.4f})')
axes[0, 1].set_xlim([0.0, 1.0])
axes[0, 1].set_ylim([0.0, 1.05])
axes[0, 1].set_xlabel('Recall')
axes[0, 1].set_ylabel('Precision')
axes[0, 1].set_title('Curva Precision-Recall (Balanceado)')
axes[0, 1].legend(loc="lower left")
axes[0, 1].grid(True, alpha=0.3)

# 3. Matriz de confusión (umbral óptimo)
sns.heatmap(cm_optimal_balanced, annot=True, fmt='d', cmap='Blues', ax=axes[1, 0])
axes[1, 0].set_title(f'Matriz de Confusión (Umbral = {optimal_threshold_balanced:.3f})')
axes[1, 0].set_xlabel('Predicción')
axes[1, 0].set_ylabel('Verdadero')

# 4. Distribución de probabilidades (balanceada)
axes[1, 1].hist(y_probas_balanced[y_balanced == 0], bins=50, alpha=0.7, label='Clase 0', color='blue', density=True)
axes[1, 1].hist(y_probas_balanced[y_balanced == 1], bins=50, alpha=0.7, label='Clase 1', color='red', density=True)
axes[1, 1].axvline(x=optimal_threshold_balanced, color='black', linestyle='--', label=f'Umbral óptimo ({optimal_threshold_balanced:.3f})')
axes[1, 1].axvline(x=0.62, color='green', linestyle='--', label='Umbral estudio (0.62)')
axes[1, 1].set_xlabel('Probabilidad Predicha')
axes[1, 1].set_ylabel('Densidad')
axes[1, 1].set_title('Distribución de Probabilidades (Balanceado)')
axes[1, 1].legend()
axes[1, 1].grid(True, alpha=0.3)

plt.tight_layout()
plt.show()

# Comparación de métricas
print(f"\n=== COMPARACIÓN DE MÉTRICAS ===")
print(f"ROC AUC desbalanceado: {auc:.4f}")
print(f"ROC AUC balanceado: {auc_balanced:.4f}")
print(f"PR AUC balanceado: {pr_auc_bal:.4f}")
print(f"Sensibilidad (umbral óptimo): {sensitivity:.4f}")
print(f"Especificidad (umbral óptimo): {specificity:.4f}")
print(f"Sensibilidad (umbral 0.62): {sensitivity_s:.4f}")
print(f"Especificidad (umbral 0.62): {specificity_s:.4f}")


# %%
# Celda 17 - Resumen final y comparación con el estudio
print("=== RESUMEN FINAL Y COMPARACIÓN CON EL ESTUDIO ===")

# Entrenar modelo final balanceado para análisis de importancia
rf_final_balanced = RandomForestClassifier(n_estimators=500, max_features='sqrt', random_state=42, n_jobs=-1)
rf_final_balanced.fit(X_balanced, y_balanced)

# Importancia de features
feature_importance_balanced = pd.DataFrame({
    'feature': X_balanced.columns,
    'importance': rf_final_balanced.feature_importances_
}).sort_values('importance', ascending=False)

print("=== IMPORTANCIA DE FEATURES (BALANCEADO) ===")
print(feature_importance_balanced)

# Comparación con el estudio
print(f"\n=== COMPARACIÓN CON EL ESTUDIO ===")
print(f"Estudio original:")
print(f"  - Sensibilidad: 0.889")
print(f"  - Especificidad: 0.889")
print(f"  - Umbral: 0.62")
print(f"  - Balanceo: Down-sampling ✓")

print(f"\nNuestro modelo balanceado:")
print(f"  - Sensibilidad (umbral óptimo): {sensitivity:.4f}")
print(f"  - Especificidad (umbral óptimo): {specificity:.4f}")
print(f"  - Umbral óptimo: {optimal_threshold_balanced:.4f}")
print(f"  - Sensibilidad (umbral 0.62): {sensitivity_s:.4f}")
print(f"  - Especificidad (umbral 0.62): {specificity_s:.4f}")

# Evaluación de replicación
print(f"\n=== EVALUACIÓN DE REPLICACIÓN ===")
if abs(sensitivity - 0.889) < 0.1 and abs(specificity - 0.889) < 0.1:
    print("✅ REPLICACIÓN EXITOSA: Métricas similares al estudio")
elif abs(sensitivity_s - 0.889) < 0.1 and abs(specificity_s - 0.889) < 0.1:
    print("👀 REPLICACIÓN EXITOSA: Métricas similares al estudio (con umbral 0.62)")
else:
    print("⚠️  REPLICACIÓN PARCIAL: Métricas diferentes al estudio")
    print("   Posibles causas: diferencias en features, preprocesamiento, o datos")

print(f"\n=== LECCIONES APRENDIDAS ===")
print(f"1. Down-sampling es CRÍTICO para problemas desbalanceados")
print(f"2. AUC desbalanceado (0.9349) era engañosamente alto")
print(f"3. AUC balanceado ({auc_balanced:.4f}) es más honesto")
print(f"4. Sensibilidad y Especificidad son métricas clave para COD")
print(f"5. El umbral óptimo puede diferir del umbral 0.5 estándar")

# Guardar modelo balanceado
model_path_balanced = f"{model_dir}/rf_cod_model_balanced_{datetime.now().strftime('%Y%m%d_%H%M%S')}.joblib"
joblib.dump(rf_final_balanced, model_path_balanced)
print(f"\nModelo balanceado guardado en: {model_path_balanced}")


# %%
!pip install nbconvert

!pip install pyppeteer

# %%
!apt-get install xelatex

!jupyter nbconvert --to pdf --template full --output-dir /content/drive/MyDrive/tesis/tesis-futbol/notebooks/ml/03_rf_cod_paper.pdf /content/drive/MyDrive/tesis/tesis-futbol/notebooks/ml/03_rf_cod_paper.ipynb

!jupyter nbconvert --to pdf --template full --output-dir /content/drive/MyDrive/tesis/tesis-futbol/notebooks/ml/03_rf_cod_paper.pdf /content/drive/MyDrive/tesis/tesis-futbol/notebooks/ml/03_rf_cod_paper.ipynb




