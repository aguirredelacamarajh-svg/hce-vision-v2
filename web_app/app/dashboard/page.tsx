"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createPatient, fetchPatients, PatientListItem } from "../../lib/api";

type Role = "medico" | "paciente";

export default function DashboardPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<PatientListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<{ username: string; role: Role } | null>(null);
  const [creating, setCreating] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [newPatient, setNewPatient] = useState({ name: "", age: "", sex: "M" });
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("hce_user") : null;
    if (!stored) {
      router.push("/login");
      return;
    }
    try {
      const parsed = JSON.parse(stored) as { username: string; role: Role };
      setUser(parsed);
    } catch (_) {
      router.push("/login");
    }
  }, [router]);

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
      { label: "Rol activo", value: user?.role === "medico" ? "Médico" : "Paciente" },
    ];
  }, [patients.length, user?.role, patients]);

  const handleCreatePatient = async () => {
    setCreateError(null);
    if (newPatient.name.trim().length < 3) {
      setCreateError("Nombre mínimo 3 caracteres.");
      return;
    }
    const ageNumber = Number(newPatient.age);
    if (Number.isNaN(ageNumber) || ageNumber <= 0 || ageNumber > 120) {
      setCreateError("Edad inválida.");
      return;
    }
    setCreating(true);
    try {
      await createPatient({ name: newPatient.name.trim(), age: ageNumber, sex: newPatient.sex });
      const refreshed = await fetchPatients();
      setPatients(refreshed);
      setModalOpen(false);
      setNewPatient({ name: "", age: "", sex: "M" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo crear el paciente.";
      setCreateError(message);
    } finally {
      setCreating(false);
    }
  };

  const formatRole = (value?: Role) => (value === "medico" ? "Médico" : "Paciente");

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
            <p className="text-sm text-slate-500">Bienvenido, {user?.username ?? "usuario"}</p>
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
                GET /patients en {process.env.NEXT_PUBLIC_API_BASE || "https://hce-vision-api.onrender.com"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="rounded-xl bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
                Rol actual: {formatRole(user?.role)}
              </div>
              <button
                onClick={() => setModalOpen(true)}
                className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-sky-200 transition hover:-translate-y-0.5 hover:bg-sky-700"
              >
                Nuevo paciente
              </button>
            </div>
          </div>

          {loading && (
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />
              ))}
            </div>
          )}

          {error && (
            <div className="mt-6 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700 ring-1 ring-red-100">
              {error}
            </div>
          )}

          {!loading && !error && (
            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/60 shadow-sm">
              <div className="grid grid-cols-4 bg-white px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <span>Nombre</span>
                <span>Edad</span>
                <span>Sexo</span>
                <span>ID</span>
              </div>
              <div className="divide-y divide-slate-100">
                {patients.map((patient) => (
                  <button
                    key={patient.patient_id}
                    onClick={() => router.push(`/dashboard/patient/${patient.patient_id}`)}
                    className="grid w-full grid-cols-4 items-center px-4 py-4 text-left text-sm transition hover:bg-white"
                  >
                    <span className="font-semibold text-slate-900">
                      {patient.demographics?.name || "Sin nombre"}
                    </span>
                    <span className="text-slate-700">{patient.demographics?.age ?? "--"}</span>
                    <span className="text-slate-700">{patient.demographics?.sex || "?"}</span>
                    <span className="text-slate-600">{patient.patient_id || "N/D"}</span>
                  </button>
                ))}
                {patients.length === 0 && (
                  <div className="px-4 py-6 text-center text-sm font-semibold text-slate-600">
                    No hay pacientes. Crea uno con el botón “Nuevo paciente”.
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </main>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl shadow-sky-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-sky-700">Nuevo paciente</p>
                <p className="text-lg font-semibold text-slate-900">Crear y sincronizar</p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600 hover:bg-slate-200"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-slate-800">Nombre</label>
                <input
                  value={newPatient.name}
                  onChange={(e) => setNewPatient((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Ej: Juan Pérez"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500 focus:bg-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-800">Edad</label>
                <input
                  value={newPatient.age}
                  onChange={(e) => setNewPatient((prev) => ({ ...prev, age: e.target.value }))}
                  placeholder="Ej: 42"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500 focus:bg-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-800">Sexo</label>
                <select
                  value={newPatient.sex}
                  onChange={(e) => setNewPatient((prev) => ({ ...prev, sex: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500 focus:bg-white"
                >
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                </select>
              </div>
            </div>

            {createError && (
              <div className="mt-3 rounded-xl bg-red-50 px-3 py-3 text-sm font-semibold text-red-700 ring-1 ring-red-100">
                {createError}
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreatePatient}
                disabled={creating}
                className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-sky-200 transition hover:-translate-y-0.5 hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {creating ? "Creando..." : "Crear paciente"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
