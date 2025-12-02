export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-white text-slate-900">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-600 text-white shadow-lg shadow-sky-200">
            <span className="text-lg font-semibold">HCE</span>
          </div>
          <div>
            <p className="text-xl font-semibold tracking-tight text-slate-900">HCE Vision</p>
            <p className="text-sm text-slate-500">Historias clínicas con IA</p>
          </div>
        </div>
        <div className="hidden items-center gap-4 text-sm font-medium text-slate-700 sm:flex">
          <a className="hover:text-sky-700" href="#features">
            Características
          </a>
          <a className="hover:text-sky-700" href="#workflow">
            Flujo
          </a>
          <a className="hover:text-sky-700" href="#cta">
            Comenzar
          </a>
          <button className="rounded-xl bg-sky-600 px-4 py-2 text-white shadow-md shadow-sky-200 transition hover:bg-sky-700">
            Iniciar sesión
          </button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 pb-24 pt-6">
        <section className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
          <div className="flex flex-col gap-6">
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-700 shadow-sm shadow-sky-100 ring-1 ring-sky-100">
              IA médica · Seguro · En minutos
            </span>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-5xl">
              El futuro de la historia clínica, con IA que entiende medicina.
            </h1>
            <p className="max-w-xl text-lg text-slate-600">
              HCE Vision extrae datos de documentos, evolutivos y laboratorios, construye un resumen
              clínico claro y alerta riesgos en tiempo real. Pensado para médicos y pacientes, sin fricción.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <a
                href="#cta"
                className="rounded-xl bg-sky-600 px-5 py-3 text-base font-semibold text-white shadow-lg shadow-sky-200 transition hover:-translate-y-0.5 hover:bg-sky-700"
              >
                Probar HCE Vision
              </a>
              <a
                href="#features"
                className="rounded-xl px-5 py-3 text-base font-semibold text-sky-700 ring-1 ring-sky-100 transition hover:bg-sky-50"
              >
                Ver capacidades
              </a>
            </div>
            <div className="grid grid-cols-2 gap-4 rounded-2xl bg-white/70 p-4 shadow-md shadow-sky-50 ring-1 ring-slate-100 sm:grid-cols-3">
              {[
                { label: "Pacientes gestionados", value: "12.4k" },
                { label: "Alertas preventivas", value: "8.1k" },
                { label: "Precisión OCR médica", value: "98%" },
              ].map((item) => (
                <div key={item.label} className="rounded-xl bg-slate-50/80 p-3 text-sm">
                  <p className="text-xs uppercase text-slate-500">{item.label}</p>
                  <p className="text-xl font-semibold text-slate-900">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 -z-10 animate-pulse rounded-3xl bg-gradient-to-br from-sky-100 via-white to-emerald-50 blur-3xl" />
            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl shadow-sky-100 ring-1 ring-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-500">Resumen clínico AI</p>
                  <p className="text-xl font-semibold text-slate-900">Dra. Martínez · Guardia</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
                  Estable
                </span>
              </div>
              <div className="mt-4 space-y-3">
                {[
                  { title: "Hallazgos clave", desc: "Asma controlado. TA estable. HbA1c en objetivo." },
                  { title: "Alertas", desc: "Alergia a penicilina registrada. Evitar betalactámicos." },
                  { title: "Próximos pasos", desc: "Repetir espirometría en 3 meses. Control metabólico." },
                ].map((card) => (
                  <div
                    key={card.title}
                    className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 shadow-sm"
                  >
                    <p className="text-sm font-semibold text-slate-800">{card.title}</p>
                    <p className="text-sm text-slate-600">{card.desc}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3">
                {[
                  { label: "Riesgo cardiometabólico", value: "Bajo" },
                  { label: "Adherencia farmacológica", value: "Óptima" },
                  { label: "Último control", value: "Hace 12 días" },
                  { label: "Documentos digitalizados", value: "47" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl bg-white px-3 py-3 text-xs font-semibold text-slate-700 ring-1 ring-slate-100"
                  >
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">{item.label}</p>
                    <p className="text-base text-slate-900">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="space-y-6">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold uppercase tracking-wide text-sky-700">Capacidades</p>
            <h2 className="text-3xl font-semibold text-slate-900">Pensado para clínica real.</h2>
            <p className="max-w-3xl text-lg text-slate-600">
              OCR médico avanzado, resúmenes accionables y paneles que ahorran tiempo de guardia.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                title: "OCR + Estructuración",
                desc: "Escanea notas, labs, epicrisis y las convierte en datos clínicos normalizados.",
              },
              {
                title: "Alertas y riesgos",
                desc: "Detección temprana de alergias, interacciones y señales de descompensación.",
              },
              {
                title: "Trabajo colaborativo",
                desc: "Comparte resúmenes entre equipos, manteniendo trazabilidad y control de acceso.",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="h-full rounded-2xl border border-slate-100 bg-white p-5 shadow-sm shadow-sky-50"
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700 ring-1 ring-sky-100">
                  <span className="text-base font-semibold">◎</span>
                </div>
                <p className="text-lg font-semibold text-slate-900">{feature.title}</p>
                <p className="mt-2 text-slate-600">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="workflow" className="space-y-6">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold uppercase tracking-wide text-sky-700">Cómo funciona</p>
            <h2 className="text-3xl font-semibold text-slate-900">De documento a plan de acción.</h2>
            <p className="max-w-3xl text-lg text-slate-600">
              Integra FastAPI existente: sube un paciente, obtiene su resumen y visualiza su evolución.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                step: "1",
                title: "Captura",
                desc: "Sube documentos o arrástralos. OCR médico extrae entidades, labs y evolución.",
              },
              {
                step: "2",
                title: "Analiza",
                desc: "IA de salud resume, detecta riesgos y propone próximos pasos.",
              },
              {
                step: "3",
                title: "Acciona",
                desc: "Visualiza el dashboard, comparte con el equipo y registra nuevos eventos.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm shadow-sky-50"
              >
                <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-sky-600 text-sm font-semibold text-white">
                  {item.step}
                </div>
                <p className="text-lg font-semibold text-slate-900">{item.title}</p>
                <p className="mt-1 text-slate-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section
          id="cta"
          className="overflow-hidden rounded-3xl bg-gradient-to-br from-sky-600 via-sky-700 to-emerald-500 p-[1px] shadow-xl shadow-sky-200"
        >
          <div className="flex flex-col gap-6 rounded-3xl bg-white/95 px-8 py-10 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-wide text-sky-700">
                Listo para probar
              </p>
              <h3 className="text-2xl font-semibold text-slate-900">
                Lleva tus historias clínicas a producción en días, no meses.
              </h3>
              <p className="max-w-2xl text-slate-600">
                Login web, dashboard de pacientes y API FastAPI ya lista para conectar con tu equipo.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <a
                href="#"
                className="rounded-xl bg-sky-600 px-5 py-3 text-base font-semibold text-white shadow-lg shadow-sky-200 transition hover:-translate-y-0.5 hover:bg-sky-700"
              >
                Solicitar acceso
              </a>
              <a
                href="#features"
                className="rounded-xl px-5 py-3 text-base font-semibold text-sky-700 ring-1 ring-sky-100 transition hover:bg-sky-50"
              >
                Ver cómo funciona
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
