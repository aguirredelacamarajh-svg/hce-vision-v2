import datetime
import os
import json
import logging
import sys
from typing import List, Dict, Optional, Any
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Depends, Request
from fastapi.responses import JSONResponse
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
    LabResult,
    BloodPressureRecord,
    UpdatePatientRequest
)
from database import init_db, get_db, save_patient_db, get_patient_db, get_all_patients_db, delete_patient_db

# ... (rest of imports and config)

# ... (existing endpoints)

# --- Configuración de Logging ---
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("hce_vision_backend")

app = FastAPI(title="HCE Vision API", version="2.1.0")

# --- Middleware de CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"], 
)

# --- Manejo Global de Errores ---
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"🔥 Unhandled Exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "message": str(exc)},
    )

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    logger.warning(f"⚠️ HTTP Exception: {exc.detail} (Status: {exc.status_code})")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )

# --- Configuración Gemini ---
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# --- Inicialización ---
@app.on_event("startup")
def on_startup():
    logger.info("🚀 Iniciando HCE Vision API v2.1 (Multi-Imagen + Historia Global)...")
    init_db()
    
    api_key = os.environ.get("GEMINI_API_KEY")
    if api_key:
        genai.configure(api_key=api_key)
        logger.info("✅ Gemini API Key configurada.")
    else:
        logger.warning("⚠️ GEMINI_API_KEY no encontrada. La IA funcionará en modo simulado.")

# --- Lógica de Negocio ---

def fake_llm_extract(text: str) -> dict:
    logger.info("🤖 Usando Extracción Simulada (Fallback)")
    return {
        "date": datetime.date.today().isoformat(),
        "type": "laboratorio",
        "title": "Análisis Simulado (Fallback)",
        "description": "No se pudo conectar con la IA real. Se muestran datos de ejemplo.",
        "antecedents": {"hta": True, "diabetes": False},
        "labs": {},
        "medications": [],
        "global_timeline_events": []
    }

