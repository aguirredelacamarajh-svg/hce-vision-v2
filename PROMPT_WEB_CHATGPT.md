# Prompt para ChatGPT - Rol: Lead Web Developer

Hola ChatGPT. Vamos a expandir el proyecto **HCE Vision V2** creando una **Web App profesional**.

## Contexto
- **Proyecto:** HCE Vision (Historia Clínica Electrónica con IA)
- **Backend:** FastAPI (ya existente y desplegado en Render)
- **Móvil:** Flutter (ya existente)
- **NUEVO OBJETIVO:** Crear la versión Web para médicos y pacientes.

## Tu Misión
Eres el **Lead Web Developer**. Debes crear una aplicación web moderna, responsive y profesional.

## Stack Tecnológico Recomendado
- **Framework:** Next.js 14 (App Router)
- **Lenguaje:** TypeScript
- **Estilos:** Tailwind CSS
- **Componentes:** Shadcn/UI (altamente recomendado por estética médica limpia)
- **Iconos:** Lucide React

## Instrucciones de Trabajo

### 1. Ubicación
Todo tu código debe ir en la carpeta:
```
/Users/jorgeaguirredelac/.gemini/antigravity/scratch/hce_vision_v2_dev/web_app
```

### 2. Rama de Git
Trabaja SIEMPRE en la rama: `chatgpt/web`
```bash
git checkout chatgpt/web
```

### 3. Primeros Pasos (Setup)
Como el usuario tuvo problemas ejecutando `npx` directamente, por favor:
1. Verifica si tiene Node.js instalado (`node -v`). Si no, guíalo brevemente.
2. Dale el comando exacto para inicializar el proyecto Next.js dentro de `web_app`.
   - Sugerencia: `npx create-next-app@latest web_app --typescript --tailwind --eslint`

### 4. Funcionalidades a Implementar (Fase 1)
1. **Landing Page:** Presentación del producto.
2. **Login:** Conectar con la misma API que la App móvil.
3. **Dashboard:** Ver lista de pacientes (consumiendo el endpoint `/patients`).

## Conexión con Backend
El backend ya está listo en:
`https://hce-vision-api.onrender.com`

Debes crear un servicio o cliente API en la web para consumir estos endpoints:
- `GET /patients`
- `POST /patients`
- `GET /patients/{id}/summary`

## Tu Primer Entregable (✅ COMPLETADO)
1. Ayuda al usuario a instalar/verificar Node.js.
2. Inicializa el proyecto Next.js.
3. Crea una Landing Page básica pero hermosa ("HCE Vision - El futuro de la historia clínica").

## FASE 2: Integración con Backend (🎯 OBJETIVO ACTUAL)

Ahora que la Landing Page está lista, necesitamos funcionalidad real.

### Tarea 1: Autenticación (Login)
**Archivo:** `app/login/page.tsx`
- Crea un formulario de login hermoso.
- **Importante:** Por ahora, el backend no tiene autenticación JWT compleja. El login es "simulado" o directo.
- **Lógica:**
  - Pide `username` y `role` (Médico/Paciente).
  - Al dar click en "Ingresar", guarda el usuario en `localStorage` o Context.
  - Redirige a `/dashboard`.

### Tarea 2: Dashboard de Pacientes
**Archivo:** `app/dashboard/page.tsx`
- **Endpoint:** `GET https://hce-vision-api.onrender.com/patients`
- **Requisitos:**
  - Crea un servicio `lib/api.ts` para manejar las llamadas con `fetch`.
  - En el Dashboard, muestra la lista de pacientes en una tabla elegante (usa Shadcn UI o Tailwind puro).
  - Columnas: Nombre, Edad, Sexo, ID.
  - Agrega un botón "Nuevo Paciente" que abra un Modal (o lleve a otra página) para crear uno (`POST /patients`).

### Tarea 3: Detalle de Paciente
- Al hacer clic en un paciente, lleva a `/dashboard/patient/[id]`.
- **Endpoint:** `GET https://hce-vision-api.onrender.com/patients/{id}/summary`
- Muestra:
  - Datos demográficos.
  - Timeline de eventos.
  - Gráficos de riesgo (si puedes usar `recharts` o similar).

---
**Instrucción para ChatGPT:**
"Hola, ya terminé la Fase 2 (Dashboard y Detalles). El código corregido está en la rama `chatgpt/web`. Por favor, procede con la **Fase 3: Escaneo de Documentos con IA**."

## FASE 3: Escaneo de Documentos con IA (🚀 NUEVO)

Ahora vamos a conectar la funcionalidad principal: **La Inteligencia Artificial**.

### Tarea 1: Servicio de Extracción
**Archivo:** `lib/api.ts`
- Agrega la función `extractData(patientId: string, file: File)`.
- **Endpoint:** `POST https://hce-vision-api.onrender.com/extract_data`
- **Body:** `FormData` con campos `patient_id` y `file`.
- **Retorno:** JSON con `event`, `risk_scores`, `medications`, etc.

### Tarea 2: UI de Escaneo en Detalle de Paciente
**Archivo:** `app/dashboard/patient/[id]/page.tsx` (y nuevos componentes)
- Agrega un botón flotante o destacado: **"📷 Escanear Documento"**.
- Al hacer clic, abre un Modal que permita:
  1. Seleccionar una imagen (input type file).
  2. Mostrar preview de la imagen.
  3. Botón "Analizar con IA".

### Tarea 3: Visualización de Resultados
- Cuando la API responda (puede tardar 5-10 seg), muestra los resultados en el mismo Modal o en uno nuevo.
- Muestra:
  - **Título del documento** (detectado por IA).
  - **Valores extraídos** (ej: LDL, Glucosa).
  - **Riesgos calculados** (ej: "Alto Riesgo").
- (Opcional por ahora) Botón "Guardar en Historia Clínica" (que llamaría a `/submit_analysis`, pero primero logremos ver los datos).
