# HCE Vision V2

Sistema avanzado de Historia Clínica Electrónica con visión artificial e IA.

## Estructura del Proyecto

- `web_app/`: Frontend en Next.js
- `backend_api/`: Backend en FastAPI con integración a Gemini
- `mobile_app/`: Aplicación móvil en Flutter

## Despliegue

- **Web:** Vercel (Root Directory: `web_app`)
- **Backend:** Render (Docker)
- **Mobile:** APK generado localmente

## Estado Actual
- ✅ Análisis de imágenes con Gemini 1.5 Flash
- ✅ Gráficos de tendencias (LDL, Creatinina, BNP, Glucemia, Troponina)
- ✅ Extracción de tablas históricas completas
- ✅ Módulo de diagnóstico MDIE
