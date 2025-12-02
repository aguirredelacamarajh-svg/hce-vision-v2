import datetime
import os
import json
from typing import List, Dict, Optional, Any
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import uvicorn
import google.generativeai as genai

from models import (
    PatientSummary, 
    ClinicalEvent, 
    Demographics, 
    RiskScores, 
    Medication, 
    ScoreDetail, 
    ClinicalEventResponse,
    ExtractedData,
    SubmitAnalysisRequest,
    CreatePatientRequest,
    LipidManagement,
    LabResult
)
from database import init_db, get_db, save_patient_db, get_patient_db, get_all_patients_db, delete_patient_db

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Permitir cualquier origen (Web, Móvil, etc.)
    allow_credentials=True,
    allow_methods=["*"], # Permitir GET, POST, OPTIONS, etc.
    allow_headers=["*"], # Permitir cualquier header
)

# Inicializar BD al arrancar
init_db()

# --- Configuración Gemini ---
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY") or "AIzaSyCS17QJUll-sS8boZJkWlcJFNAeZb0ga30"
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# --- Lógica de Negocio ---

def get_or_create_patient_summary(patient_id: str) -> PatientSummary:
    """Recupera el estado del paciente o lo inicializa si no existe."""
    # 1. Intentar recuperar de la BD
    summary = get_patient(patient_id)
    
    if summary:
        return summary
        
    # 2. Si no existe, crear uno nuevo (Mock inicial)
    new_summary = PatientSummary(
        patient_id=patient_id,
        demographics=Demographics(
            name="Juan Pérez", 
            age=65,
            sex="M"
        ),
        timeline=[],
        medications=[],
        risk_scores=RiskScores(),
        clinical_summary="Paciente nuevo registrado.",
        alerts=[]
    )
    
    # Guardar el nuevo paciente en la BD
    data = get_patient_db(db, patient_id)
    
    if data:
        return PatientSummary(**data)
        
    # Si no existe, retornar error o manejarlo (en este flujo asumimos que existe o se crea antes)
    raise HTTPException(status_code=404, detail="Paciente no encontrado")

def fake_llm_extract(text: str) -> dict:
    return {
        "date": datetime.date.today().isoformat(),
        "type": "laboratorio",
        "title": "Análisis Simulado (Fallback)",
        "description": "No se pudo conectar con la IA real. Se muestran datos de ejemplo.",
        "antecedents": {"hta": True, "diabetes": False},
        "labs": {},
        "medications": []
    }

