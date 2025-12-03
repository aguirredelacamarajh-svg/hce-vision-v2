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
    LabResult
)
from database import init_db, get_db, save_patient_db, get_patient_db, get_all_patients_db, delete_patient_db

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

def analyze_images_with_gemini(images_bytes: List[bytes]) -> dict:
    """
    Envía MÚLTIPLES imágenes a Gemini 1.5 Flash para extracción estructurada.
    Separa datos Cardiológicos vs. Historia Global.
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return fake_llm_extract("simulated")

    try:
        model_name = 'models/gemini-flash-latest'
        logger.info(f"🧠 Enviando {len(images_bytes)} imágenes a Gemini ({model_name})...")
        
        model = genai.GenerativeModel(model_name)
        
        prompt = """
        Actúa como un Cardiólogo experto y un Internista meticuloso. Analiza este conjunto de documentos médicos (pueden ser múltiples páginas de una misma historia o varios estudios).
        
        Tu objetivo es construir dos líneas de información paralelas:
        1. **Perfil Cardiológico (Prioridad Alta):** Datos críticos para cálculo de riesgo (CHA2DS2-VASc, SCORE2, Lípidos).
        2. **Historia Clínica Global (Contexto):** Cualquier otro evento médico relevante NO cardiológico (cirugías, traumas, infecciones, otras patologías crónicas) para tener una visión holística del paciente.

        Extrae la información y devuélvela EXCLUSIVAMENTE en formato JSON válido con la siguiente estructura:
        
        {
            "date": "YYYY-MM-DD", // Fecha del documento principal o la más reciente encontrada.
            "type": "laboratorio" | "imagen" | "medicacion" | "epicrisis" | "procedimiento" | "consulta" | "otro",
            "title": "Título descriptivo del conjunto de documentos",
            "description": "Resumen conciso de los hallazgos principales (Cardio + Global).",
            
            "antecedents": {
                // CARDIOVASCULARES
                "hta": boolean,
                "diabetes": boolean,
                "heart_failure": boolean, 
                "atrial_fibrillation": boolean, 
                "acs_history": boolean, 
                "stroke": boolean, 
                "vascular_disease": boolean,
                "dyslipidemia": boolean,
                
                // RIESGO SANGRADO / OTROS
                "renal_disease": boolean,
                "liver_disease": boolean,
                "bleeding_history": boolean,
                "labile_inr": boolean,
                "alcohol_drugs": boolean,
                "smoking": boolean, 
                "obesity": boolean,
                "sedentary": boolean
            },
            
            "labs": {
                // Valores numéricos clave para cardio
                "ldl": { "value": number, "unit": "string" } | null, 
                "hdl": { "value": number, "unit": "string" } | null,
                "total_cholesterol": { "value": number, "unit": "string" } | null,
                "triglycerides": { "value": number, "unit": "string" } | null,
                "creatinine": { "value": number, "unit": "string" } | null,
                "bnp": { "value": number, "unit": "string" } | null, 
                "hemoglobin": { "value": number, "unit": "string" } | null,
                "hba1c": { "value": number, "unit": "string" } | null,
                "potassium": { "value": number, "unit": "string" } | null
            },
            
            "medications": ["Nombre Medicamento 1", "Nombre Medicamento 2"],
            
            "global_timeline_events": [
                // AQUÍ VA LA HISTORIA GLOBAL (NO CARDIOLÓGICA O EVENTOS PASADOS)
                // Extrae cirugías previas, diagnósticos de otras especialidades, internaciones antiguas, etc.
                {
                    "date": "YYYY-MM-DD", // Aproximada si no es exacta
                    "category": "cirugia" | "trauma" | "infeccion" | "oncologia" | "otro",
                    "description": "Descripción breve del evento (ej. Apendicectomía, Neumonía, Fractura de fémur)"
                }
            ],

            "historical_data": [
                // Tablas de laboratorios antiguos encontrados en el texto para gráficas
                {
                    "date": "YYYY-MM-DD", 
                    "labs": { 
                        "ldl": { "value": number, "unit": "string" },
                        "creatinine": { "value": number, "unit": "string" }
                    }
                }
            ]
        }
        """

        # Construir el payload con Prompt + Todas las imágenes
        content_parts = [prompt]
        for img_bytes in images_bytes:
            content_parts.append({'mime_type': 'image/jpeg', 'data': img_bytes})

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
    score2_val = None
    if 40 <= age <= 69: 
        base_risk = 1.0
        if antecedents.get("smoking"): base_risk *= 2.0
        if antecedents.get("diabetes"): base_risk *= 1.5
        if antecedents.get("hta"): base_risk *= 1.3
        
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
    Paso 1: Analiza MÚLTIPLES imágenes y devuelve los datos PROPUESTOS.
    """
    logger.info(f"📤 Recibida solicitud de análisis. Paciente: {patient_id}, Archivos: {len(files)}")
    
    summary_data = get_patient_db(db, patient_id)
    if not summary_data:
        logger.warning(f"❌ Paciente {patient_id} no encontrado durante extracción.")
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    summary = PatientSummary(**summary_data)

    # Leer todas las imágenes
    images_content = []
    for file in files:
        content = await file.read()
        images_content.append(content)

    # Analizar con IA (Multi-imagen)
    raw_data = analyze_images_with_gemini(images_content)
    
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
    
    return ExtractedData(
        event=temp_event,
        medications=raw_data["medications"] or [],
        antecedents=raw_data["antecedents"] or {},
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

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