def analyze_images_with_gemini(files_data: List[tuple[bytes, str]]) -> dict:
    """
    Envía MÚLTIPLES documentos (imágenes o PDFs) a Gemini 1.5 Flash para extracción estructurada.
    files_data: Lista de tuplas (contenido_bytes, mime_type)
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return fake_llm_extract("simulated")

    try:
        model_name = 'models/gemini-flash-latest'
        logger.info(f"🧠 Enviando {len(files_data)} documentos a Gemini ({model_name})...")
        
        model = genai.GenerativeModel(model_name)
        
        prompt = """
        Eres un modelo clínico experto en cardiología e internista. Debes analizar uno o más DOCUMENTOS MÉDICOS (imágenes o PDFs) que pueden ser:
        - Laboratorio (tablas, valores numéricos)
        - Ecocardiograma / Imagen cardiovascular
        - Resumen de internación (Epicrisis)
        - Electrocardiograma
        - Notas médicas, medicación
        - Informes de urgencias o consultas
        - Cualquier documento libre con datos clínicos

        OBJETIVO:
        Extraer y estructurar TODA la información relevante con la MÁXIMA sensibilidad y especificidad, para permitir al backend calcular scores cardiológicos, generar tendencias y construir una historia clínica global.

        TU RESPUESTA DEBE SER *EXCLUSIVAMENTE* un JSON VÁLIDO siguiendo esta estructura EXACTA:

        {
            "date": "YYYY-MM-DD", // Fecha del documento más relevante. Si no hay, usa la fecha de hoy.
            "type": "laboratorio" | "imagen" | "medicacion" | "epicrisis" | "procedimiento" | "consulta" | "otro",

            "title": "Texto breve descriptivo",
            "description": "Resumen clínico conciso de los hallazgos.",

            "antecedents": {
                "hta": boolean,
                "diabetes": boolean,
                "heart_failure": boolean,
                "atrial_fibrillation": boolean,
                "acs_history": boolean,
                "stroke": boolean,
                "vascular_disease": boolean,
                "renal_disease": boolean,
                "liver_disease": boolean,
                "bleeding_history": boolean,
                "labile_inr": boolean,
                "alcohol_drugs": boolean,
                "smoking": boolean,
                "obesity": boolean,
                "sedentary": boolean,
                "dyslipidemia": boolean
            },

            "labs": {
                "ldl": { "value": number, "unit": "mg/dL" } | null,
                "hdl": { "value": number, "unit": "mg/dL" } | null,
                "total_cholesterol": { "value": number, "unit": "mg/dL" } | null,
                "triglycerides": { "value": number, "unit": "mg/dL" } | null,
                "creatinine": { "value": number, "unit": "mg/dL" } | null,
                "bnp": { "value": number, "unit": "pg/mL" } | null,
                "ntprobnp": { "value": number, "unit": "pg/mL" } | null,
                "hemoglobin": { "value": number, "unit": "g/dL" } | null,
                "hba1c": { "value": number, "unit": "%" } | null,
                "glucose": { "value": number, "unit": "mg/dL" } | null,
                "potassium": { "value": number, "unit": "mEq/L" } | null,
                "sodium": { "value": number, "unit": "mEq/L" } | null
            },

            "cardio_parameters": {
                "lvef": number | null,
                "lv_mass": number | null,
                "ivsd": number | null,
                "pw_thickness": number | null,
                "tapse": number | null,
                "rv_function": "normal" | "disminuida" | null,
                "aortic_valve_area": number | null,
                "mean_gradient_av": number | null,
                "pulmonary_pressure": number | null
            },

            "historical_data": [
                {
                    "date": "YYYY-MM-DD",
                    "labs": {
                        "ldl": { "value": number, "unit": "mg/dL" },
                        "hdl": { "value": number, "unit": "mg/dL" },
                        "glucose": { "value": number, "unit": "mg/dL" },
                        "creatinine": { "value": number, "unit": "mg/dL" }
                    }
                }
            ],

            "medications": [
                "Nombre medicamento",
                "Otro medicamento"
            ],
            
            "global_timeline_events": [
                {
                    "date": "YYYY-MM-DD", 
                    "category": "cirugia" | "trauma" | "infeccion" | "oncologia" | "otro",
                    "description": "Descripción breve del evento"
                }
            ],

            "scores_detected": {
                "grace": number | null,
                "crusade": number | null,
                "killip": number | null,
                "timirisk": number | null,
                "syntax": number | null,
                "cha2ds2vasc": number | null,
                "hasbled": number | null,
                "score2": number | null,
                "framingham": number | null,
                "ascvd": number | null
            }
        }

        REGLAS DE ORO:
        1. Si el documento tiene TABLAS, debes leerlas aunque estén torcidas, incompletas o borrosas.
        2. Si aparecen valores en texto libre (ej: “LDL 178 mg/dL”), EXTRÁELOS igual.
        3. Si no estás seguro, NO inventes: usar null.
        4. Detecta antecedentes aunque estén implícitos.
        5. Detecta diagnósticos cardiológicos clave.
        6. Si hay múltiples fechas, intenta elegir la del estudio más reciente.
        7. Extrae medicaciones en texto libre y recetas.
        8. Detecta signos ecocardiográficos.
        9. Extrae eventos NO cardiológicos importantes en 'global_timeline_events'.
        10. SOLO devuelve el JSON.
        """

        # Construir el payload con Prompt + Todos los archivos (con su mime type)
        content_parts = [prompt]
        for content, mime in files_data:
            content_parts.append({'mime_type': mime, 'data': content})

        response = model.generate_content(content_parts)
        
        text_response = response.text.strip()
        if text_response.startswith("```json"):
            text_response = text_response[7:]
        if text_response.endswith("```"):
            text_response = text_response[:-3]
            
        logger.info("✅ Respuesta de Gemini recibida y parseada.")
        return json.loads(text_response)

    except Exception as e:
        logger.error(f"❌ Error llamando a Gemini: {e}", exc_info=True)
        return fake_llm_extract("error_fallback")

def safe_float(value: Any) -> Optional[float]:
    if value is None:
        return None
    try:
        return float(value)
    except (ValueError, TypeError):
        return None

def safe_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.lower() in ('true', '1', 't', 'y', 'yes')
    return bool(value)

def calculate_lipid_management(age: int, antecedents: dict, ldl_val: Optional[float]) -> Optional[LipidManagement]:
    """Calcula metas de LDL y recomendación de estatinas según riesgo cardiovascular (ESC Guidelines)."""
    if ldl_val is None:
        return None

    # 1. Determinar Categoría de Riesgo
    risk_cat = "Bajo"
    target = 116.0
    
    # Definiciones simplificadas
    has_acs = safe_bool(antecedents.get("acs_history"))
    has_stroke = safe_bool(antecedents.get("stroke"))
    has_cvd = safe_bool(antecedents.get("vascular_disease")) or has_acs or has_stroke
    has_dm = safe_bool(antecedents.get("diabetes"))
    has_ckd = safe_bool(antecedents.get("renal_disease"))
    has_fh = safe_bool(antecedents.get("dyslipidemia")) 
    
    # Lógica de Riesgo
    if has_acs and (has_dm or has_ckd or safe_bool(antecedents.get("smoking"))):
         risk_cat = "Extremo"
         target = 40.0
    elif has_cvd:
        risk_cat = "Muy Alto"
        target = 55.0
    elif has_dm or has_ckd or has_fh:
        risk_cat = "Alto"
        target = 70.0
    elif age > 50 and (safe_bool(antecedents.get("hta")) or safe_bool(antecedents.get("smoking")) or safe_bool(antecedents.get("obesity"))):
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
    if safe_bool(antecedents.get("atrial_fibrillation")):
        # CHA2DS2-VASc
        cha = 0
        if safe_bool(antecedents.get("heart_failure")): cha += 1
        if safe_bool(antecedents.get("hta")): cha += 1
        if age >= 75: cha += 2
        elif age >= 65: cha += 1
        if safe_bool(antecedents.get("diabetes")): cha += 1
        if safe_bool(antecedents.get("stroke")): cha += 2
        if safe_bool(antecedents.get("vascular_disease")): cha += 1
        if sex == 'F': cha += 1
        
        risk_txt = "Alto Riesgo (Anticoagular)" if cha >= 2 else ("Considerar Anticoagulación" if cha == 1 else "Bajo Riesgo")
        scores["chads2vasc"] = cha
        details["CHA2DS2-VASc"] = ScoreDetail(value=cha, risk=risk_txt)

        # HAS-BLED
        hb = 0
        if safe_bool(antecedents.get("hta")): hb += 1
        if safe_bool(antecedents.get("renal_disease")): hb += 1
        if safe_bool(antecedents.get("liver_disease")): hb += 1
        if safe_bool(antecedents.get("stroke")): hb += 1
        if safe_bool(antecedents.get("bleeding_history")): hb += 1
        if safe_bool(antecedents.get("labile_inr")): hb += 1
        if age > 65: hb += 1
        if safe_bool(antecedents.get("alcohol_drugs")): hb += 1
        
        hb_risk = "Alto Riesgo Sangrado" if hb >= 3 else "Bajo Riesgo Sangrado"
        scores["has_bled"] = hb
        details["HAS-BLED"] = ScoreDetail(value=hb, risk=hb_risk)

    # --- 2. Prevención Primaria (SCORE2) ---
    score2_val = None
    if 40 <= age <= 69: 
        base_risk = 1.0
        if safe_bool(antecedents.get("smoking")): base_risk *= 2.0
        if safe_bool(antecedents.get("diabetes")): base_risk *= 1.5
        if safe_bool(antecedents.get("hta")): base_risk *= 1.3
        
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
        ldl_val = safe_float(ldl_data["value"])
    elif isinstance(ldl_data, (int, float, str)):
        ldl_val = safe_float(ldl_data)
        
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
    logger.info(f"👤 Solicitud de creación de paciente: {data.name}")
    
    all_patients = get_all_patients_db(db)
    for p_data in all_patients.values():
        p = PatientSummary(**p_data)
        if p.demographics.name.lower().strip() == data.name.lower().strip():
            logger.info(f"✅ Paciente existente encontrado: {p.patient_id}")
            return p

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
    logger.info(f"✅ Nuevo paciente creado: {new_id}")
    return new_summary

@app.post("/extract_data", response_model=ExtractedData)
async def extract_data(
    patient_id: str = Form(...),
    files: List[UploadFile] = File(...), # AHORA ACEPTA LISTA DE ARCHIVOS
    db: Session = Depends(get_db)
):
    """
    Paso 1: Analiza MÚLTIPLES documentos (imágenes/PDFs) y devuelve los datos PROPUESTOS.
    """
    logger.info(f"📤 Recibida solicitud de análisis. Paciente: {patient_id}, Archivos: {len(files)}")
    
    summary_data = get_patient_db(db, patient_id)
    if not summary_data:
        logger.warning(f"❌ Paciente {patient_id} no encontrado durante extracción.")
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    summary = PatientSummary(**summary_data)

    # Leer todos los archivos y sus tipos MIME
    files_data = []
    for file in files:
        content = await file.read()
        files_data.append((content, file.content_type))

    # Analizar con IA (Multi-archivo)
    raw_data = analyze_images_with_gemini(files_data)
    
    # Crear evento temporal principal (Cardio)
    temp_event = ClinicalEvent(
        id="temp_id", 
        date=raw_data["date"] or datetime.date.today().isoformat(),
        type=raw_data["type"] or "otro",
        title=raw_data["title"] or "Documentos Analizados",
        description=raw_data["description"] or "",
        labs=raw_data["labs"],
        diagnostics=[],
        source="IA (Pendiente)"
    )

    # Calcular scores cardio
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
        logger.error(f"⚠️ Error calculando scores: {e}", exc_info=True)
        proposed_scores = RiskScores()

    # NOTA: raw_data["global_timeline_events"] contiene la historia global.
    # Por ahora la devolvemos dentro de 'historical_data' o podríamos extender el modelo ExtractedData.
    # Para simplificar sin romper el frontend, lo meteremos en 'historical_data' con una marca especial
    # o simplemente confiamos en que el frontend lo manejará si actualizamos el modelo.
    # Vamos a inyectarlo en 'historical_data' adaptado por ahora.
    
    global_events = []
    if "global_timeline_events" in raw_data:
        for evt in raw_data["global_timeline_events"]:
            # Adaptar al formato que espera el frontend (o actualizar frontend luego)
            # Por ahora lo dejamos pasar, pero idealmente ExtractedData debería tener este campo explícito.
            pass

    logger.info("✅ Extracción multi-imagen completada.")
    
    # Hack temporal: Devolver los eventos globales dentro de una estructura que el frontend pueda leer
    # O mejor, actualizaremos models.py en el siguiente paso para soportarlo oficialmente.
    
    # Sanitize antecedents to ensure all values are booleans
    sanitized_antecedents = {}
    if raw_data.get("antecedents"):
        for k, v in raw_data["antecedents"].items():
            sanitized_antecedents[k] = safe_bool(v)

    return ExtractedData(
        event=temp_event,
        medications=raw_data["medications"] or [],
        antecedents=sanitized_antecedents,
        risk_scores=proposed_scores,
        historical_data=raw_data.get("historical_data", []) 
        # TODO: Enviar global_timeline_events al frontend
    )

@app.post("/submit_analysis", response_model=PatientSummary)
async def submit_analysis(data: SubmitAnalysisRequest, db: Session = Depends(get_db)):
    """
    Paso 2: Recibe los datos CONFIRMADOS/EDITADOS por el usuario y actualiza el estado.
    """
    logger.info(f"💾 Guardando análisis confirmado para paciente: {data.patient_id}")
    
    summary_data = get_patient_db(db, data.patient_id)
    if not summary_data:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    summary = PatientSummary(**summary_data)
    
    new_event = data.event
    new_event.id = str(datetime.datetime.now().timestamp())
    new_event.source = "IA + Revisión Médica"
    
    summary.timeline.insert(0, new_event)
    
    # Actualizar Medicaciones
    existing_meds = {m.name.lower() for m in summary.medications}
    for med_name in data.medications:
        if med_name.lower() not in existing_meds:
            summary.medications.append(Medication(name=med_name))
            
    # Calcular scores finales
    scores_data = calculate_scores(
        summary.demographics.age, 
        summary.demographics.sex, 
        data.antecedents,
        new_event.labs or {}
    )
    
    scores_values = scores_data["scores"]
    
    summary.risk_scores = RiskScores(
        chads2vasc=scores_values.get("chads2vasc"),
        has_bled=scores_values.get("has_bled"),
        score2=scores_values.get("score2"),
        details=scores_data["details"],
        lipid_management=scores_values.get("lipid_management")
    )
    
    summary.antecedents = data.antecedents
    
    # --- ACTUALIZAR TENDENCIAS DE LABORATORIO ---
    if new_event.labs:
        for lab_name, lab_data in new_event.labs.items():
            try:
                val_float = None
                unit_str = ""
                
                if isinstance(lab_data, dict) and 'value' in lab_data:
                    val_float = float(lab_data['value']) if lab_data['value'] is not None else None
                    unit_str = lab_data.get('unit', "")
                elif isinstance(lab_data, (int, float)):
                    val_float = float(lab_data)
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
            except Exception as e:
                logger.warning(f"⚠️ Error procesando lab {lab_name}: {e}")

    # Alertas
    summary.alerts = [] 
    if scores_values.get("chads2vasc", 0) >= 2 and data.antecedents.get("atrial_fibrillation"):
        summary.alerts.append("Alto riesgo de ACV (FA) - Considerar Anticoagulación")
        
    lipid_mgmt = scores_values.get("lipid_management")
    if lipid_mgmt and lipid_mgmt.risk_category in ["Alto", "Muy Alto", "Extremo"]:
        summary.alerts.append(f"Dislipidemia de Riesgo {lipid_mgmt.risk_category}")

    summary.clinical_summary = f"Paciente con {len(summary.timeline)} eventos. Último: {new_event.title}."

    save_patient_db(db, summary)
    logger.info("✅ Datos guardados exitosamente.")
    return summary

@app.get("/patients/{patient_id}/summary", response_model=PatientSummary)
async def get_patient_summary(patient_id: str, db: Session = Depends(get_db)):
    """
    Devuelve el estado completo (PatientSummary) de un paciente.
    """
    logger.info(f"🔍 Consultando summary de paciente: {patient_id}")
    data = get_patient_db(db, patient_id)
    if not data:
        logger.warning(f"❌ Paciente {patient_id} no encontrado.")
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    return PatientSummary(**data)

@app.get("/patients", response_model=List[PatientSummary])
async def list_patients(db: Session = Depends(get_db)):
    """
    Devuelve la lista de todos los pacientes registrados en la BD.
    """
    logger.info("📋 Listando todos los pacientes...")
    all_data = get_all_patients_db(db)
    logger.info(f"✅ Se encontraron {len(all_data)} pacientes.")
    return [PatientSummary(**data) for data in all_data.values()]
    
@app.delete("/patients/{patient_id}")
async def delete_patient(patient_id: str, db: Session = Depends(get_db)):
    """Elimina un paciente de la base de datos."""
    logger.info(f"🗑️ Eliminando paciente: {patient_id}")
    success = delete_patient_db(db, patient_id)
    if not success:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    return {"message": "Paciente eliminado"}

@app.post("/patients/{patient_id}/blood_pressure", response_model=PatientSummary)
async def add_blood_pressure(patient_id: str, record: BloodPressureRecord, db: Session = Depends(get_db)):
    """Agrega un registro de presión arterial al historial del paciente."""
    logger.info(f"❤️ Agregando TA para paciente {patient_id}: {record}")
    
    summary_data = get_patient_db(db, patient_id)
    if not summary_data:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    summary = PatientSummary(**summary_data)
    
    summary.blood_pressure_history.append(record)
    # Ordenar por fecha y hora descendente (más reciente primero)
    summary.blood_pressure_history.sort(key=lambda x: f"{x.date} {x.time}", reverse=True)
    
    save_patient_db(db, summary)
    return summary

@app.patch("/patients/{patient_id}", response_model=PatientSummary)
async def update_patient_manual(patient_id: str, update_data: UpdatePatientRequest, db: Session = Depends(get_db)):
    """
    Actualiza manualmente datos del paciente (edición por usuario).
    Permite modificar demografía, antecedentes, scores, medicación, etc.
    """
    logger.info(f"✏️ Actualización manual para paciente {patient_id}")
    
    summary_data = get_patient_db(db, patient_id)
    if not summary_data:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    summary = PatientSummary(**summary_data)
    
    # Aplicar actualizaciones parciales
    if update_data.demographics:
        summary.demographics = update_data.demographics
        
    if update_data.antecedents:
        summary.antecedents = update_data.antecedents
        # Recalcular scores si cambian antecedentes? 
        # Por ahora confiamos en que el usuario edita lo que quiere, 
        # o podríamos disparar un recálculo opcional.
        
    if update_data.risk_scores:
        summary.risk_scores = update_data.risk_scores
        
    if update_data.medications is not None:
        summary.medications = update_data.medications
        
    if update_data.clinical_summary:
        summary.clinical_summary = update_data.clinical_summary

    if update_data.lab_trends is not None:
        summary.lab_trends = update_data.lab_trends

    if update_data.blood_pressure_history is not None:
        summary.blood_pressure_history = update_data.blood_pressure_history

    if update_data.timeline is not None:
        summary.timeline = update_data.timeline

    if update_data.global_timeline is not None:
        summary.global_timeline = update_data.global_timeline
        
    save_patient_db(db, summary)
    logger.info("✅ Paciente actualizado manualmente.")
    return summary

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