def analyze_image_with_gemini(image_bytes: bytes) -> dict:
    """
    Envía la imagen a Gemini 1.5 Flash para extracción estructurada de datos clínicos.
    """
    if not GEMINI_API_KEY:
        print("⚠️ ADVERTENCIA: GEMINI_API_KEY no encontrada. Usando datos simulados.")
        return fake_llm_extract("simulated")

    try:
        # Usamos 'gemini-flash-latest' que apareció explícitamente en tu lista de modelos disponibles
        model = genai.GenerativeModel('gemini-flash-latest')
        
        prompt = """
        Analiza este documento médico (imagen). Extrae la información clínica relevante y devuélvela EXCLUSIVAMENTE en formato JSON válido con la siguiente estructura exacta.
        
        Estructura JSON requerida:
        {
            "date": "YYYY-MM-DD", // Fecha del documento. Si no hay, usa la fecha de hoy.
            "type": "laboratorio" | "imagen" | "medicacion" | "epicrisis" | "procedimiento" | "consulta" | "otro",
            "title": "Título breve (ej. Perfil Lipídico, Ecocardiograma)",
            "description": "Resumen conciso de hallazgos (máx 2 frases).",
            "antecedents": {
                "hta": boolean,
                "diabetes": boolean,
                "heart_failure": boolean, 
                "atrial_fibrillation": boolean, // Fibrilación Auricular (Clave para CHA2DS2-VASc)
                "acs_history": boolean, // Síndrome Coronario Agudo previo
                "stroke": boolean, 
                "vascular_disease": boolean,
                "renal_disease": boolean,
                "liver_disease": boolean,
                "bleeding_history": boolean,
                "labile_inr": boolean,
                "alcohol_drugs": boolean,
                "smoking": boolean, // Tabaquismo actual
                "obesity": boolean,
                "sedentary": boolean,
                "dyslipidemia": boolean
            },
            "labs": {
                // Extraer OBJETO con valor y unidad. Si no está, usa null.
                "ldl": { "value": number, "unit": "string" } | null, 
                "hdl": { "value": number, "unit": "string" } | null,
                "total_cholesterol": { "value": number, "unit": "string" } | null,
                "triglycerides": { "value": number, "unit": "string" } | null,
                "creatinine": { "value": number, "unit": "string" } | null,
                "bnp": { "value": number, "unit": "string" } | null, // BNP o NT-proBNP
                "hemoglobin": { "value": number, "unit": "string" } | null,
                "hba1c": { "value": number, "unit": "string" } | null,
                "potassium": { "value": number, "unit": "string" } | null
            },
            "historical_data": [
                // BUSCA ACTIVAMENTE EN EL TEXTO Y TABLAS.
                {
                    "date": "YYYY-MM-DD", 
                    "labs": { 
                        "ldl": { "value": number, "unit": "string" },
                        "bnp": { "value": number, "unit": "string" }
                        // ... otros
                    }
                }
            ],
            "medications": ["Nombre Medicamento 1", "Nombre Medicamento 2"]
        }
        """

        # Crear el contenido para el modelo (Prompt + Imagen)
        response = model.generate_content([
            {'mime_type': 'image/jpeg', 'data': image_bytes},
            prompt
        ])
        
        # Limpiar la respuesta para obtener solo el JSON
        text_response = response.text.strip()
        if text_response.startswith("```json"):
            text_response = text_response[7:]
        if text_response.endswith("```"):
            text_response = text_response[:-3]
            
        return json.loads(text_response)

    except Exception as e:
        print(f"❌ Error llamando a Gemini: {e}")
        return fake_llm_extract("error_fallback")

def calculate_lipid_management(age: int, antecedents: dict, ldl_val: Optional[float]) -> Optional[LipidManagement]:
    """Calcula metas de LDL y recomendación de estatinas según riesgo cardiovascular (ESC Guidelines)."""
    if ldl_val is None:
        return None

    # 1. Determinar Categoría de Riesgo
    risk_cat = "Bajo"
    target = 116.0
    
    # Definiciones simplificadas
    has_acs = antecedents.get("acs_history")
    has_stroke = antecedents.get("stroke")
    has_cvd = antecedents.get("vascular_disease") or has_acs or has_stroke
    has_dm = antecedents.get("diabetes")
    has_ckd = antecedents.get("renal_disease")
    has_fh = antecedents.get("dyslipidemia") 
    
    # Lógica de Riesgo
    if has_acs and (has_dm or has_ckd or antecedents.get("smoking")):
         # Paciente con evento previo + comorbilidad mayor -> Riesgo Extremo (No oficial ESC pero usado clínicamente)
         risk_cat = "Extremo"
         target = 40.0
    elif has_cvd:
        risk_cat = "Muy Alto"
        target = 55.0
    elif has_dm or has_ckd or has_fh:
        risk_cat = "Alto"
        target = 70.0
    elif age > 50 and (antecedents.get("hta") or antecedents.get("smoking") or antecedents.get("obesity")):
        risk_cat = "Moderado"
        target = 100.0
    
    # 2. Calcular reducción necesaria
    reduction_pct = 0.0
    if ldl_val > target:
        reduction_pct = ((ldl_val - target) / ldl_val) * 100
    
    # 3. Estrategia Terapéutica (Estatinas)
    recommendation = "Estilo de vida saludable."
    
    if reduction_pct > 0:
        if reduction_pct >= 50:
            recommendation = "Estatina Alta Potencia:\n• Atorvastatina 40-80 mg\n• Rosuvastatina 20-40 mg\n(Considerar Ezetimibe si no alcanza meta)"
        elif reduction_pct >= 30:
            recommendation = "Estatina Moderada Potencia:\n• Atorvastatina 10-20 mg\n• Rosuvastatina 5-10 mg"
        else:
            recommendation = "Estatina Baja-Moderada Potencia."
            
    if ldl_val <= target:
        recommendation = "Meta alcanzada. Mantener tratamiento actual."

    return LipidManagement(
        ldl_current=ldl_val,
        risk_category=risk_cat,
        ldl_target=target,
        reduction_needed_pct=round(reduction_pct, 1),
        recommendation=recommendation
    )

