"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  ExtractedData,
  fetchPatientSummary,
  GlobalEvent,
  PatientDetail,
  extractData,
  submitAnalysis,
} from "../../../../lib/api";

type Tab = "cardio" | "global";

const TrendChart = ({
  title,
  data,
  color = "#0284c7",
}: {
  title: string;
  data: { date: string; value: number }[];
  color?: string;
}) => {
  if (!data || data.length < 2) return null;

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm shadow-sky-50">
      <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#94a3b8" />
            <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
            <Tooltip
              contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={{ r: 3, fill: color }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default function PatientDetailPage() {
  const params = useParams<{ id: string }>();
  const rawId = params?.id;
  const patientId = Array.isArray(rawId) ? rawId[0] : rawId;

  const [summary, setSummary] = useState<PatientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("cardio");

  const [modalOpen, setModalOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedData | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (!patientId) return;
      try {
        setError(null);
        const data = await fetchPatientSummary(patientId);
        if (!isMounted) return;
        setSummary(data);
      } catch (err) {
        if (!isMounted) return;
        const message = err instanceof Error ? err.message : "No se pudo cargar el paciente.";
        setError(message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [patientId]);

  const risk = summary?.risk_scores;
  const timeline = summary?.timeline ?? [];
  const globalTimeline = useMemo<GlobalEvent[]>(() => {
    const fromSummary = summary?.global_timeline_events ?? [];
    const fromExtraction = extracted?.global_timeline_events ?? [];
    return fromExtraction.length ? fromExtraction : fromSummary;
  }, [summary?.global_timeline_events, extracted?.global_timeline_events]);

  // Prepare Chart Data
  const ldlData = summary?.lab_trends?.ldl?.map((d) => ({ date: d.date, value: d.value })) ?? [];
  const creatinineData =
    summary?.lab_trends?.creatinine?.map((d) => ({ date: d.date, value: d.value })) ?? [];
  const bnpData = summary?.lab_trends?.bnp?.map((d) => ({ date: d.date, value: d.value })) ?? [];

  const handleFiles = (list: FileList | null) => {
    if (!list) return;
    const incoming = Array.from(list);
    const merged = [...files, ...incoming].slice(0, 8); // limit to 8 for UX
    setFiles(merged);
    setPreviews(merged.map((file) => URL.createObjectURL(file)));
  };

  const removeFile = (index: number) => {
    const updated = files.filter((_, i) => i !== index);
    const updatedPrev = previews.filter((_, i) => i !== index);
    setFiles(updated);
    setPreviews(updatedPrev);
  };

  const doExtract = async () => {
    if (!patientId) return;
    if (!files.length) {
      setExtractError("Selecciona al menos 1 imagen para analizar.");
      return;
    }
    setExtractError(null);
    setExtracting(true);
    setSaveMessage(null);
    try {
      const result = await extractData(patientId, files);
      setExtracted(result);
      setActiveTab("cardio");
      setModalOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo analizar los documentos.";
      setExtractError(message);
    } finally {
      setExtracting(false);
    }
  };

  const doSave = async () => {
    if (!patientId || !extracted) {
      setSaveMessage("Nada para guardar. Analiza documentos primero.");
      return;
    }
    setSaving(true);
    setSaveMessage(null);
    try {
      await submitAnalysis({
        patient_id: patientId,
        event: extracted.event,
        medications: extracted.medications,
        antecedents: extracted.antecedents,
        historical_data: extracted.historical_data,
        global_timeline_events: extracted.global_timeline_events,
      });
      const refreshed = await fetchPatientSummary(patientId);
      setSummary(refreshed);
      setSaveMessage("Guardado en la historia clínica.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo guardar el análisis en el backend.";
      setSaveMessage(message);
    } finally {
      setSaving(false);
    }
  };

  if (!patientId) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-white text-slate-900">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-6 py-10">
          <Link href="/dashboard" className="text-sm font-semibold text-sky-700 hover:underline">
            ← Volver al dashboard
          </Link>
          <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-red-700">
            <p className="text-lg font-semibold">Paciente no encontrado</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-white text-slate-900">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-6 py-10">
          <div className="h-10 w-32 animate-pulse rounded-full bg-slate-100" />
          <div className="h-44 animate-pulse rounded-3xl bg-white" />
          <div className="h-44 animate-pulse rounded-3xl bg-white" />
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-white text-slate-900">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-6 py-10">
          <Link href="/dashboard" className="text-sm font-semibold text-sky-700 hover:underline">
            ← Volver al dashboard
          </Link>
          <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-red-700">
            <p className="text-lg font-semibold">Error al cargar</p>
            <p className="text-sm">{error ?? "No se encontró el paciente."}</p>
          </div>
        </div>
      </div>
    );
  }

  const demographics = summary.demographics;

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-white text-slate-900">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
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
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setModalOpen(true)}
              className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-sky-200 transition hover:-translate-y-0.5 hover:bg-sky-700"
            >
              Analizar documentos
            </button>
            <Link
              href="/dashboard"
              className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50"
            >
              Volver al dashboard
            </Link>
          </div>
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

        <div className="flex items-center gap-2 rounded-2xl bg-slate-50 p-2">
          {[
            { key: "cardio", label: "❤️ Perfil cardiológico" },
            { key: "global", label: "🌍 Historia global" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as Tab)}
              className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition ${activeTab === tab.key
                ? "bg-white text-sky-700 shadow-sm ring-1 ring-sky-100"
                : "text-slate-600 hover:text-sky-700"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "cardio" && (
          <>
            <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-lg shadow-sky-50 ring-1 ring-slate-100">
              <p className="text-sm font-semibold uppercase tracking-wide text-sky-700">Resumen clínico</p>
              <p className="mt-2 text-slate-700">
                {summary.clinical_summary?.length ? summary.clinical_summary : "Sin resumen disponible."}
              </p>
            </section>

            {/* CHARTS SECTION */}
            {(ldlData.length > 1 || creatinineData.length > 1 || bnpData.length > 1) && (
              <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <TrendChart title="Tendencia LDL" data={ldlData} color="#0284c7" />
                <TrendChart title="Tendencia Creatinina" data={creatinineData} color="#ea580c" />
                <TrendChart title="Tendencia BNP" data={bnpData} color="#7c3aed" />
              </section>
            )}

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

            {extracted && (
              <section className="rounded-3xl border border-emerald-100 bg-emerald-50 p-6 shadow-lg shadow-sky-50">
                <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
                  Resultado reciente
                </p>
                <p className="mt-2 text-slate-800">
                  {extracted.event?.title ?? "Evento detectado"} · {extracted.event?.date ?? "Sin fecha"}
                </p>
                <p className="text-sm text-slate-700">
                  {extracted.event?.description ?? "Descripción no disponible."}
                </p>
                {extracted.risk_scores && (
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {[
                      { label: "CHA2DS2-VASc", value: extracted.risk_scores.chads2vasc ?? "—" },
                      { label: "HAS-BLED", value: extracted.risk_scores.has_bled ?? "—" },
                      { label: "Score 2", value: extracted.risk_scores.score2 ?? "—" },
                    ].map((card) => (
                      <div
                        key={card.label}
                        className="rounded-2xl border border-emerald-100 bg-white p-4 text-sm shadow-sm"
                      >
                        <p className="font-semibold text-slate-800">{card.label}</p>
                        <p className="text-lg text-slate-900">{card.value}</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}

        {activeTab === "global" && (
          <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-lg shadow-sky-50 ring-1 ring-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-sky-700">
                  Historia clínica global
                </p>
                <p className="text-lg font-semibold text-slate-900">Eventos más allá del perfil cardio</p>
              </div>
              <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 ring-1 ring-sky-100">
                {globalTimeline.length} eventos
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {globalTimeline.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-sm font-semibold text-slate-600">
                  Sin eventos globales. Analiza documentos para obtener la historia paralela.
                </div>
              )}
              {globalTimeline.map((event, idx) => (
                <div
                  key={`${event.date}-${idx}`}
                  className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-900">
                      {event.category || "Evento"}
                    </p>
                    <span className="text-xs text-slate-500">{event.date || "Sin fecha"}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-700">
                    {event.description?.length ? event.description : "Sin descripción."}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {extracted && (
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={doSave}
              disabled={saving}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-100 transition hover:-translate-y-0.5 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? "Guardando..." : "Guardar en historia clínica"}
            </button>
            {saveMessage && <p className="text-sm text-slate-600">{saveMessage}</p>}
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 px-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl shadow-sky-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-sky-700">Escaneo</p>
                <p className="text-lg font-semibold text-slate-900">
                  Sube múltiples imágenes para analizarlas
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600 hover:bg-slate-200"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <label className="block cursor-pointer rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-center text-sm font-semibold text-slate-700 hover:border-sky-200 hover:bg-sky-50">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />
                Selecciona imágenes o PDFs o arrastra aquí (máx 8)
              </label>

              {previews.length > 0 && (
                <div className="grid grid-cols-3 gap-3 md:grid-cols-4">
                  {previews.map((src, idx) => {
                    const file = files[idx];
                    const isPdf = file?.type === "application/pdf";

                    return (
                      <div
                        key={src}
                        className="group relative overflow-hidden rounded-xl border border-slate-100 bg-slate-50"
                      >
                        {isPdf ? (
                          <div className="flex h-28 w-full items-center justify-center bg-red-50 text-red-500">
                            <div className="text-center">
                              <span className="text-2xl">📄</span>
                              <p className="mt-1 text-[10px] font-bold uppercase">PDF</p>
                            </div>
                          </div>
                        ) : (
                          <img src={src} alt={`preview-${idx}`} className="h-28 w-full object-cover" />
                        )}
                        <button
                          onClick={() => removeFile(idx)}
                          className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-1 text-xs font-semibold text-red-600 shadow"
                        >
                          Quitar
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {extractError && (
                <div className="rounded-xl bg-red-50 px-3 py-3 text-sm font-semibold text-red-700 ring-1 ring-red-100">
                  {extractError}
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
              <button
                onClick={() => {
                  setFiles([]);
                  setPreviews([]);
                  setModalOpen(false);
                }}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={doExtract}
                disabled={extracting}
                className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-sky-200 transition hover:-translate-y-0.5 hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {extracting ? "Analizando..." : "Analizar documentos"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
