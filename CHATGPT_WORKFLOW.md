# Workflow de Colaboración: ChatGPT + Gemini

## Estado del Proyecto
- **Repositorio:** https://github.com/aguirredelacamarajh-svg/hce-vision-v2
- **Backend en la Nube:** https://hce-vision-api.onrender.com
- **Base de Datos:** PostgreSQL en Render

## División de Trabajo

### Gemini (Backend/Infrastructure)
**Rama:** `gemini/backend`
**Responsabilidades:**
- Backend API (FastAPI)
- Base de Datos (PostgreSQL + SQLAlchemy)
- Lógica de IA (Integración con Gemini)
- Despliegue en la nube (Render)
- Cálculo de scores médicos

**Archivos principales:**
- `backend_api/main.py`
- `backend_api/database.py`
- `backend_api/models.py`
- `backend_api/Dockerfile`

### ChatGPT (Frontend/UI)
**Rama:** `chatgpt/ui`
**Responsabilidades:**
- Aplicación móvil Flutter
- Diseño de UI/UX
- Nuevas pantallas
- Mejoras de experiencia de usuario
- Documentación

**Archivos principales:**
- `mobile_app/lib/screens/*`
- `mobile_app/lib/widgets/*`
- `mobile_app/lib/models/*` (solo modelos de UI)

## Protocolo de Trabajo

### Para ChatGPT:

#### 1. Inicio de Tarea
```bash
# El usuario ejecutará:
cd /Users/jorgeaguirredelac/.gemini/antigravity/scratch/hce_vision_v2_dev
git checkout chatgpt/ui
git pull origin chatgpt/ui
```

#### 2. Durante el Desarrollo
- Trabaja SOLO en archivos dentro de `mobile_app/`
- NO toques archivos de `backend_api/`
- Pídele al usuario que ejecute los cambios de código que propongas

#### 3. Al Terminar una Funcionalidad
```bash
# El usuario ejecutará:
git add mobile_app/
git commit -m "feat: [descripción de la funcionalidad]"
git push origin chatgpt/ui
```

#### 4. Pull Request
Cuando termines una tarea completa, pídele al usuario que cree un Pull Request en GitHub desde `chatgpt/ui` hacia `main`.

### Para Gemini:

#### 1. Inicio de Tarea
```bash
git checkout gemini/backend
git pull origin gemini/backend
```

#### 2. Durante el Desarrollo
- Trabajar SOLO en archivos dentro de `backend_api/`
- NO tocar archivos de `mobile_app/` (excepto `models/` si hay cambios en la API)

#### 3. Al Terminar una Funcionalidad
```bash
git add backend_api/
git commit -m "feat: [descripción]"
git push origin gemini/backend
```

#### 4. Desplegar a Producción
Si los cambios están listos para producción:
```bash
git checkout main
git merge gemini/backend
git push origin main
```
(Render detectará el cambio y re-desplegará automáticamente)

## Reglas de Oro

1. ✅ **SÍ:** Cada uno trabaja en su rama
2. ✅ **SÍ:** Commits frecuentes con mensajes descriptivos
3. ✅ **SÍ:** Pull Requests para fusionar a `main`
4. ❌ **NO:** Trabajar directamente en `main`
5. ❌ **NO:** Tocar archivos de la otra IA sin coordinación
6. ❌ **NO:** Fusionar ramas sin revisión

## Comunicación entre IAs

Si ChatGPT necesita un cambio en el backend:
1. ChatGPT crea un issue en GitHub describiendo el requerimiento
2. El usuario le pide a Gemini que lo implemente

Si Gemini cambia la estructura de la API:
1. Gemini actualiza el README con los cambios
2. El usuario le pide a ChatGPT que actualice el frontend

## Tareas Actuales

### Gemini (En Progreso)
- [x] Migrar a PostgreSQL
- [x] Desplegar en Render
- [ ] Corregir modelo de IA (gemini-1.5-flash-latest)
- [ ] Optimizar cálculo de scores
- [ ] Implementar autenticación JWT

### ChatGPT (Pendiente)
- [ ] Rediseñar pantalla de Login
- [ ] Mejorar pantalla de Patient Detail
- [ ] Agregar animaciones de carga
- [ ] Implementar modo offline
- [ ] Mejorar manejo de errores

## Estado del Despliegue
- **Última versión en Producción:** Commit `9e983ed`
- **Estado:** En despliegue (esperando que Render termine)
- **URL de Pruebas:** https://hce-vision-api.onrender.com

---

**Última actualización:** 2025-12-02 16:05
