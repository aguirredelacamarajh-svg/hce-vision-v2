import sys
import os
import subprocess
from datetime import datetime

# Colores para consola
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
RESET = "\033[0m"

def run_command(command, description):
    print(f"🔹 Ejecutando: {description}...")
    result = subprocess.run(command, shell=True, capture_output=True, text=True)
    if result.returncode == 0:
        print(f"{GREEN}✅ Éxito{RESET}")
        return True, result.stdout
    else:
        print(f"{RED}❌ Falló{RESET}")
        print(result.stderr)
        return False, result.stderr

def check_recent_errors():
    """Verifica si hubo errores en la última hora (simulado leyendo logs)."""
    # Aquí importamos la lógica de análisis
    try:
        from diagnostics.analyze_errors import load_logs, LOG_FILE
        events = load_logs(LOG_FILE)
        if not events:
            return True
        
        # Lógica simple: si hay más de 5 errores hoy, avisar
        today_str = datetime.now().isoformat()[:10]
        today_errors = [e for e in events if e.get("timestamp", "").startswith(today_str)]
        
        if len(today_errors) > 5:
            print(f"{YELLOW}⚠️ ADVERTENCIA: Se han registrado {len(today_errors)} errores HOY.{RESET}")
            print("   Revisa 'python -m diagnostics.analyze_errors' antes de desplegar.")
            return False
        
        print(f"{GREEN}✅ Pocos errores recientes ({len(today_errors)} hoy).{RESET}")
        return True
    except Exception as e:
        print(f"⚠️ No se pudo verificar logs recientes: {e}")
        return True

def main():
    print(f"\n🛡️  INICIANDO CHEQUEOS DE SEGURIDAD (MDIE)  🛡️\n")
    
    all_passed = True

    # 1. Verificar sintaxis Python (básico)
    # Esto asegura que no rompimos nada obvio en backend_api
    ok, _ = run_command("python3 -m py_compile backend_api/main.py", "Verificación de Sintaxis (main.py)")
    if not ok: all_passed = False

    # 2. Ejecutar Análisis de Errores
    print("\n📊 Resumen de Errores Actuales:")
    subprocess.run("python3 backend_api/diagnostics/analyze_errors.py", shell=True)

    # 3. Verificar umbrales de error
    if not check_recent_errors():
        all_passed = False

    # 4. (Futuro) Ejecutar Tests
    # ok, _ = run_command("pytest", "Tests Unitarios")
    
    print(f"\n{'='*40}")
    if all_passed:
        print(f"{GREEN}🚀 TODO OK. El sistema parece estable para cambios.{RESET}")
        sys.exit(0)
    else:
        print(f"{RED}🛑 SE ENCONTRARON PROBLEMAS. Revisa los logs antes de continuar.{RESET}")
        sys.exit(1)

if __name__ == "__main__":
    main()
