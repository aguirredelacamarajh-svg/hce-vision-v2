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
"Hola, el Backend ha sido actualizado a la versión 2.1 con soporte para **Multi-Imagen** e **Historia Clínica Global**. Por favor, procede con la **Fase 3: Escaneo Avanzado y Visualización Global**."

## FASE 3: Escaneo Multi-Imagen e Historia Global (ACTUALIZADO)

El backend ahora es capaz de procesar múltiples imágenes a la vez y extraer una historia clínica paralela (no cardiológica).

### Tarea 1: Actualizar Cliente API (`lib/api.ts`)
- Actualiza la función `extractData` para aceptar `files: File[]` (Array de archivos).
- **Endpoint:** `POST /extract_data` ahora espera `files` (multipart) como una lista.
- **Nuevos Tipos:** Actualiza las interfaces para incluir `GlobalEvent` y `global_timeline_events` en la respuesta.
  ```typescript
  interface GlobalEvent {
    date: string;
    category: string;
    description: string;
  }
  // Agregar a ExtractedData y PatientSummary
  ```

### Tarea 2: UI de Escaneo Mejorada
**Archivo:** `app/dashboard/patient/[id]/page.tsx` (Componente `ScannerModal`)
- Permite **seleccionar múltiples imágenes** a la vez (o agregar una por una).
- Muestra una lista/carrusel de las miniaturas seleccionadas antes de enviar.
- Botón "Analizar Documentos" (en plural).

### Tarea 3: Visualización de Resultados (Dual)
Cuando la API responda, muestra los resultados en dos pestañas o secciones claras:

1.  **❤️ Perfil Cardiológico:**
    - Lo que ya tenías: LDL, Riesgos (CHA2DS2-VASc), Medicación Cardio.
    - *Prioridad Alta.*

2.  **🌍 Historia Clínica Global (NUEVO):**
    - Renderiza una línea de tiempo simple con los eventos de `global_timeline_events`.
    - Ejemplo: "2018 - Cirugía: Apendicectomía", "2020 - Trauma: Fractura Tibia".
    - Esto permite al médico ver el contexto general del paciente más allá del corazón.

### Tarea 4: Confirmación
- Al guardar (`/submit_analysis`), asegúrate de enviar también los `global_timeline_events` confirmados para que se guarden en el perfil del paciente.

---

## FASE 4: REESTRUCTURACIÓN UI/UX (MODO PACIENTE Y MÉDICO)

Hemos definido una nueva especificación de diseño completa (`DESIGN_SPEC_V2.md`).

### Tarea 1: Navegación y Modos
- Implementa una **Splash Screen** simple.
- Crea una **Home** que permita elegir entre "Soy Paciente" y "Soy Médico".
- **Modo Médico:** Usa la vista actual `dashboard/patient/[id]` pero refínala para que sea un "Dashboard Pro" (más denso, todos los scores).
- **Modo Paciente:** Crea una NUEVA vista simplificada y educativa (ver especificación).

### Tarea 2: Vista Paciente (Cardio-Centric)
Implementa la pantalla principal del paciente con este orden:
1.  **Header:** Datos básicos.
2.  **Riesgos:** Badges de factores de riesgo.
3.  **Metas:** Tarjeta de LDL (Valor vs Meta) y Scores (con colores semánticos).
4.  **Registro TA:** Un componente para ver/agregar presión arterial (UI mockeada por ahora).
5.  **Accesos:** Botones grandes para "Ver mis laboratorios" (Gráficos) y "Mis Estudios".

### Tarea 3: Componentes de Visualización
- Usa `recharts` (que ya instalamos) para crear un **Explorador de Laboratorios**: un dropdown para elegir qué curva ver (LDL, Glucosa, etc.), en lugar de mostrar todas juntas.

**Referencia:** Lee el archivo `DESIGN_SPEC_V2.md` en la raíz para todos los detalles de diseño.
