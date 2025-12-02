import 'clinical_event.dart';

class LabResult {
  final String date;
  final double value;
  final String unit;

  LabResult({required this.date, required this.value, required this.unit});

  factory LabResult.fromJson(Map<String, dynamic> json) {
    return LabResult(
      date: json['date'] ?? '',
      value: (json['value'] as num?)?.toDouble() ?? 0.0,
      unit: json['unit'] ?? '',
    );
  }
}

class PatientSummary {
  final String patientId;
  final Demographics demographics;
  final List<ClinicalEvent> timeline;
  final List<Medication> medications;
  final RiskScores riskScores;
  final String clinicalSummary;
  final List<String> alerts;
  final Map<String, List<LabResult>> labTrends;
  final Map<String, bool> antecedents; // Nuevo campo

  PatientSummary({
    required this.patientId,
    required this.demographics,
    required this.timeline,
    required this.medications,
    required this.riskScores,
    required this.clinicalSummary,
    required this.alerts,
    required this.labTrends,
    required this.antecedents,
  });

  factory PatientSummary.fromJson(Map<String, dynamic> json) {
    Map<String, List<LabResult>> trends = {};
    if (json['lab_trends'] != null) {
      (json['lab_trends'] as Map<String, dynamic>).forEach((key, value) {
        trends[key] = (value as List).map((e) => LabResult.fromJson(e)).toList();
      });
    }

    return PatientSummary(
      patientId: json['patient_id'] ?? '',
      demographics: Demographics.fromJson(json['demographics'] ?? {}),
      timeline: (json['timeline'] as List?)
              ?.map((e) => ClinicalEvent.fromJson(e))
              .toList() ??
          [],
      medications: (json['medications'] as List?)
              ?.map((e) => Medication.fromJson(e))
              .toList() ??
          [],
      riskScores: RiskScores.fromJson(json['risk_scores'] ?? {}),
      clinicalSummary: json['clinical_summary'] ?? '',
      alerts: (json['alerts'] as List?)?.map((e) => e.toString()).toList() ?? [],
      labTrends: trends,
      antecedents: (json['antecedents'] as Map<String, dynamic>?)?.map(
            (key, value) => MapEntry(key, value as bool),
          ) ??
          {},
    );
  }
}

class Demographics {
  final String name;
  final int age;
  final String sex;

  Demographics({required this.name, required this.age, required this.sex});

  factory Demographics.fromJson(Map<String, dynamic> json) {
    return Demographics(
      name: json['name'] ?? 'Desconocido',
      age: json['age'] ?? 0,
      sex: json['sex'] ?? '?',
    );
  }
}

class Medication {
  final String name;
  final String? dose;
  final String? schedule;
  final String? route;

  Medication({required this.name, this.dose, this.schedule, this.route});

  factory Medication.fromJson(Map<String, dynamic> json) {
    return Medication(
      name: json['name'] ?? '',
      dose: json['dose'],
      schedule: json['schedule'],
      route: json['route'],
    );
  }
}

class LipidManagement {
  final double? ldlCurrent;
  final String riskCategory;
  final double ldlTarget;
  final double reductionNeededPct;
  final String recommendation;

  LipidManagement({
    this.ldlCurrent,
    required this.riskCategory,
    required this.ldlTarget,
    required this.reductionNeededPct,
    required this.recommendation,
  });

  factory LipidManagement.fromJson(Map<String, dynamic> json) {
    return LipidManagement(
      ldlCurrent: (json['ldl_current'] as num?)?.toDouble(),
      riskCategory: json['risk_category'] ?? "Desconocido",
      ldlTarget: (json['ldl_target'] as num? ?? 0).toDouble(),
      reductionNeededPct: (json['reduction_needed_pct'] as num? ?? 0).toDouble(),
      recommendation: json['recommendation'] ?? "",
    );
  }
}

class RiskScores {
  final double? chads2vasc;
  final double? hasBled;
  final double? score2;
  final Map<String, ScoreDetail>? details;
  final LipidManagement? lipidManagement;

  RiskScores({
    this.chads2vasc,
    this.hasBled,
    this.score2,
    this.details,
    this.lipidManagement,
  });

  factory RiskScores.fromJson(Map<String, dynamic> json) {
    Map<String, ScoreDetail>? detailsMap;
    if (json['details'] != null) {
      detailsMap = {};
      (json['details'] as Map<String, dynamic>).forEach((key, value) {
        detailsMap![key] = ScoreDetail.fromJson(value);
      });
    }

    return RiskScores(
      chads2vasc: (json['chads2vasc'] as num?)?.toDouble(),
      hasBled: (json['has_bled'] as num?)?.toDouble(),
      score2: (json['score2'] as num?)?.toDouble(),
      details: detailsMap,
      lipidManagement: json['lipid_management'] != null 
          ? LipidManagement.fromJson(json['lipid_management']) 
          : null,
    );
  }
}

class ScoreDetail {
  final double value;
  final String risk;

  ScoreDetail({required this.value, required this.risk});

  factory ScoreDetail.fromJson(Map<String, dynamic> json) {
    return ScoreDetail(
      value: (json['value'] as num?)?.toDouble() ?? 0.0,
      risk: json['risk'] ?? '',
    );
  }
}
