# Cómo Cargar el Modelo Guardado (Evitar 3 horas de entrenamiento)

## 📋 Pasos para cargar el modelo

### 1️⃣ Ejecutar Celdas de Setup (1-17)

**Tiempo: ~5-10 minutos**

Estas celdas crean las variables necesarias:

- `X_test`, `y_test` → Test set completo
- `seq_features` → Lista de features
- `HZ`, `WINDOW_SECONDS` → Configuración
- `GPS_PLAYER_COL`, `TS_COLUMN` → Nombres de columnas

### 2️⃣ Ejecutar Celda para Cargar Modelo

```python
from tensorflow.keras.models import load_model
import numpy as np

# Verificar que X_test existe
if 'X_test' not in globals():
    print("❌ ERROR: Ejecuta primero las celdas 1-17 para crear X_test")
else:
    # Cargar modelo
    model_path = '/home/jovyan/work/ml/models/lstm_baseline_full.keras'
    model = load_model(model_path)
    print(f"✓ Modelo cargado desde {model_path}")
    model.summary()
    
    # Crear validation set
    print("Creando validation set (50K muestras)...")
    val_sample_size = 50000
    indices = np.random.choice(len(X_test), size=val_sample_size, replace=False)
    X_val = X_test[indices].astype(np.float32)
    y_val = y_test[indices].astype(np.int8)
    print(f"✓ Validation set: {len(X_val):,} muestras")
    print("\n🎉 ¡Listo! Continúa con la celda 22 (evaluación)")
```

### 3️⃣ Saltar Celda 18 (Training)

**¡Esto te ahorra 3 horas!**

### 4️⃣ Continuar desde Celda 22 (Evaluation)

Todas las celdas de evaluación ahora funcionarán porque:

- ✅ `model` está cargado
- ✅ `X_val`, `y_val` están creados
- ✅ Todas las variables de configuración existen

## 🎯 Resumen

| Paso | Tiempo | Acción |
|------|--------|--------|
| Celdas 1-17 | ~10 min | Ejecutar (setup + data) |
| Celda "Load Model" | <1 min | Ejecutar (cargar modelo) |
| Celda 18 | ~~3 horas~~ | ⏭️ **SALTAR** |
| Celdas 22+ | ~5 min | Ejecutar (evaluación) |

**Total: ~15 minutos en lugar de 3+ horas** ⚡
