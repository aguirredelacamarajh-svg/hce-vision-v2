
class ScoreCalculator {
  
  // --- CHA2DS2-VASc ---
  // Riesgo de ACV en Fibrilación Auricular
  static Map<String, dynamic> calculateCha2ds2Vasc({
    required bool heartFailure, // Insuficiencia Cardíaca
    required bool hypertension, // Hipertensión
    required int age,           // Edad
    required bool diabetes,     // Diabetes
    required bool stroke,       // ACV/AIT previo
    required bool vascularDisease, // Enf. Vascular (IAM, EAP)
    required String sex,        // 'M' o 'F'
  }) {
    int score = 0;

    if (heartFailure) score += 1;
    if (hypertension) score += 1;
    if (age >= 75) {
      score += 2;
    } else if (age >= 65) {
      score += 1;
    }
    if (diabetes) score += 1;
    if (stroke) score += 2;
    if (vascularDisease) score += 1;
    if (sex == 'F') score += 1;

    String interpretation;
    if (score == 0) {
      interpretation = "Bajo Riesgo (0)";
    } else if (score == 1) {
      interpretation = "Riesgo Moderado (1)";
    } else {
      interpretation = "Alto Riesgo ($score) - Considerar Anticoagulación";
    }

    return {'score': score, 'interpretation': interpretation};
  }

  // --- HAS-BLED ---
  // Riesgo de Sangrado
  static Map<String, dynamic> calculateHasBled({
    required bool hypertension, // H: Hipertensión no controlada
    required bool renalDisease, // A: Función renal alterada
    required bool liverDisease, // A: Función hepática alterada
    required bool strokeHistory,// S: ACV previo
    required bool bleedingHistory, // B: Sangrado previo
    required bool labileInr,    // L: INR lábil
    required bool elderly,      // E: Edad > 65
    required bool drugsOrAlcohol, // D: Drogas o Alcohol
  }) {
    int score = 0;

    if (hypertension) score += 1;
    if (renalDisease) score += 1;
    if (liverDisease) score += 1;
    if (strokeHistory) score += 1;
    if (bleedingHistory) score += 1;
    if (labileInr) score += 1;
    if (elderly) score += 1;
    if (drugsOrAlcohol) score += 1;

    String interpretation;
    if (score >= 3) {
      interpretation = "Alto Riesgo de Sangrado ($score)";
    } else {
      interpretation = "Bajo/Moderado Riesgo ($score)";
    }

    return {'score': score, 'interpretation': interpretation};
  }
}
