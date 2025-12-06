from fastapi.testclient import TestClient
from main import app
import uuid

client = TestClient(app)

def test_full_patient_history_flow():
    """
    Prueba de integración crítica:
    1. Crea un paciente.
    2. Envía un análisis con datos históricos (simulando lo que envía la app).
    3. Verifica que el resumen (/summary) contenga TODOS los puntos históricos ordenados.
    """
    
    # 1. Crear Paciente
    patient_name = f"Test User {uuid.uuid4()}"
    resp_create = client.post("/patients", json={
        "name": patient_name,
        "age": 50,
        "sex": "M"
    })
    assert resp_create.status_code == 200
    patient_id = resp_create.json()["patient_id"]
    
    # 2. Enviar Análisis con Historial (Simulación de App)
    payload = {
        "patient_id": patient_id,
        "event": {
            "id": "evt_test_1",
            "date": "2024-06-01",
            "type": "laboratorio",
            "title": "Lab Test",
            "description": "Integration Test",
            "labs": {
                "ldl": {"value": 100, "unit": "mg/dL"} # Valor actual
            }
        },
        "medications": [],
        "antecedents": {},
        "historical_data": [
            {
                "date": "2023-01-01",
                "labs": {"ldl": {"value": 150, "unit": "mg/dL"}}
            },
            {
                "date": "2023-12-01",
                "labs": {"ldl": {"value": 120, "unit": "mg/dL"}}
            }
        ]
    }
    
    resp_submit = client.post("/submit_analysis", json=payload)
    assert resp_submit.status_code == 200
    
    # 3. Verificar Summary
    resp_summary = client.get(f"/patients/{patient_id}/summary")
    assert resp_summary.status_code == 200
    summary_data = resp_summary.json()
    
    # Verificar Tendencias
    ldl_trend = summary_data.get("lab_trends", {}).get("ldl", [])
    
    # Debemos tener 3 puntos: 2 históricos + 1 actual
    assert len(ldl_trend) == 3, f"Se esperaban 3 puntos de LDL, se encontraron {len(ldl_trend)}"
    
    # Verificar Orden Cronológico
    dates = [item["date"] for item in ldl_trend]
    assert dates == ["2023-01-01", "2023-12-01", "2024-06-01"], f"Orden incorrecto: {dates}"
    
    # Verificar Valores
    values = [item["value"] for item in ldl_trend]
    assert values == [150.0, 120.0, 100.0]

    print(f"✅ Test de Integración Exitoso para Paciente {patient_id}")
