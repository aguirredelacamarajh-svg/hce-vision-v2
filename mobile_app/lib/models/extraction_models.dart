import '../models/clinical_event.dart';
import '../models/patient_summary.dart';

class ExtractedData {
  final ClinicalEvent event;
  final List<String> medications;
  final Map<String, bool> antecedents;
  final RiskScores riskScores;
  final List<Map<String, dynamic>> historicalData; // Nuevo

  ExtractedData({
    required this.event,
    required this.medications,
    required this.antecedents,
    required this.riskScores,
    required this.historicalData,
  });

  factory ExtractedData.fromJson(Map<String, dynamic> json) {
    return ExtractedData(
      event: ClinicalEvent.fromJson(json['event']),
      medications: List<String>.from(json['medications'] ?? []),
      antecedents: Map<String, bool>.from(json['antecedents'] ?? {}),
      riskScores: RiskScores.fromJson(json['risk_scores'] ?? {}),
      historicalData: List<Map<String, dynamic>>.from(json['historical_data'] ?? []),
    );
  }
}

class SubmitAnalysisRequest {
  final String patientId;
  final ClinicalEvent event;
  final List<String> medications;
  final Map<String, bool> antecedents;
  final List<Map<String, dynamic>> historicalData; // Nuevo

  SubmitAnalysisRequest({
    required this.patientId,
    required this.event,
    required this.medications,
    required this.antecedents,
    required this.historicalData,
  });

  Map<String, dynamic> toJson() {
    return {
      'patient_id': patientId,
      'event': {
        'id': event.id,
        'date': event.date.toIso8601String(),
        'type': event.type.name,
        'title': event.title,
        'description': event.description,
        'source': event.imagePath ?? "IA + Revisión",
        'labs': event.labs, // Labs reales
      },
      'medications': medications,
      'antecedents': antecedents,
      'historical_data': historicalData,
    };
  }
}