def calculate_scores(age: int, sex: str, antecedents: dict, labs: dict = {}) -> Dict[str, Any]:
    """Calcula scores condicionales según patología."""
    
    scores = {}
    details = {}

    # --- 1. Fibrilación Auricular (CHA2DS2-VASc & HAS-BLED) ---
    if antecedents.get("atrial_fibrillation"):
        # CHA2DS2-VASc
        cha = 0
        if antecedents.get("heart_failure"): cha += 1
        if antecedents.get("hta"): cha += 1
        if age >= 75: cha += 2
        elif age >= 65: cha += 1
        if antecedents.get("diabetes"): cha += 1
        if antecedents.get("stroke"): cha += 2
        if antecedents.get("vascular_disease"): cha += 1
        if sex == 'F': cha += 1
        
        risk_txt = "Alto Riesgo (Anticoagular)" if cha >= 2 else ("Considerar Anticoagulación" if cha == 1 else "Bajo Riesgo")
        scores["chads2vasc"] = cha
        details["CHA2DS2-VASc"] = ScoreDetail(value=cha, risk=risk_txt)

        # HAS-BLED
        hb = 0
        if antecedents.get("hta"): hb += 1
        if antecedents.get("renal_disease"): hb += 1
        if antecedents.get("liver_disease"): hb += 1
        if antecedents.get("stroke"): hb += 1
        if antecedents.get("bleeding_history"): hb += 1
        if antecedents.get("labile_inr"): hb += 1
        if age > 65: hb += 1
        if antecedents.get("alcohol_drugs"): hb += 1
        
        hb_risk = "Alto Riesgo Sangrado" if hb >= 3 else "Bajo Riesgo Sangrado"
        scores["has_bled"] = hb
        details["HAS-BLED"] = ScoreDetail(value=hb, risk=hb_risk)

    # --- 2. Prevención Primaria (SCORE2) ---
    # Solo si NO tiene enfermedad cardiovascular establecida
    # SCORE2 (Riesgo a 10 años) - Simplificado
    # En la práctica real, usaríamos tablas calibradas por región.
    # Aquí usamos una aproximación basada en edad, tabaquismo y presión.
    score2_val = None
    if 40 <= age <= 69: # SCORE2 es válido en este rango
        base_risk = 1.0
        if antecedents.get("smoking"): base_risk *= 2.0
        if antecedents.get("diabetes"): base_risk *= 1.5
        if antecedents.get("hta"): base_risk *= 1.3
        
        # Ajuste por edad (exponencial simple para demo)
        age_factor = (age - 40) / 10.0
        score2_val = round(base_risk * (1 + age_factor), 1)
        
        risk_label = "Bajo"
        if score2_val >= 10: risk_label = "Muy Alto"
        elif score2_val >= 5: risk_label = "Alto"
        elif score2_val >= 2.5: risk_label = "Moderado"
        
        scores["score2"] = score2_val
        details["SCORE2"] = ScoreDetail(value=score2_val, risk=risk_label)

    # --- 3. Manejo de Lípidos ---
    ldl_data = labs.get("ldl")
    ldl_val = None
    
    if isinstance(ldl_data, dict) and "value" in ldl_data:
        ldl_val = ldl_data["value"]
    elif isinstance(ldl_data, (int, float)):
        ldl_val = float(ldl_data)
        
    lipid_mgmt = calculate_lipid_management(age, antecedents, ldl_val)
    if lipid_mgmt:
        scores["lipid_management"] = lipid_mgmt

    return {
        "scores": scores,
        "details": details
    }

# --- Endpoints ---

@app.post("/patients", response_model=PatientSummary)
async def create_patient(data: CreatePatientRequest, db: Session = Depends(get_db)):
    """
    Crea un nuevo paciente o devuelve uno existente si el nombre coincide.
    """
    
    # 1. Buscar si ya existe alguien con ese nombre (búsqueda simple)
    all_patients = get_all_patients_db(db)
    for p_data in all_patients.values():
        p = PatientSummary(**p_data)
        if p.demographics.name.lower().strip() == data.name.lower().strip():
            return p

    # 2. Si no existe, crear uno nuevo
    import uuid
    new_id = str(uuid.uuid4())
    
    new_summary = PatientSummary(
        patient_id=new_id,
        demographics=Demographics(
            name=data.name,
            age=data.age,
            sex=data.sex
        ),
        timeline=[],
        medications=[],
        risk_scores=RiskScores(),
        clinical_summary="Paciente registrado.",
        alerts=[]
    )
    
    save_patient_db(db, new_summary)
    return new_summary

