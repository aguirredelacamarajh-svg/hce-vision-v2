# HCE Vision - Especificación de Diseño UX/UI (v2)

## 1. Flujo General de Navegación
1.  **Splash Screen:** Logo + "Tu historia cardiológica en una sola vista". Auto-navegación a Home.
2.  **Home:** Selección de Modo (Paciente vs Médico). Botón Configuración.
3.  **Modo Paciente:**
    *   **Landing:** Vista Cardiológica Resumida (Prioridad Alta).
    *   **Navegación:** Timeline completa, Laboratorios, Estudios.
4.  **Modo Médico:**
    *   **Dashboard:** Datos demográficos, Riesgos, Scores, Tendencias, Timeline detallada.

## 2. MODO PACIENTE - Pantalla Cardiológica (Home)
Orden vertical estricto:
1.  **Header:** Nombre, Edad, Sexo, Foto.
2.  **Factores de Riesgo:** Chips/Badges (HTA, Diabetes, Tabaquismo, etc.).
3.  **Scores de Riesgo:** Tarjetas con valor y color de riesgo (SCORE2, CHA2DS2-VASc).
4.  **Colesterol (LDL):** Valor actual vs Objetivo. Recomendación breve.
5.  **Glucemia:** Valor reciente + Mini-gráfico (sparkline).
6.  **Tensión Arterial (Auto-registro):**
    *   Botón "Añadir registro" (Sistólica/Diastólica/FC).
    *   Gráfico de tendencia diario.
7.  **Timeline Resumida:** Últimos eventos clave.
8.  **Acceso Avanzado:** Botón "Ver mis datos en detalle" (Laboratorios y Estudios).

## 3. Pantalla "Visualización de Datos" (Paciente)
*   **Módulo Laboratorio:** Selector (Dropdown/Chips) para ver gráficos individuales (LDL, Creatinina, etc.). No mostrar todos a la vez.
*   **Módulo Estudios:** Lista de informes (Eco, Holter). Al clic, mostrar resumen estructurado (LVEF, HVI).

## 4. MODO MÉDICO - Dashboard
*   Vista densa con toda la información visible.
*   Todos los Scores (incl. SCA: GRACE, TIMI).
*   Panel de tendencias clave (múltiples sparklines).
*   Timeline detallada.
*   Acciones: Editar antecedentes, añadir notas.

## 5. Estilo
*   Limpio, médico, "Clinical & Premium".
*   Jerarquía visual clara.
*   Uso de colores semánticos para riesgo (Verde/Amarillo/Rojo).

---
**Instrucción para ChatGPT:**
Implementa esta nueva estructura de navegación y pantallas.
1.  Crea la **Splash Screen** y la **Home** con selección de modo.
2.  Refactoriza `PatientDetailPage` para que sea el **Dashboard Médico**.
3.  Crea una nueva vista `PatientView` para el **Modo Paciente** siguiendo el orden estricto de la sección 2.
4.  Implementa el **Auto-registro de TA** (UI por ahora, mockeado).
