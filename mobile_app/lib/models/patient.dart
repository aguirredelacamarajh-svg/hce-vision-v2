class Patient {
  final String id;
  final String name;
  final int age;
  final String sex; // 'M' o 'F'
  final DateTime? lastUpdate;
  final Map<String, dynamic>? scores;
  final Map<String, bool>? antecedents; // Nuevo campo

  Patient({
    required this.id,
    required this.name,
    required this.age,
    required this.sex,
    this.lastUpdate,
    this.scores,
    this.antecedents,
  });

  factory Patient.fromJson(Map<String, dynamic> json) {
    return Patient(
      id: json['id'],
      name: json['name'],
      age: json['age'],
      sex: json['sex'],
      lastUpdate: json['last_update'] != null ? DateTime.parse(json['last_update']) : null,
      scores: json['scores'] != null ? Map<String, dynamic>.from(json['scores']) : null,
      antecedents: json['antecedents'] != null ? Map<String, bool>.from(json['antecedents']) : null,
    );
  }

  Patient copyWith({
    String? id,
    String? name,
    int? age,
    String? sex,
    DateTime? lastUpdate,
    Map<String, dynamic>? scores,
    Map<String, bool>? antecedents,
  }) {
    return Patient(
      id: id ?? this.id,
      name: name ?? this.name,
      age: age ?? this.age,
      sex: sex ?? this.sex,
      lastUpdate: lastUpdate ?? this.lastUpdate,
      scores: scores ?? this.scores,
      antecedents: antecedents ?? this.antecedents,
    );
  }

  // Convenience helper to update only scores (para compatibilidad con usos existentes)
  Patient copyWithScores(Map<String, dynamic>? newScores) {
    return copyWith(scores: newScores);
  }
}
