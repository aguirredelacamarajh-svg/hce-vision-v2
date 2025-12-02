from sqlalchemy import create_engine, Column, String, Text, Integer
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import json
import os

# --- Configuración de la Base de Datos ---
# En local usa SQLite. En la nube usará PostgreSQL (se lee de la variable de entorno)
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./hce_vision.db")

# Ajuste para Heroku/Render que a veces usan postgres:// en lugar de postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(
    DATABASE_URL, 
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# --- Modelo de Base de Datos ---
class PatientDB(Base):
    __tablename__ = "patients"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, index=True)
    data = Column(Text) # Guardamos el JSON completo del PatientSummary aquí

# --- Funciones Helper ---
def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Funciones de Acceso a Datos (CRUD) ---
# Ahora aceptan una sesión de DB como argumento

def save_patient_db(db, patient_summary):
    # Serializar a JSON
    patient_json = patient_summary.json()
    
    # Buscar si existe
    db_patient = db.query(PatientDB).filter(PatientDB.id == patient_summary.patient_id).first()
    
    if db_patient:
        db_patient.name = patient_summary.demographics.name
        db_patient.data = patient_json
    else:
        db_patient = PatientDB(
            id=patient_summary.patient_id,
            name=patient_summary.demographics.name,
            data=patient_json
        )
        db.add(db_patient)
    
    db.commit()
    db.refresh(db_patient)
    return db_patient

def get_patient_db(db, patient_id: str):
    db_patient = db.query(PatientDB).filter(PatientDB.id == patient_id).first()
    if db_patient:
        # Deserializar JSON a Diccionario (Pydantic lo convertirá a Objeto luego)
        return json.loads(db_patient.data)
    return None

def get_all_patients_db(db):
    patients = db.query(PatientDB).all()
    result = {}
    for p in patients:
        result[p.id] = json.loads(p.data)
    return result

def delete_patient_db(db, patient_id: str):
    db_patient = db.query(PatientDB).filter(PatientDB.id == patient_id).first()
    if db_patient:
        db.delete(db_patient)
        db.commit()
        return True
    return False
