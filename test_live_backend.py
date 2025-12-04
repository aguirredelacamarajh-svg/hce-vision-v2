import requests
import sys
import os

# URL de tu backend en Render (Reemplázala con la real si es diferente)
# Por defecto intentamos leerla de una variable de entorno o argumento, sino pedimos input
BACKEND_URL = os.environ.get("RENDER_BACKEND_URL")

if not BACKEND_URL:
    print("⚠️  Por favor, ingresa la URL de tu backend en Render (ej: https://hce-vision-backend.onrender.com)")
    BACKEND_URL = input("URL: ").strip()

if not BACKEND_URL.startswith("http"):
    BACKEND_URL = f"https://{BACKEND_URL}"

ENDPOINT = f"{BACKEND_URL}/extract_data"

# Imagen de prueba (buscaremos una en el directorio o crearemos una dummy si es necesario, 
# pero idealmente el usuario debería tener una)
# Vamos a intentar usar una imagen que exista, o pedir path.
IMAGE_PATH = "test_image.jpg" 

if len(sys.argv) > 1:
    IMAGE_PATH = sys.argv[1]

if not os.path.exists(IMAGE_PATH):
    print(f"❌ No encontré la imagen de prueba: {IMAGE_PATH}")
    print("Por favor, coloca una imagen médica de prueba llamada 'test_image.jpg' en esta carpeta")
    print("o ejecuta el script pasando la ruta de la imagen: python test_live_backend.py ruta/a/imagen.jpg")
    
    # Crear una imagen dummy solo para probar conectividad (aunque la IA fallará al analizarla)
    # create_dummy = input("¿Quieres crear una imagen dummy de prueba? (s/n): ")
    # if create_dummy.lower() == 's':
    #     with open("test_image.jpg", "wb") as f:
    #         f.write(os.urandom(1024)) # Ruido aleatorio
    #     IMAGE_PATH = "test_image.jpg"
    # else:
    sys.exit(1)

print(f"🚀 Enviando petición a: {ENDPOINT}")
print(f"📁 Imagen: {IMAGE_PATH}")

try:
    # 1. Listar Pacientes para ver qué hay
    print("📋 Listando pacientes...")
    list_url = f"{BACKEND_URL}/patients"
    try:
        resp_list = requests.get(list_url)
        if resp_list.status_code == 200:
            patients = resp_list.json()
            print(f"✅ Encontrados {len(patients)} pacientes.")
            if len(patients) > 0:
                # Tomar el primero para probar
                target_p = patients[0]
                patient_id = target_p["patient_id"]
                print(f"🎯 Intentando obtener detalle del paciente: ID='{patient_id}' Name='{target_p['demographics']['name']}'")
                
                # 2. Intentar obtener el summary
                summary_url = f"{BACKEND_URL}/patients/{patient_id}/summary"
                resp_summary = requests.get(summary_url)
                if resp_summary.status_code == 200:
                     print("✅ Summary obtenido correctamente!")
                else:
                     print(f"❌ Error obteniendo summary: {resp_summary.status_code}")
                     print(resp_summary.text)
            else:
                print("⚠️ No hay pacientes para probar. Creando uno...")
                # ... (crear uno si no hay)
                patient_id = "test_patient_001"
        else:
            print(f"❌ Error listando pacientes: {resp_list.status_code}")
            patient_id = "test_patient_001"

    except Exception as e:
        print(f"⚠️ Error en test: {e}")
        patient_id = "test_patient_001"

    # Salir aquí para no ejecutar la parte de la imagen por ahora, queremos aislar el bug del GET
    sys.exit(0)
        
    print(f"📡 Status Code: {response.status_code}")
    
    if response.status_code == 200:
        print("✅ ¡Éxito! Respuesta del servidor:")
        import json
        try:
            res_json = response.json()
            print(json.dumps(res_json, indent=2, ensure_ascii=False))
            
            # Verificar si es data simulada
            if "simulated" in str(res_json).lower() or "fallback" in str(res_json).lower():
                print("\n⚠️  ATENCIÓN: La respuesta parece contener datos SIMULADOS.")
                print("Esto podría indicar que la API Key falló o el modelo no respondió.")
            else:
                print("\n🎉  La respuesta parece venir de la IA REAL.")
                
        except:
            print(response.text)
    else:
        print("❌ Error en la petición:")
        print(response.text)

except Exception as e:
    print(f"❌ Error ejecutando el script: {e}")
