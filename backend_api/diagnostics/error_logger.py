import json
import time
import traceback
import os
from datetime import datetime
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

# Ruta al archivo de logs
LOG_DIR = os.path.join(os.path.dirname(__file__), "logs")
LOG_FILE = os.path.join(LOG_DIR, "backend_error_events.jsonl")

# Asegurar que el directorio de logs exista
os.makedirs(LOG_DIR, exist_ok=True)

class ErrorLoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware que captura excepciones no manejadas en endpoints HTTP,
    las registra en un archivo JSONL y luego re-lanza la excepción
    para que FastAPI la maneje (o devuelva 500).
    """

    async def dispatch(self, request: Request, call_next):
        try:
            response = await call_next(request)
            return response
        except Exception as exc:
            # Capturar detalles del error
            error_data = {
                "timestamp": datetime.now().isoformat(),
                "path": request.url.path,
                "method": request.method,
                "error_type": type(exc).__name__,
                "error_message": str(exc),
                "traceback": traceback.format_exc(),
                # Intentar capturar query params si existen
                "query_params": str(request.query_params),
            }

            # Escribir en el archivo JSONL (append mode)
            try:
                with open(LOG_FILE, "a", encoding="utf-8") as f:
                    f.write(json.dumps(error_data) + "\n")
            except Exception as log_exc:
                # Si falla el logging, imprimir en consola para no perderlo
                print(f"❌ Error escribiendo en log de diagnóstico: {log_exc}")

            # Re-lanzar la excepción para que FastAPI siga su flujo normal de error
            raise exc
