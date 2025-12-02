export type PatientDemographics = {
  name: string;
  age: number;
  sex: string;
};

export type PatientSummary = {
  patient_id: string;
  demographics: PatientDemographics;
  alerts?: string[];
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "https://hce-vision-api.onrender.com";

export async function fetchPatients(): Promise<PatientSummary[]> {
  const response = await fetch(`${API_BASE}/patients`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Error ${response.status} al cargar pacientes`);
  }

  return response.json();
}
