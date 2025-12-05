import json
import os
from collections import Counter
from datetime import datetime

# Configuración de rutas
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOG_FILE = os.path.join(BASE_DIR, "diagnostics", "logs", "backend_error_events.jsonl")
CLIENT_LOG_FILE = os.path.join(BASE_DIR, "diagnostics", "logs", "client_error_events.jsonl")

def load_logs(filepath):
    """Lee un archivo JSONL y devuelve una lista de diccionarios."""
    events = []
    if not os.path.exists(filepath):
        return events
    
    with open(filepath, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    events.append(json.loads(line))
                except json.JSONDecodeError:
                    continue
    return events

def print_header(title):
    print(f"\n{'='*60}")
    print(f" {title}")
    print(f"{'='*60}")

def analyze_backend_errors():
    events = load_logs(LOG_FILE)
    if not events:
        print("✅ No se encontraron errores de backend registrados (o el archivo no existe).")
        return

    print_header(f"ANÁLISIS DE ERRORES DE BACKEND ({len(events)} eventos)")

    # Estadísticas
    error_types = Counter(e.get("error_type", "Unknown") for e in events)
    endpoints = Counter(f"{e.get('method')} {e.get('path')}" for e in events)
    
    # Top Errores
    print("\n🏆 TOP 5 Tipos de Error:")
    for err, count in error_types.most_common(5):
        print(f"   - {err}: {count} veces")

    # Top Endpoints
    print("\n📍 TOP 5 Endpoints Afectados:")
    for path, count in endpoints.most_common(5):
        print(f"   - {path}: {count} veces")

    # Últimos errores
    print("\n🕒 Últimos 3 Errores:")
    for e in events[-3:]:
        ts = e.get("timestamp", "")[:19].replace("T", " ")
        print(f"   [{ts}] {e.get('error_type')}: {e.get('error_message')}")
        print(f"      Ruta: {e.get('method')} {e.get('path')}")

    # Generar Prompt de Solución para el error más frecuente
    if error_types:
        most_common_error = error_types.most_common(1)[0][0]
        # Buscar un ejemplo de este error
        example_error = next((e for e in events if e.get("error_type") == most_common_error), None)
        
        if example_error:
            generate_solution_prompt(most_common_error, example_error)

def generate_solution_prompt(error_type, error_data):
    """Genera un prompt listo para copiar y pegar en una IA."""
    print(f"\n{'='*60}")
    print(f" ✨ PROMPT DE SOLUCIÓN SUGERIDO (Copia y pega esto en tu IA)")
    print(f"{'='*60}")
    
    prompt = f"""
Hola, estoy teniendo un error recurrente en mi backend FastAPI.
Aquí están los detalles del error más frecuente:

Tipo de Error: {error_type}
Mensaje: {error_data.get('error_message')}
Endpoint: {error_data.get('method')} {error_data.get('path')}

Traceback:
{error_data.get('traceback')}

Por favor, analiza este error y dame:
1. La causa raíz probable.
2. El código corregido para solucionarlo.
"""
    print(prompt)
    print(f"{'='*60}\n")

def analyze_client_errors():
    events = load_logs(CLIENT_LOG_FILE)
    if not events:
        return # Silencioso si no hay logs de cliente aún

    print_header(f"ANÁLISIS DE ERRORES DE CLIENTE ({len(events)} eventos)")
    
    error_types = Counter(e.get("error_type", "Unknown") for e in events)
    screens = Counter(e.get("screen", "Unknown") for e in events)

    print("\n📱 TOP 5 Errores de Cliente:")
    for err, count in error_types.most_common(5):
        print(f"   - {err}: {count} veces")

    print("\n🖼️  Pantallas más afectadas:")
    for scr, count in screens.most_common(5):
        print(f"   - {scr}: {count} veces")

if __name__ == "__main__":
    print(f"🔍 Ejecutando diagnóstico MDIE a las {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}...")
    analyze_backend_errors()
    analyze_client_errors()
    print("\n✅ Análisis finalizado.\n")
