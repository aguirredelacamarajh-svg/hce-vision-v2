# HCE Vision: Documento de Diseño y Arquitectura Técnica

**Versión:** 1.0  
**Fecha:** 30 de Noviembre, 2025  
**Estado:** Propuesta de Diseño para Producción  
**Enfoque:** Cardiología e Historia Clínica Electrónica (HCE) Automatizada

---

## 1. Descripción del Producto

**HCE Vision** es una aplicación móvil de salud digital diseñada para reconstruir, organizar y analizar la historia clínica de un paciente a partir de fuentes no estructuradas (fotografías de documentos físicos). Utilizando Inteligencia Artificial Multimodal, la aplicación transforma papeles dispersos en una línea de tiempo clínica estructurada, con un fuerte enfoque en la prevención y seguimiento cardiovascular.

### Propuesta de Valor
*   **Digitalización sin esfuerzo:** El usuario solo toma fotos; la IA hace el resto.
*   **Ordenamiento Inteligente:** Reconstrucción cronológica automática de eventos pasados.
*   **Inteligencia Cardiológica:** Cálculo automático de scores de riesgo y detección de alertas.
*   **Interoperabilidad Semántica:** Estandarización de términos médicos para análisis real.

---

## 2. User Journeys

### 2.1. Journey del Paciente (Usuario Final)
1.  **Onboarding:** Registro simple (Email/Biometría). Ingreso de datos básicos (Edad, Sexo, Antecedentes conocidos).
2.  **Captura:** El paciente selecciona "Nuevo Documento". Se abre la cámara con detección de bordes. Toma fotos de un estudio antiguo (ej. Ecocardiograma de 2021).
3.  **Procesamiento:** La app muestra "Analizando..." y notifica cuando está listo (asíncrono).
4.  **Validación:** El paciente ve el documento procesado: "Ecocardiograma - 14/05/2021". Puede confirmar o editar la fecha si la IA tiene dudas.
5.  **Visualización:** El estudio se inserta automáticamente en su **Línea de Tiempo**.
6.  **Dashboard:** Ve sus gráficos de colesterol actualizados y su riesgo cardiovascular calculado.

### 2.2. Journey del Médico (Usuario Profesional)
1.  **Acceso:** Login seguro con credenciales profesionales.
2.  **Búsqueda:** Busca al paciente por DNI o escanea un QR del paciente.
3.  **Revisión Rápida:** Accede al **Dashboard Médico**. Ve de un vistazo: "Paciente de alto riesgo, Fibrilación Auricular, Anticoagulado".
4.  **Navegación Temporal:** Scrollea la línea de tiempo para ver la internación del año pasado. Toca el evento para ver la foto original del informe de alta.
5.  **Toma de Decisión:** Observa la tendencia de la Creatinina antes de recetar un nuevo fármaco.
6.  **Exportación:** Genera un PDF resumen para adjuntar a la historia clínica institucional.

---

## 3. Arquitectura Técnica

### 3.1. Stack Tecnológico Recomendado

*   **Frontend (Mobile):** **Flutter** (Dart).
    *   *Por qué:* Rendimiento nativo en iOS/Android, excelente manejo de cámara y gráficos, UI consistente.
*   **Backend (API):** **Python** con **FastAPI**.
    *   *Por qué:* Velocidad, tipado estático, ecosistema nativo de IA/Data Science.
*   **Base de Datos:**
    *   **Relacional (PostgreSQL):** Para usuarios, estructura de HCE, medicaciones, valores normalizados.
    *   **Documental (MongoDB o JSONB en Postgres):** Para almacenar el resultado crudo del OCR y estructuras flexibles de diferentes tipos de estudios.
    *   **Storage (AWS S3 / Google Cloud Storage):** Almacenamiento seguro de las imágenes encriptadas.
*   **Inteligencia Artificial (El Núcleo):**
    *   **OCR/Multimodal:** Google Cloud Vision API o AWS Textract (para extracción de texto base) + **LLM (GPT-4o o Gemini 1.5 Pro)** para interpretación semántica y estructuración JSON.
    *   **NLP Médico:** Named Entity Recognition (NER) para detectar dosis, fármacos y diagnósticos.

