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

export type PatientDetail = {
  patient_id: string;
  demographics: PatientDemographics;
  clinical_summary?: string;
  alerts?: string[];
  timeline?: ClinicalEvent[];
  risk_scores?: RiskScores;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "https://hce-vision-api.onrender.com";

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
  const response = await fetch(`${API_BASE}/patients/${id}/summary`, {
    cache: "no-store",
  });
  return handleResponse<PatientDetail>(response);
}