@app.post("/extract_data", response_model=ExtractedData)
async def extract_data(
    patient_id: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Paso 1: Analiza la imagen y devuelve los datos PROPUESTOS (sin guardar nada).
    """
    # Obtener resumen actual para tener contexto (edad, antecedentes previos)
    summary_data = get_patient_db(db, patient_id)
    if not summary_data:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    summary = PatientSummary(**summary_data)

    content = await file.read()
    raw_data = analyze_image_with_gemini(content)
    
    temp_event = ClinicalEvent(
        id="temp_id", 
        date=raw_data["date"] or datetime.date.today().isoformat(),
        type=raw_data["type"] or "otro",
        title=raw_data["title"] or "Documento Analizado",
        description=raw_data["description"] or "",
        labs=raw_data["labs"],
        diagnostics=[],
        source="IA (Pendiente)"
    )

    try:
        scores_data = calculate_scores(
            summary.demographics.age, 
            summary.demographics.sex, 
            raw_data["antecedents"] or {},
            raw_data["labs"] or {}
        )
        
        proposed_scores = RiskScores(
            chads2vasc=scores_data["scores"].get("chads2vasc"),
            has_bled=scores_data["scores"].get("has_bled"),
            score2=scores_data["scores"].get("score2"),
            details=scores_data["details"],
            lipid_management=scores_data["scores"].get("lipid_management")
        )
    except Exception as e:
        print(f"⚠️ Error calculando scores: {e}")
        import traceback
        traceback.print_exc()
        proposed_scores = RiskScores() # Retornar vacío si falla

    return ExtractedData(
        event=temp_event,
        medications=raw_data["medications"] or [],
        antecedents=raw_data["antecedents"] or {},
        risk_scores=proposed_scores,
        historical_data=raw_data.get("historical_data", [])
    )

@app.post("/submit_analysis", response_model=PatientSummary)
async def submit_analysis(data: SubmitAnalysisRequest, db: Session = Depends(get_db)):
    """
    Paso 2: Recibe los datos CONFIRMADOS/EDITADOS por el usuario y actualiza el estado.
    """
    summary_data = get_patient_db(db, data.patient_id)
    if not summary_data:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    summary = PatientSummary(**summary_data)
    
    new_event = data.event
    new_event.id = str(datetime.datetime.now().timestamp()) # ID definitivo
    new_event.source = "IA + Revisión Médica"
    
    summary.timeline.insert(0, new_event)
    
    # Actualizar Medicaciones (Merge inteligente simple)
    existing_meds = {m.name.lower() for m in summary.medications}
    for med_name in data.medications:
        if med_name.lower() not in existing_meds:
            summary.medications.append(Medication(name=med_name))
            
    # Calcular scores finales usando los datos confirmados (incluyendo labs del evento si los hay)
    # Nota: En una app real, deberíamos pasar los labs confirmados aquí. 
    # Por ahora usaremos los del evento si existen.
    event_labs = {}
    if new_event.labs:
        # Convertir labs del evento (que pueden ser strings) a formato numérico si es posible para el cálculo
        # Esto es una simplificación. Idealmente SubmitAnalysisRequest tendría los labs estructurados.
        pass 

    scores_data = calculate_scores(
        summary.demographics.age, 
        summary.demographics.sex, 
        data.antecedents,
        new_event.labs or {} # Pasar los labs confirmados
    )
    
    scores_values = scores_data["scores"]
    
    summary.risk_scores = RiskScores(
        chads2vasc=scores_values.get("chads2vasc"),
        has_bled=scores_values.get("has_bled"),
        score2=scores_values.get("score2"),
        details=scores_data["details"],
        lipid_management=scores_values.get("lipid_management")
    )
    
    # Guardar antecedentes confirmados
    summary.antecedents = data.antecedents
    
    # --- ACTUALIZAR TENDENCIAS DE LABORATORIO ---
    if new_event.labs:
        for lab_name, lab_data in new_event.labs.items():
            try:
                val_float = None
                unit_str = ""
                
                # Caso 1: Es un diccionario con 'value' y 'unit' (Nuevo formato)
                if isinstance(lab_data, dict) and 'value' in lab_data:
                    val_float = float(lab_data['value']) if lab_data['value'] is not None else None
                    unit_str = lab_data.get('unit', "")
                
                # Caso 2: Es un número directo (Legacy)
                elif isinstance(lab_data, (int, float)):
                    val_float = float(lab_data)
                
                # Caso 3: Es un string sucio (Legacy)
                elif isinstance(lab_data, str):
                    import re
                    match = re.search(r"[-+]?\d*\.\d+|\d+", lab_data)
                    if match:
                        val_float = float(match.group())

                if val_float is not None:
                    if lab_name not in summary.lab_trends:
                        summary.lab_trends[lab_name] = []
                    
                    summary.lab_trends[lab_name].append(LabResult(
                        date=new_event.date,
                        value=val_float,
                        unit=unit_str
                    ))
                    
                    summary.lab_trends[lab_name].sort(key=lambda x: x.date)
                    print(f"✅ Guardado Lab: {lab_name} = {val_float} {unit_str}")
            except Exception as e:
                print(f"⚠️ Error procesando lab {lab_name}: {e}")

    # --- PROCESAR DATOS HISTÓRICOS (TABLAS) ---
    if data.historical_data:
        print(f"📜 Procesando {len(data.historical_data)} registros históricos...")
        for record in data.historical_data:
            if record.labs:
                for lab_name, lab_data in record.labs.items():
                    try:
                        val_float = None
                        unit_str = ""
                        
                        # Mismo parsing que arriba
                        if isinstance(lab_data, dict) and 'value' in lab_data:
                            val_float = float(lab_data['value']) if lab_data['value'] is not None else None
                            unit_str = lab_data.get('unit', "")
                        elif isinstance(lab_data, (int, float)):
                            val_float = float(lab_data)
                        
                        if val_float is not None:
                            if lab_name not in summary.lab_trends:
                                summary.lab_trends[lab_name] = []
                            
                            summary.lab_trends[lab_name].append(LabResult(
                                date=record.date,
                                value=val_float,
                                unit=unit_str
                            ))
                            print(f"   -> Histórico: {record.date} - {lab_name}: {val_float}")
                    except:
                        pass
        
        # Reordenar todo al final
        for k in summary.lab_trends:
            summary.lab_trends[k].sort(key=lambda x: x.date)

    summary.clinical_summary = f"Paciente con {len(summary.timeline)} eventos. Último: {new_event.title}."
    
    # Alertas
    if scores_values.get("chads2vasc", 0) >= 2 and data.antecedents.get("atrial_fibrillation"):
        summary.alerts.append("Alto riesgo de ACV (FA) - Considerar Anticoagulación")
        
    lipid_mgmt = scores_values.get("lipid_management")
    if lipid_mgmt and lipid_mgmt.risk_category in ["Alto", "Muy Alto", "Extremo"]:
        summary.alerts.append(f"Dislipidemia de Riesgo {lipid_mgmt.risk_category}")

    save_patient_db(db, summary)
            
    return summary

@app.get("/patients/{patient_id}/summary", response_model=PatientSummary)
async def get_patient_summary(patient_id: str, db: Session = Depends(get_db)):
    """
    Devuelve el estado completo (PatientSummary) de un paciente.
    """
    data = get_patient_db(db, patient_id)
    if not data:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    return PatientSummary(**data)

@app.get("/patients", response_model=List[PatientSummary])
async def list_patients(db: Session = Depends(get_db)):
    """
    Devuelve la lista de todos los pacientes registrados en la BD.
    """
    all_data = get_all_patients_db(db)
    return [PatientSummary(**data) for data in all_data.values()]
    
@app.delete("/patients/{patient_id}")
async def delete_patient(patient_id: str, db: Session = Depends(get_db)):
    """Elimina un paciente de la base de datos."""
    success = delete_patient_db(db, patient_id)
    if not success:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    return {"message": "Paciente eliminado"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
