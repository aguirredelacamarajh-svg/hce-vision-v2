"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Role = "medico" | "paciente";

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("medico");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDoctor = role === "medico";

  const subtitle = useMemo(() => {
    return isDoctor
      ? "Panel seguro para médicos. Autenticación simple para la demo."
      : "Identifícate como paciente para ver tu resumen y subir documentos.";
  }, [isDoctor]);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("hce_user") : null;
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as { username?: string; role?: Role };
        if (parsed?.username) setUsername(parsed.username);
        if (parsed?.role) setRole(parsed.role);
      } catch (_) {
        // ignore malformed
      }
    }
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (username.trim().length < 3) {
      setError("Ingresa tu nombre o usuario (mínimo 3 caracteres).");
      return;
    }

    setLoading(true);
    const data = { username: username.trim(), role };
    localStorage.setItem("hce_user", JSON.stringify(data));
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-white text-slate-900">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-600 text-white shadow-lg shadow-sky-200">
            <span className="text-lg font-semibold">HCE</span>
          </div>
          <div>
            <p className="text-xl font-semibold tracking-tight text-slate-900">
              HCE Vision
            </p>
            <p className="text-sm text-slate-500">Historias clínicas con IA</p>
          </div>
        </div>
        <a
          href="/"
          className="rounded-xl px-4 py-2 text-sm font-semibold text-sky-700 ring-1 ring-sky-100 transition hover:bg-sky-50"
        >
          Volver a inicio
        </a>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 pb-20">
        <section className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <div className="flex flex-col gap-4">
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-700 shadow-sm shadow-sky-100 ring-1 ring-sky-100">
              Acceso seguro
            </span>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight text-slate-900">
              Inicia sesión según tu rol.
            </h1>
              <p className="text-lg text-slate-600">{subtitle}</p>
            <div className="rounded-2xl border border-slate-100 bg-white/80 p-4 shadow-sm shadow-sky-50">
              <p className="text-sm font-semibold text-slate-800">Demo rápida</p>
              <p className="text-sm text-slate-600">
                Login simulado: guarda tu usuario/rol en localStorage y redirige al dashboard. Próximamente
                conectaremos autenticación completa con FastAPI.
              </p>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 -z-10 blur-3xl bg-gradient-to-br from-sky-100 via-white to-emerald-50" />
            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl shadow-sky-100 ring-1 ring-slate-100">
              <div className="mb-4 flex gap-2 rounded-2xl bg-slate-50 p-1">
                {[
                  { key: "medico", label: "Soy Médico" },
                  { key: "paciente", label: "Soy Paciente" },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setRole(item.key as Role)}
                    className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                      role === item.key
                        ? "bg-white text-sky-700 shadow-sm ring-1 ring-sky-100"
                        : "text-slate-600 hover:text-sky-700"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-800">
                    {isDoctor ? "Usuario o nombre" : "Nombre y apellido"}
                  </label>
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={isDoctor ? "Ej: dr.garcia" : "Ej: Ana López"}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500 focus:bg-white"
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-3 text-sm font-semibold text-red-700 ring-1 ring-red-100">
                    <span>⚠️</span>
                    <p>{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 px-5 py-3 text-base font-semibold text-white shadow-lg shadow-sky-200 transition hover:-translate-y-0.5 hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? "Ingresando..." : "Ingresar al dashboard"}
                </button>

                <p className="text-xs text-slate-500">
                  Demo sin autenticación real. Guardamos tu usuario/rol en localStorage y te redirigimos al
                  dashboard. Próximamente conectaremos autenticación completa con el backend FastAPI.
                </p>
              </form>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
