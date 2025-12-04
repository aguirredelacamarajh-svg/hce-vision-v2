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
  updatePatient,
  addBloodPressure,
} from "../../../../lib/api";

type Tab = "cardio" | "global" | "blood_pressure";

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

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<{
    name: string;
    age: number;
    sex: string;
    clinical_summary: string;
    chads2vasc: number;
    has_bled: number;
    score2: number;
  }>({ name: "", age: 0, sex: "", clinical_summary: "", chads2vasc: 0, has_bled: 0, score2: 0 });
  const [updating, setUpdating] = useState(false);

  const [bpModalOpen, setBpModalOpen] = useState(false);
  const [bpForm, setBpForm] = useState<{
    date: string;
    time: string;
    systolic: number;
    diastolic: number;
    heart_rate: number;
  }>({
    date: new Date().toISOString().split("T")[0],
    time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
    systolic: 120,
    diastolic: 80,
    heart_rate: 70,
  });
  const [addingBp, setAddingBp] = useState(false);
  const [eventEditModalOpen, setEventEditModalOpen] = useState(false);
  const [eventEditForm, setEventEditForm] = useState<{
    index: number;
    title: string;
    date: string;
    type: string;
    description: string;
  }>({ index: -1, title: "", date: "", type: "", description: "" });

  const [labModalOpen, setLabModalOpen] = useState(false);

  const doDeleteLabValue = async (labName: string, index: number) => {
    if (!patientId || !summary?.lab_trends) return;
    if (!confirm(`¿Eliminar valor de ${labName}?`)) return;

    const newTrends = { ...summary.lab_trends };
    if (newTrends[labName]) {
      const newList = [...newTrends[labName]];
      newList.splice(index, 1);
      newTrends[labName] = newList;

      try {
        await updatePatient(patientId, {
          lab_trends: newTrends,
        });
        const refreshed = await fetchPatientSummary(patientId);
        setSummary(refreshed);
      } catch (err) {
        alert("Error eliminando valor de laboratorio");
      }
    }
  };

  const doDeleteBP = async (index: number) => {
    if (!patientId || !summary?.blood_pressure_history) return;
    if (!confirm("¿Eliminar este registro?")) return;

    const newHistory = [...summary.blood_pressure_history];
    newHistory.splice(index, 1); // Remove item at index (be careful with reverse mapping)
    // Actually, the display is reversed: [...bpHistory].reverse(). So index 0 in display is last in array.
    // Let's pass the actual record object or use the real index.
    // Better: Filter by identity or use the real index from the original array.
    // The map in the JSX uses `bpHistory.map((record, idx)`. `bpHistory` is `summary.blood_pressure_history`.
    // So `idx` corresponds to the index in `summary.blood_pressure_history`.

    // Wait, the display logic in JSX:
    // {bpHistory.map((record, idx) => ...
    // This iterates over the original array order (usually chronological if backend sorts it).
    // If backend sorts descending (newest first), then idx 0 is newest.
    // Backend: summary.blood_pressure_history.sort(key=lambda x: f"{x.date} {x.time}", reverse=True)
    // So yes, idx 0 is newest.

    try {
      await updatePatient(patientId, {
        blood_pressure_history: newHistory,
      });
      const refreshed = await fetchPatientSummary(patientId);
      setSummary(refreshed);
    } catch (err) {
      alert("Error eliminando registro");
    }
  };

  const openEventEditModal = (index: number, event: any) => {
    setEventEditForm({
      index,
      title: event.title || "",
      date: event.date || "",
      type: event.type || "",
      description: event.description || "",
    });
    setEventEditModalOpen(true);
  };

  const doUpdateEvent = async () => {
    if (!patientId || !summary?.timeline) return;
    const newTimeline = [...summary.timeline];
    if (eventEditForm.index >= 0 && eventEditForm.index < newTimeline.length) {
      newTimeline[eventEditForm.index] = {
        ...newTimeline[eventEditForm.index],
        title: eventEditForm.title,
        date: eventEditForm.date,
        type: eventEditForm.type,
        description: eventEditForm.description,
      };

      try {
        await updatePatient(patientId, {
          timeline: newTimeline,
        });
        const refreshed = await fetchPatientSummary(patientId);
        setSummary(refreshed);
        setEventEditModalOpen(false);
      } catch (err) {
        alert("Error actualizando evento");
      }
    }
  };

  // ... (existing code)

  // In JSX for BP History:
  // <div className="text-right"> ... <button onClick={() => doDeleteBP(idx)}>🗑️</button> </div>

  // In JSX for Timeline:
  // <div className="flex items-center justify-between"> ... <button onClick={() => openEventEditModal(idx, event)}>✏️</button> </div>

  // Add Event Edit Modal at the end


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

  const bpHistory = summary?.blood_pressure_history ?? [];
  const bpChartData = [...bpHistory]
    .reverse()
    .map((r) => ({ date: r.date, systolic: r.systolic, diastolic: r.diastolic }));

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

  const openEditModal = () => {
    if (!summary) return;
    setEditForm({
      name: summary.demographics.name,
      age: summary.demographics.age,
      sex: summary.demographics.sex,
      clinical_summary: summary.clinical_summary || "",
      chads2vasc: summary.risk_scores?.chads2vasc || 0,
      has_bled: summary.risk_scores?.has_bled || 0,
      score2: summary.risk_scores?.score2 || 0,
    });
    setEditModalOpen(true);
  };

  const doUpdate = async () => {
    if (!patientId) return;
    setUpdating(true);
    try {
      await updatePatient(patientId, {
        demographics: {
          name: editForm.name,
          age: editForm.age,
          sex: editForm.sex,
        },
        clinical_summary: editForm.clinical_summary,
        risk_scores: {
          chads2vasc: editForm.chads2vasc,
          has_bled: editForm.has_bled,
          score2: editForm.score2,
        },
      });
      const refreshed = await fetchPatientSummary(patientId);
      setSummary(refreshed);
      setEditModalOpen(false);
    } catch (err) {
      alert("Error actualizando paciente");
    } finally {
      setUpdating(false);
    }
  };

  const doAddBP = async () => {
    if (!patientId) return;
    setAddingBp(true);
    try {
      await addBloodPressure(patientId, {
        date: bpForm.date,
        time: bpForm.time,
        systolic: bpForm.systolic,
        diastolic: bpForm.diastolic,
        heart_rate: bpForm.heart_rate,
      });
      const refreshed = await fetchPatientSummary(patientId);
      setSummary(refreshed);
      setBpModalOpen(false);
    } catch (err) {
      alert("Error guardando tensión arterial");
    } finally {
      setAddingBp(false);
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
              onClick={openEditModal}
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
            >
              ✏️ Editar
            </button>
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
            { key: "blood_pressure", label: "🩺 Tensión Arterial" },
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
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold uppercase tracking-wide text-sky-700">Tendencias</p>
              <button
                onClick={() => setLabModalOpen(true)}
                className="text-xs font-semibold text-sky-600 hover:underline"
              >
                ⚙️ Gestionar Datos
              </button>
            </div>
            {(ldlData.length > 0 || creatinineData.length > 0 || bnpData.length > 0) ? (
              <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {ldlData.length > 1 && <TrendChart title="Tendencia LDL" data={ldlData} color="#0284c7" />}
                {creatinineData.length > 1 && <TrendChart title="Tendencia Creatinina" data={creatinineData} color="#ea580c" />}
                {bnpData.length > 1 && <TrendChart title="Tendencia BNP" data={bnpData} color="#7c3aed" />}
              </section>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-center text-sm text-slate-500">
                No hay suficientes datos de laboratorio para mostrar gráficas.
              </div>
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
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">{event.title ?? "Evento"}</p>
                        <button
                          onClick={() => openEventEditModal(summary.timeline!.indexOf(event), event)}
                          className="text-slate-400 hover:text-sky-600"
                        >
                          ✏️
                        </button>
                      </div>
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

        {activeTab === "blood_pressure" && (
          <section className="space-y-6">
            <div className="flex items-center justify-between rounded-3xl border border-slate-100 bg-white p-6 shadow-lg shadow-sky-50 ring-1 ring-slate-100">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-sky-700">
                  Monitoreo de Tensión Arterial
                </p>
                <p className="text-lg font-semibold text-slate-900">Historial y Tendencias</p>
              </div>
              <button
                onClick={() => setBpModalOpen(true)}
                className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-sky-200 transition hover:-translate-y-0.5 hover:bg-sky-700"
              >
                + Agregar Registro
              </button>
            </div>

            {bpChartData.length > 1 ? (
              <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-lg shadow-sky-50 ring-1 ring-slate-100">
                <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Tendencia (Sistólica / Diastólica)
                </p>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={bpChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                      <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" domain={[40, 200]} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "8px",
                          border: "none",
                          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="systolic"
                        stroke="#ef4444"
                        strokeWidth={2}
                        name="Sistólica"
                        dot={{ r: 3, fill: "#ef4444" }}
                      />
                      <Line
                        type="monotone"
                        dataKey="diastolic"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        name="Diastólica"
                        dot={{ r: 3, fill: "#3b82f6" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center text-sm font-semibold text-slate-600">
                Insuficientes datos para mostrar la gráfica. Agrega más registros.
              </div>
            )}

            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-lg shadow-sky-50 ring-1 ring-slate-100">
              <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Registros Recientes
              </p>
              <div className="space-y-3">
                {bpHistory.length === 0 && (
                  <p className="text-sm text-slate-600">No hay registros de tensión arterial.</p>
                )}
                {bpHistory.map((record, idx) => (
                  <div
                    key={`${record.date}-${record.time}-${idx}`}
                    className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 p-4 shadow-sm"
                  >
                    <div>
                      <p className="font-bold text-slate-900">
                        {record.systolic} / {record.diastolic} mmHg
                      </p>
                      <p className="text-xs text-slate-500">
                        FC: {record.heart_rate ?? "--"} bpm
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-700">{record.date}</p>
                      <p className="text-xs text-slate-500">{record.time}</p>
                      <button
                        onClick={() => doDeleteBP(idx)}
                        className="mt-1 text-xs text-red-400 hover:text-red-600"
                      >
                        🗑️ Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
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

      {/* BP MODAL */}
      {bpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl shadow-sky-100">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">Agregar Tensión Arterial</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Fecha</label>
                  <input
                    type="date"
                    value={bpForm.date}
                    onChange={(e) => setBpForm({ ...bpForm, date: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Hora</label>
                  <input
                    type="time"
                    value={bpForm.time}
                    onChange={(e) => setBpForm({ ...bpForm, time: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Sistólica</label>
                  <input
                    type="number"
                    value={bpForm.systolic}
                    onChange={(e) => setBpForm({ ...bpForm, systolic: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Diastólica</label>
                  <input
                    type="number"
                    value={bpForm.diastolic}
                    onChange={(e) => setBpForm({ ...bpForm, diastolic: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Frecuencia Cardíaca</label>
                <input
                  type="number"
                  value={bpForm.heart_rate}
                  onChange={(e) => setBpForm({ ...bpForm, heart_rate: parseInt(e.target.value) || 0 })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setBpModalOpen(false)}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={doAddBP}
                disabled={addingBp}
                className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-sky-200 hover:bg-sky-700 disabled:opacity-70"
              >
                {addingBp ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl shadow-sky-100">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">Editar Paciente</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Nombre</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Edad</label>
                  <input
                    type="number"
                    value={editForm.age}
                    onChange={(e) => setEditForm({ ...editForm, age: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Sexo</label>
                  <select
                    value={editForm.sex}
                    onChange={(e) => setEditForm({ ...editForm, sex: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  >
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Resumen Clínico</label>
                <textarea
                  value={editForm.clinical_summary}
                  onChange={(e) => setEditForm({ ...editForm, clinical_summary: e.target.value })}
                  rows={4}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">CHA₂DS₂-VASc</label>
                  <input
                    type="number"
                    value={editForm.chads2vasc}
                    onChange={(e) => setEditForm({ ...editForm, chads2vasc: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">HAS-BLED</label>
                  <input
                    type="number"
                    value={editForm.has_bled}
                    onChange={(e) => setEditForm({ ...editForm, has_bled: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">SCORE2</label>
                  <input
                    type="number"
                    value={editForm.score2}
                    onChange={(e) => setEditForm({ ...editForm, score2: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setEditModalOpen(false)}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={doUpdate}
                disabled={updating}
                className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-sky-200 hover:bg-sky-700 disabled:opacity-70"
              >
                {updating ? "Guardando..." : "Guardar Cambios"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EVENT EDIT MODAL */}
      {eventEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl shadow-sky-100">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">Editar Evento</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Título</label>
                <input
                  type="text"
                  value={eventEditForm.title}
                  onChange={(e) => setEventEditForm({ ...eventEditForm, title: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Fecha</label>
                  <input
                    type="date"
                    value={eventEditForm.date}
                    onChange={(e) => setEventEditForm({ ...eventEditForm, date: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Tipo</label>
                  <input
                    type="text"
                    value={eventEditForm.type}
                    onChange={(e) => setEventEditForm({ ...eventEditForm, type: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Descripción</label>
                <textarea
                  value={eventEditForm.description}
                  onChange={(e) => setEventEditForm({ ...eventEditForm, description: e.target.value })}
                  rows={4}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setEventEditModalOpen(false)}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={doUpdateEvent}
                className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-sky-200 hover:bg-sky-700"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LAB MANAGEMENT MODAL */}
      {labModalOpen && summary?.lab_trends && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 px-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl shadow-sky-100 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Gestionar Datos de Laboratorio</h3>
              <button
                onClick={() => setLabModalOpen(false)}
                className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600 hover:bg-slate-200"
              >
                Cerrar
              </button>
            </div>

            <div className="space-y-6">
              {Object.entries(summary.lab_trends).length === 0 && (
                <p className="text-center text-slate-500">No hay datos de laboratorio registrados.</p>
              )}
              {Object.entries(summary.lab_trends).map(([labName, results]) => (
                <div key={labName} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <h4 className="mb-2 font-semibold text-slate-800 uppercase text-sm">{labName}</h4>
                  <div className="space-y-2">
                    {results.map((res, idx) => (
                      <div key={`${res.date}-${idx}`} className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-medium text-slate-900">{res.value} {res.unit}</span>
                          <span className="text-xs text-slate-500">{res.date}</span>
                        </div>
                        <button
                          onClick={() => doDeleteLabValue(labName, idx)}
                          className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded"
                        >
                          🗑️ Eliminar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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
