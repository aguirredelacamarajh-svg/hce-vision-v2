
import '../models/patient.dart';
import '../models/clinical_event.dart';

class Repository {
  // Singleton: Una única instancia para toda la app
  static final Repository _instance = Repository._internal();

  factory Repository() {
    return _instance;
  }

  Repository._internal() {
    // Datos de prueba iniciales
    _patients.add(Patient(id: '1', name: 'Juan Pérez', age: 76, sex: 'M'));
    _patients.add(Patient(id: '2', name: 'María García', age: 68, sex: 'F'));
  }

  final List<Patient> _patients = [];
  final List<ClinicalEvent> _events = [];

  // --- Pacientes ---
  List<Patient> getPatients() {
    return List.unmodifiable(_patients);
  }

  void addPatient(Patient patient) {
    _patients.add(patient);
  }

  void updatePatient(Patient patient) {
    final index = _patients.indexWhere((p) => p.id == patient.id);
    if (index != -1) {
      _patients[index] = patient;
    }
  }

  // --- Eventos ---
  List<ClinicalEvent> getEventsForPatient(String patientId) {
    final events = _events.where((e) => e.patientId == patientId).toList();
    // Ordenar por fecha descendente (más reciente primero)
    events.sort((a, b) => b.date.compareTo(a.date));
    return events;
  }

  void addEvent(ClinicalEvent event) {
    _events.add(event);
  }
}
