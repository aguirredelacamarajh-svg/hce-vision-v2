# MDIE: Módulo de Diagnóstico Inteligente de Errores

Este módulo es el "sistema inmunológico" de HCE Vision. Su trabajo es detectar, registrar y analizar errores automáticamente para prevenir fallos futuros.

## 📂 Estructura

- **`error_logger.py`**: Middleware que intercepta errores 500 en el backend y los guarda.
- **`client_error_logger.py`**: Endpoint (`POST /diagnostics/client_error`) para recibir errores desde Flutter/Web.
- **`analyze_errors.py`**: Script que lee los logs y genera un reporte de salud.
- **`run_safety_checks.py`**: Script "guardián" para ejecutar antes de desplegar.
- **`logs/`**: Carpeta donde se guardan los eventos en formato `.jsonl`.

## 🚀 Cómo Usarlo

### 1. Ver el estado de salud actual
Ejecuta este comando para ver qué errores están ocurriendo más frecuentemente:

```bash
python3 backend_api/diagnostics/analyze_errors.py
```

### 2. Chequeo de Seguridad (Antes de Deploy)
Ejecuta esto para asegurarte de que no hay incendios activos antes de tocar código:

```bash
python3 backend_api/diagnostics/run_safety_checks.py
```

### 3. Generar Prompt de Solución (NUEVO ✨)
El sistema ahora sugiere automáticamente un "Prompt de Solución" cuando detecta errores. Copia y pega ese prompt en tu asistente de IA (ChatGPT/Claude/Gemini) para que te dé la solución exacta.

## 🛠️ Integración

El middleware ya está conectado en `main.py`:

```python
from diagnostics.error_logger import ErrorLoggingMiddleware
app.add_middleware(ErrorLoggingMiddleware)
```

Y el endpoint de cliente también:

```python
from diagnostics.client_error_logger import router as client_error_router
app.include_router(client_error_router)
```
