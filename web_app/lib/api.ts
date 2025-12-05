export type PatientDemographics = {
  name: string;
  age: number;
  sex: string;
};

export type PatientListItem = {
  patient_id: string;
  demographics: PatientDemographics;
  alerts?: string[];
};

export type ClinicalEvent = {
  id?: string;
  date?: string;
  type?: string;
  title?: string;
  description?: string;
};

export type RiskScores = {
  chads2vasc?: number;
  has_bled?: number;
  score2?: number;
};

export type GlobalEvent = {
  date: string;
  category: string;
  description: string;
};

export type LabResult = {
  date: string;
  value: number;
  unit: string;
};

export type BloodPressureRecord = {
  date: string;
  time: string;
  systolic: number;
  diastolic: number;
  heart_rate?: number;
  notes?: string;
};

export type PatientDetail = {
  patient_id: string;
  demographics: PatientDemographics;
  clinical_summary?: string;
  alerts?: string[];
  timeline?: ClinicalEvent[];
  risk_scores?: RiskScores;
  global_timeline_events?: GlobalEvent[];
  lab_trends?: Record<string, LabResult[]>;
  blood_pressure_history?: BloodPressureRecord[];
};

export type ExtractedData = {
  event?: ClinicalEvent;
  medications?: string[];
  antecedents?: Record<string, boolean>;
  risk_scores?: RiskScores;
  historical_data?: Record<string, unknown>[];
  global_timeline_events?: GlobalEvent[];
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Error ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function fetchPatients(): Promise<PatientListItem[]> {
  const response = await fetch(`${API_BASE}/patients`, { cache: "no-store" });
  return handleResponse<PatientListItem[]>(response);
}

export async function createPatient(payload: {
  name: string;
  age: number;
  sex: string;
}): Promise<PatientListItem> {
  const response = await fetch(`${API_BASE}/patients`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse<PatientListItem>(response);
}

export async function fetchPatientSummary(id: string): Promise<PatientDetail> {
  const cleanId = id.trim();
  const response = await fetch(`${API_BASE}/patients/${cleanId}/summary`, {
    cache: "no-store",
  });
  return handleResponse<PatientDetail>(response);
}

export async function extractData(patientId: string, files: File[]): Promise<ExtractedData> {
  const formData = new FormData();
  formData.append("patient_id", patientId);
  files.forEach((file) => formData.append("files", file));

  const response = await fetch(`${API_BASE}/extract_data`, {
    method: "POST",
    body: formData,
  });
  return handleResponse<ExtractedData>(response);
}

export async function submitAnalysis(payload: {
  patient_id: string;
  event?: ClinicalEvent;
  medications?: string[];
  antecedents?: Record<string, boolean>;
  historical_data?: Record<string, unknown>[];
  global_timeline_events?: GlobalEvent[];
}): Promise<PatientDetail> {
  const response = await fetch(`${API_BASE}/submit_analysis`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse<PatientDetail>(response);
}

export type UpdatePatientRequest = {
  demographics?: PatientDemographics;
  antecedents?: Record<string, boolean>;
  risk_scores?: RiskScores;
  medications?: { name: string; dose?: string; schedule?: string; route?: string }[];
  clinical_summary?: string;
  lab_trends?: Record<string, LabResult[]>;
  blood_pressure_history?: BloodPressureRecord[];
  timeline?: ClinicalEvent[];
};

export async function updatePatient(
  patientId: string,
  payload: UpdatePatientRequest
): Promise<PatientDetail> {
  const response = await fetch(`${API_BASE}/patients/${patientId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse<PatientDetail>(response);
}

export async function addBloodPressure(
  patientId: string,
  record: BloodPressureRecord
): Promise<PatientDetail> {
  const response = await fetch(`${API_BASE}/patients/${patientId}/blood_pressure`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(record),
  });
  return handleResponse<PatientDetail>(response);
}
