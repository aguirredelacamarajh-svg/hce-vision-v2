# HCE Vision

Bienvenido al repositorio de diseño y arquitectura de **HCE Vision**.

## Documentación
El diseño completo del sistema se encuentra en:
- [Documento de Diseño y Arquitectura (HCE_Vision_Design_Document.md)](./HCE_Vision_Design_Document.md)

## Estructura del Proyecto (Propuesta)

```
hce_vision/
├── docs/                  # Documentación técnica y de producto
├── mobile_app/            # Código fuente Flutter (iOS/Android)
│   ├── lib/
│   │   ├── core/          # Utilidades, configuración, tema
│   │   ├── features/      # Módulos: auth, timeline, scanner, dashboard
│   │   └── main.dart
├── backend_api/           # API Python (FastAPI)
│   ├── app/
│   │   ├── api/           # Endpoints
│   │   ├── core/          # Configuración, seguridad
│   │   ├── models/        # Modelos de DB (SQLAlchemy/Pydantic)
│   │   ├── services/      # Lógica de negocio (OCR, Scores, LLM)
│   │   └── main.py
├── ai_engine/             # Notebooks y scripts de entrenamiento/evaluación de prompts
└── infrastructure/        # Terraform/Docker para despliegue
```

## Próximos Pasos
1.  Revisar el documento de diseño.
2.  Inicializar el proyecto Flutter en `mobile_app`.
3.  Configurar el entorno virtual de Python en `backend_api`.
