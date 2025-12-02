"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { fetchPatients, PatientSummary } from "../../lib/api";

export default function DashboardPage() {
  const search = useSearchParams();
  const role = search.get("role") ?? "medico";
  const user = search.get("user") ?? "usuario";

  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        setError(null);
        const data = await fetchPatients();
        if (!isMounted) return;
        setPatients(data);
      } catch (err) {
        if (!isMounted) return;
        const message = err instanceof Error ? err.message : "Error desconocido";
        setError(message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const kpiCards = useMemo(() => {
    const total = patients.length;
    const withAlerts = patients.filter((p) => (p.alerts?.length ?? 0) > 0).length;
    return [
      { label: "Pacientes en panel", value: total },
      { label: "Pacientes con alertas", value: withAlerts },
      { label: "Rol activo", value: role === "medico" ? "Médico" : "Paciente" },
    ];
  }, [patients.length, role, patients]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-white text-slate-900">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-600 text-white shadow-lg shadow-sky-200">
            <span className="text-lg font-semibold">HCE</span>
          </div>
          <div>
            <p className="text-xl font-semibold tracking-tight text-slate-900">
              HCE Vision · Dashboard
            </p>
            <p className="text-sm text-slate-500">Bienvenido, {user}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/login"
            className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50"
          >
            Cambiar rol
          </a>
          <a
            href="/"
            className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-sky-200 transition hover:-translate-y-0.5 hover:bg-sky-700"
          >
            Landing
          </a>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 pb-16">
        <section className="grid gap-4 md:grid-cols-3">
          {kpiCards.map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm shadow-sky-50"
            >
              <p className="text-sm uppercase tracking-wide text-slate-500">{kpi.label}</p>
              <p className="text-2xl font-semibold text-slate-900">{kpi.value}</p>
            </div>
          ))}
        </section>

        <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-lg shadow-sky-50 ring-1 ring-slate-100">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-sky-700">Pacientes</p>
              <h2 className="text-2xl font-semibold text-slate-900">Lista desde FastAPI</h2>
              <p className="text-sm text-slate-600">
                Consumimos GET /patients en {process.env.NEXT_PUBLIC_API_BASE || "https://hce-vision-api.onrender.com"}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
              Rol actual: {role === "medico" ? "Médico" : "Paciente"}
            </div>
          </div>

          {loading && (
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-28 animate-pulse rounded-2xl bg-slate-100"
                />
              ))}
            </div>
          )}

          {error && (
            <div className="mt-6 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700 ring-1 ring-red-100">
              {error}
            </div>
          )}

          {!loading && !error && (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {patients.map((patient) => (
                <article
                  key={patient.patient_id}
                  className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-base font-semibold text-slate-900">
                        {patient.demographics?.name || "Sin nombre"}
                      </p>
                      <p className="text-sm text-slate-600">
                        ID: {patient.patient_id || "N/D"}
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
                      {patient.demographics?.sex || "?"} · {patient.demographics?.age ?? "--"} años
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
                    <span className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">
                      Alertas: {patient.alerts?.length ?? 0}
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">
                      Rol: {role === "medico" ? "Médico" : "Paciente"}
                    </span>
                  </div>
                </article>
              ))}

              {patients.length === 0 && (
                <div className="col-span-full rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-6 text-center text-sm font-semibold text-slate-600">
                  No hay pacientes cargados aún. Crea uno desde la App móvil o vía API POST /patients.
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