### 3.2. Diagrama de Arquitectura de Datos (Pipeline)

```mermaid
graph TD
    A[App Mobile] -->|Sube Foto| B(API Gateway / Load Balancer)
    B -->|Encola Tarea| C{Cola de Mensajes (Redis/RabbitMQ)}
    C -->|Procesa| D[Worker de IA]
    
    subgraph "Motor de IA"
    D -->|1. OCR & Layout| E[Extractor de Texto]
    E -->|Texto Crudo| F[LLM Médico]
    F -->|Prompt: Estructurar & Clasificar| G[JSON Estructurado]
    end
    
    G -->|Datos| H[Normalizador (CIE-10, SNOMED)]
    H -->|Guarda| I[(Base de Datos)]
    I -->|Actualiza| J[Motor de Scores]
    J -->|Notifica| A
```

---

## 4. Pantallas Detalladas y Componentes

### 4.1. Pantalla de Inicio (Timeline)
*   **Header:** Saludo, Foto de perfil, Alerta de "Próxima medicación".
*   **Componente Central: Línea de Tiempo Vertical.**
    *   *Nodo:* Círculo con icono según tipo (Píldora, Corazón, Documento, Hospital).
    *   *Tarjeta:* Fecha a la izquierda, Título a la derecha (ej. "Consulta Cardiología"), Subtítulo (ej. "Dr. Pérez - H. Italiano").
    *   *Estado:* Indicador de color (Verde: Normal, Rojo: Alerta/Fuera de rango).
*   **FAB (Floating Action Button):** Botón grande "+" para escanear.

### 4.2. Detalle de Documento
*   **Pestañas:** "Resumen" | "Original".
*   **Resumen:** Lista de datos clave extraídos (Diagnósticos, Medicación recetada, Valores de Lab).
*   **Original:** Visor de imagen con zoom y pan. Overlay opcional resaltando dónde se encontró el dato.

### 4.3. Dashboard Cardiológico
*   **Tarjetas de Scores:**
    *   CHA₂DS₂-VASc: [ 3 | Alto Riesgo ] (Gráfico de velocímetro).
    *   HAS-BLED: [ 1 | Bajo Riesgo ].
*   **Gráficos de Tendencia:**
    *   Presión Arterial (Sistólica/Diastólica) en el tiempo.
    *   LDL Colesterol (con línea de meta terapéutica).
*   **Medicación Actual:** Lista compacta con dosis y frecuencia.

---

## 5. Flujos Funcionales

### Flujo de "Ingesta Inteligente"
1.  **Upload:** Usuario sube foto de un laboratorio.
2.  **Pre-procesamiento:** Backend mejora contraste y endereza la imagen.
3.  **Clasificación:** El modelo determina: `Tipo: Laboratorio`.
4.  **Extracción:**
    *   Detecta fecha: "12/05/2023".
    *   Detecta tabla de valores.
    *   Itera filas: "Glucemia" -> 98 mg/dL.
5.  **Normalización:**
    *   "Glucemia" -> `LOINC 2345-7`.
    *   98 -> `Value: 98`, `Unit: mg/dL`.
6.  **Evaluación:** Compara con rangos de referencia. Marca `flag: normal`.
7.  **Persistencia:** Guarda en DB vinculado al paciente.
8.  **Feedback:** Usuario recibe notificación "Laboratorio procesado exitosamente".

---

## 6. Lógica de Scores Clínicos

El sistema recalculará estos scores cada vez que se ingrese nueva información relevante (edad, nuevos diagnósticos, nuevos valores).

### 6.1. CHA₂DS₂-VASc (Riesgo de ACV en FA)
*   **Inputs:**
    *   Insuficiencia Cardíaca (Detectado en antecedentes o Eco con FEy < 40%): +1
    *   Hipertensión (Antecedente o medicación antihipertensiva): +1
    *   Edad >= 75: +2
    *   Diabetes: +1
    *   ACV/AIT previo: +2
    *   Enfermedad Vascular (IAM, EAP): +1
    *   Edad 65-74: +1
    *   Sexo Femenino: +1
