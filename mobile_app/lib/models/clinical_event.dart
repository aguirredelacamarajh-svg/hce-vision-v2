enum EventType {
  laboratorio,
  imagen,
  medicacion,
  epicrisis,
  procedimiento,
  consulta,
  otro,
}

class ClinicalEvent {
  final String id;
  final String patientId;
  final DateTime date;
  final EventType type;
  final String title;
  final String description;
  final String? imagePath;
  final Map<String, dynamic>? labs; // Nuevo campo

  ClinicalEvent({
    required this.id,
    required this.patientId,
    required this.date,
    required this.type,
    required this.title,
    required this.description,
    this.imagePath,
    this.labs,
  });

  factory ClinicalEvent.fromJson(Map<String, dynamic> json, {String? patientId}) {
    return ClinicalEvent(
      id: json['id'] ?? DateTime.now().millisecondsSinceEpoch.toString(),
      patientId: patientId ?? json['patient_id'] ?? '',
      date: DateTime.tryParse(json['date'] ?? '') ?? DateTime.now(),
      type: _parseEventType(json['type']),
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      imagePath: null,
      labs: json['labs'] != null ? Map<String, dynamic>.from(json['labs']) : null,
    );
  }
  
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'patient_id': patientId,
      'date': date.toIso8601String().split('T')[0],
      'type': type.name,
      'title': title,
      'description': description,
      'labs': labs,
    };
  }

  static EventType _parseEventType(String? type) {
    if (type == null) return EventType.otro;
    try {
      return EventType.values.firstWhere(
        (e) => e.name.toLowerCase() == type.toLowerCase(),
      );
    } catch (_) {
      return EventType.otro;
    }
  }
}
