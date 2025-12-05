import json
import os
from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any

# Configuración de logs
LOG_DIR = os.path.join(os.path.dirname(__file__), "logs")
CLIENT_LOG_FILE = os.path.join(LOG_DIR, "client_error_events.jsonl")

# Asegurar directorio
os.makedirs(LOG_DIR, exist_ok=True)

router = APIRouter(prefix="/diagnostics", tags=["Diagnostics"])

class ClientErrorEvent(BaseModel):
    screen: str
    error_type: str
    message: str
    stack: Optional[str] = None
    platform: str = "unknown"
    extra: Optional[Dict[str, Any]] = {}

@router.post("/client_error")
async def log_client_error(event: ClientErrorEvent):
    """
    Endpoint para recibir reportes de errores desde el frontend (Flutter/Web).
    """
    try:
        log_entry = event.dict()
        log_entry["timestamp"] = datetime.now().isoformat()
        log_entry["source"] = "client_report"

        with open(CLIENT_LOG_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(log_entry) + "\n")
        
        return {"status": "recorded", "id": log_entry["timestamp"]}
    except Exception as e:
        # Si falla el log, no queremos romper la app del cliente, pero sí avisar
        print(f"❌ Error guardando log de cliente: {e}")
        raise HTTPException(status_code=500, detail="Could not save error log")