*   **Output:** Sumatoria total.
*   **Interpretación:** 0 (Bajo), 1 (Moderado), >=2 (Alto -> Indicar Anticoagulación).

### 6.2. Riesgo Cardiovascular (SCORE2 / ASCVD)
*   **Inputs:** Edad, Sexo, Tabaquismo (Sí/No), Presión Sistólica (último valor), Colesterol Total, HDL, LDL.
*   **Lógica:** Aplicar algoritmo de ecuaciones de cohorte (Pooled Cohort Equations).
*   **Output:** % de riesgo a 10 años de evento mayor.

---

## 7. Estructura del Informe Reconstruido (JSON Schema)

```json
{
  "patient_id": "uuid",
  "last_updated": "2025-11-30T10:00:00Z",
  "clinical_summary": {
    "allergies": ["Penicilina"],
    "chronic_conditions": [
      {"code": "I10", "name": "Hipertensión esencial", "since": "2018"}
    ],
    "active_medications": [
      {"drug": "Atorvastatina", "dose": "20mg", "freq": "24h", "start_date": "2020-01-01"}
    ]
  },
  "timeline": [
    {
      "date": "2024-03-15",
      "type": "LABORATORY",
      "title": "Laboratorio de Rutina",
      "institution": "Laboratorio Central",
      "data": {
        "cholesterol_total": 190,
        "hdl": 45,
        "ldl": 110
      },
      "original_file_url": "s3://..."
    },
    {
      "date": "2023-11-10",
      "type": "IMAGING",
      "title": "Ecocardiograma Doppler",
      "findings": "Función sistólica conservada. HVI leve.",
      "lvef": 60
    }
  ]
}
```

---

## 8. Propuesta de Diseño (UI/UX)

*   **Paleta de Colores:**
    *   Primario: `Deep Blue (#0A2463)` - Transmite confianza y profesionalismo médico.
    *   Secundario: `Teal (#3E92CC)` - Para acciones principales y acentos.
    *   Alerta: `Coral Red (#FF6B6B)` - Para valores fuera de rango o riesgos altos.
    *   Fondo: `Off-White (#F9FAFB)` - Para reducir fatiga visual.
*   **Tipografía:** **Inter** o **Roboto**. Limpia, sans-serif, excelente legibilidad en tamaños pequeños.
*   **Estilo:** "Clean Medical". Tarjetas con sombras suaves (elevation), bordes redondeados (8px). Mucho espacio en blanco (whitespace) para no abrumar con datos.

---

## 9. Roadmap de Desarrollo

### Fase 1: MVP (Mes 1-2)
*   Autenticación de usuarios.
*   Cámara y subida de imágenes.
*   OCR básico + LLM para extraer Fecha, Tipo de Documento y Resumen de texto libre.
*   Visualización en Timeline simple.

### Fase 2: Cardiología Profunda (Mes 3-4)
*   Extracción estructurada de tablas de laboratorio.
*   Detección específica de parámetros cardíacos (FEy, diámetros, espesores).
*   Implementación del motor de Scores (CHA2DS2-VASc, etc.).
*   Gráficos de evolución.

### Fase 3: Ecosistema y Beta (Mes 5-6)
*   Exportación a PDF profesional.
*   Módulo de médicos (Dashboard de profesional).
*   Integración con wearables (Apple Health / Google Fit) para traer frecuencia cardíaca.

---

## 10. Ideas para Escalabilidad Futura
*   **Chat con tu Historia:** Un chatbot RAG (Retrieval-Augmented Generation) donde el paciente pregunte "¿Cuándo fue mi último electro?" y la app responda con el dato exacto.
*   **Alertas Preventivas:** "Hace 1 año no te haces un control de lípidos, te sugerimos agendar uno".
*   **Interconsulta:** Compartir un link temporal seguro con otro médico para segunda opinión.
