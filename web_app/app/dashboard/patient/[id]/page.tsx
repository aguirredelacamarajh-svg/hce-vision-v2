import Link from "next/link";
import { fetchPatientSummary } from "../../../../lib/api";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function PatientDetailPage({ params }: PageProps) {
  const { id: patientId } = await params;

  let summary;
  try {
    summary = await fetchPatientSummary(patientId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo cargar el paciente.";
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-white text-slate-900">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-6 py-10">
          <Link href="/dashboard" className="text-sm font-semibold text-sky-700 hover:underline">
            ← Volver al dashboard
          </Link>
          <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-red-700">
            <p className="text-lg font-semibold">Error al cargar</p>
            <p className="text-sm">{message}</p>
          </div>
        </div>
      </div>
    );
  }

  const demographics = summary.demographics;
  const timeline = summary.timeline ?? [];
  const risk = summary.risk_scores;

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-white text-slate-900">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-600 text-white shadow-lg shadow-sky-200">
              <span className="text-lg font-semibold">HCE</span>
            </div>
            <div>
              <p className="text-xl font-semibold tracking-tight text-slate-900">
                Paciente · {demographics?.name ?? "Sin nombre"}
              </p>
              <p className="text-sm text-slate-500">ID: {patientId}</p>
            </div>
          </div>
          <Link
            href="/dashboard"
            className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50"
          >
            Volver al dashboard
          </Link>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm shadow-sky-50">
            <p className="text-sm uppercase tracking-wide text-slate-500">Edad</p>
            <p className="text-2xl font-semibold text-slate-900">{demographics?.age ?? "--"}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm shadow-sky-50">
            <p className="text-sm uppercase tracking-wide text-slate-500">Sexo</p>
            <p className="text-2xl font-semibold text-slate-900">{demographics?.sex ?? "--"}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm shadow-sky-50">
            <p className="text-sm uppercase tracking-wide text-slate-500">Alertas</p>
            <p className="text-2xl font-semibold text-slate-900">{summary.alerts?.length ?? 0}</p>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-lg shadow-sky-50 ring-1 ring-slate-100">
          <p className="text-sm font-semibold uppercase tracking-wide text-sky-700">Resumen clínico</p>
          <p className="mt-2 text-slate-700">
            {summary.clinical_summary?.length ? summary.clinical_summary : "Sin resumen disponible."}
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {[
            { label: "CHA2DS2-VASc", value: risk?.chads2vasc ?? "—" },
            { label: "HAS-BLED", value: risk?.has_bled ?? "—" },
            { label: "Score 2", value: risk?.score2 ?? "—" },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-sm shadow-sm"
            >
              <p className="font-semibold text-slate-800">{card.label}</p>
              <p className="text-lg text-slate-900">{card.value}</p>
            </div>
          ))}
        </section>

        <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-lg shadow-sky-50 ring-1 ring-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-sky-700">Timeline</p>
              <p className="text-lg font-semibold text-slate-900">Eventos clínicos</p>
            </div>
            <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 ring-1 ring-sky-100">
              {timeline.length} eventos
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {timeline.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-sm font-semibold text-slate-600">
                Aún no hay eventos para este paciente.
              </div>
            )}
            {timeline.map((event) => (
              <div
                key={event.id ?? `${event.title}-${event.date}`}
                className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900">{event.title ?? "Evento"}</p>
                  <span className="text-xs text-slate-500">{event.date ?? "Sin fecha"}</span>
                </div>
                <p className="text-xs text-slate-600">Tipo: {event.type ?? "N/D"}</p>
                <p className="mt-2 text-sm text-slate-700">
                  {event.description?.length ? event.description : "Sin descripción."}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
