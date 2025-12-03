from typing import List, Dict, Optional, Any
from pydantic import BaseModel

class ScoreDetail(BaseModel):
    value: float
    risk: str

class Medication(BaseModel):
    name: str
    dose: Optional[str] = None
    schedule: Optional[str] = None
    route: Optional[str] = None

class ClinicalEvent(BaseModel):
    id: str
    date: str
    type: str
    title: str
    description: str
    source: str = "IA"
    labs: Optional[Dict[str, Any]] = None
    diagnostics: Optional[List[str]] = None

class GlobalEvent(BaseModel):
    """Eventos para la historia clínica global (no cardiológica)."""
    date: str
    category: str # cirugia, trauma, infeccion, oncologia, otro
    description: str

class LabResult(BaseModel):
    date: str
    value: float
    unit: str

class LabTrend(BaseModel):
    name: str # ej: "LDL", "Creatinina", "BNP"
    history: List[LabResult]

class LipidManagement(BaseModel):
    ldl_current: Optional[float] = None
    risk_category: str # "Bajo", "Moderado", "Alto", "Muy Alto", "Extremo"
    ldl_target: float
    reduction_needed_pct: float
    recommendation: str # ej: "Iniciar Atorvastatina 40-80mg"

class RiskScores(BaseModel):
    chads2vasc: Optional[float] = None
    has_bled: Optional[float] = None
    score2: Optional[float] = None # Riesgo a 10 años
    grace: Optional[float] = None # Para SCA
    crusade: Optional[float] = None # Riesgo sangrado en SCA
    details: Optional[Dict[str, ScoreDetail]] = None
    lipid_management: Optional[LipidManagement] = None

class Demographics(BaseModel):
    name: str
    age: int
    sex: str

class PatientSummary(BaseModel):
    patient_id: str
    demographics: Demographics
    timeline: List[ClinicalEvent]
    medications: List[Medication]
    risk_scores: RiskScores
    lab_trends: Dict[str, List[LabResult]] = {} # Mapa: "LDL" -> [Resultados]
    risk_factors: List[str] = [] # "Tabaquismo", "Sedentarismo", "Obesidad"
    antecedents: Dict[str, bool] = {} # Nuevo campo para guardar el estado completo
    global_timeline: List[GlobalEvent] = [] # NUEVO: Historia Global
    clinical_summary: str
    alerts: List[str]

class ClinicalEventResponse(BaseModel):
    date: str
    type: str
    title: str
    description: str
    labs: Dict[str, Optional[str]]
    diagnostics: List[str]
    medications: List[str]

class HistoricalLab(BaseModel):
    date: str
    labs: Dict[str, Any]

class ExtractedData(BaseModel):
    event: ClinicalEvent
    medications: List[str]
    antecedents: Dict[str, bool]
    risk_scores: RiskScores
    historical_data: List[HistoricalLab] = [] 
    global_timeline_events: List[GlobalEvent] = [] # NUEVO

class SubmitAnalysisRequest(BaseModel):
    patient_id: str
    event: ClinicalEvent
    medications: List[str]
    antecedents: Dict[str, bool]
    historical_data: List[HistoricalLab] = []
    global_timeline_events: List[GlobalEvent] = [] # NUEVO

class CreatePatientRequest(BaseModel):
    name: str
    age: int
    sex: str
