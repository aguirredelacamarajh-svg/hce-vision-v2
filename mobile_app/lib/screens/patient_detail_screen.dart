import 'package:flutter/material.dart';
import '../models/patient.dart';
import '../models/clinical_event.dart';
import '../models/patient_summary.dart';
import '../data/repository.dart';
import '../data/remote_api.dart';
import 'add_event_screen.dart';
import 'scores_screen.dart';
import '../widgets/risk_score_card.dart';
import '../widgets/lab_trend_chart.dart';
import '../widgets/timeline_event_card.dart';

import 'package:image_picker/image_picker.dart';
import 'review_analysis_screen.dart';

class PatientDetailScreen extends StatefulWidget {
  final Patient? patient;
  final String? patientId;
  final String? patientName;

  const PatientDetailScreen({
    super.key, 
    this.patient,
    this.patientId,
    this.patientName,
  }) : assert(patient != null || (patientId != null && patientName != null));

  @override
  State<PatientDetailScreen> createState() => _PatientDetailScreenState();
}

class _PatientDetailScreenState extends State<PatientDetailScreen> {
  final Repository _repository = Repository();
  late Patient _patient;
  List<ClinicalEvent> _events = [];
  PatientSummary? _summary;
  bool _isLoadingSummary = false;
  bool _isAnalyzing = false;

  @override
  void initState() {
    super.initState();
    if (widget.patient != null) {
      _patient = widget.patient!;
    } else {
      // Create temp patient for UI until data loads
      _patient = Patient(
        id: widget.patientId!,
        name: widget.patientName!,
        age: 0, // Placeholder
        sex: 'M', // Placeholder
      );
    }
    _refreshData();
  }

  Future<void> _refreshData() async {
    setState(() {
      _isLoadingSummary = true;
    });

    try {
      // 1. Cargar Summary del backend (fuente de verdad)
      final summary = await RemoteApi().getPatientSummary(_patient.id);
      
      // 2. Actualizar modelo local _patient con datos frescos
      final updatedPatient = Patient(
        id: summary.patientId,
        name: summary.demographics.name,
        age: summary.demographics.age,
        sex: summary.demographics.sex,
        scores: {
          'CHA2DS2-VASc': summary.riskScores.chads2vasc,
          'HAS-BLED': summary.riskScores.hasBled,
          'SCORE2': summary.riskScores.score2,
        }
      );

      setState(() {
        _summary = summary;
        _patient = updatedPatient;
        _isLoadingSummary = false;
      });
      
    } catch (e) {
      print("Error cargando datos: $e");
      setState(() => _isLoadingSummary = false);
    }
  }

  Future<void> _pickImage() async {
    showModalBottomSheet(
      context: context,
      builder: (BuildContext context) {
        return SafeArea(
          child: Wrap(
            children: <Widget>[
              ListTile(
                leading: const Icon(Icons.photo_library),
                title: const Text('Galería'),
                onTap: () {
                  Navigator.of(context).pop();
                  _processImage(ImageSource.gallery);
                },
              ),
              ListTile(
                leading: const Icon(Icons.camera_alt),
                title: const Text('Cámara'),
                onTap: () {
                  Navigator.of(context).pop();
                  _processImage(ImageSource.camera);
                },
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildStrategyRow(String label, String value, {bool isBold = false, Color? color}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(color: Colors.grey[600])),
          Text(
            value,
            style: TextStyle(
              fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
              color: color ?? const Color(0xFF1A1C24),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _processImage(ImageSource source) async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(source: source);

    if (pickedFile != null) {
      setState(() => _isAnalyzing = true);
      
      try {
        // 1. Enviar imagen y obtener datos propuestos
        final extractedData = await RemoteApi().extractData(_patient.id, pickedFile);
        
        if (!mounted) return;

        // 2. Mostrar pantalla de confirmación
        final result = await Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => ReviewAnalysisScreen(
              patientId: _patient.id,
              extractedData: extractedData,
            ),
          ),
        );

        // 3. Si se confirmó, recargar datos
        if (result == true) {
          _refreshData();
        }
        
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Error analizando imagen: $e')),
          );
        }
      } finally {
        if (mounted) {
          setState(() => _isAnalyzing = false);
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final displayEvents = _summary?.timeline ?? _events;
    final hasAlerts = _summary?.alerts.isNotEmpty ?? false;

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FE), // Fondo gris muy suave
      appBar: AppBar(
        elevation: 0,
        backgroundColor: Colors.white,
        foregroundColor: Colors.black87,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              _patient.name,
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 20),
            ),
            Text(
              "${_patient.age} años, ${_patient.sex == 'M' ? 'Masculino' : 'Femenino'}",
              style: TextStyle(fontSize: 12, color: Colors.grey[500]),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.analytics_outlined),
            tooltip: 'Calculadora Manual',
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => ScoresScreen(patient: _patient),
                ),
              );
            },
          ),
          IconButton(
            icon: _isAnalyzing
                ? const SizedBox(
                    width: 24,
                    height: 24,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.camera_alt_outlined),
            tooltip: 'Analizar Documento',
            onPressed: _isAnalyzing ? null : _pickImage,
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _refreshData,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.only(bottom: 100),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. ALERTAS
              if (hasAlerts)
                Container(
                  width: double.infinity,
                  margin: const EdgeInsets.all(16),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFF4F4),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFFFE0E0)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.warning_amber_rounded,
                              color: Colors.red[700]),
                          const SizedBox(width: 8),
                          Text(
                            "Atención Requerida",
                            style: TextStyle(
                              color: Colors.red[900],
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      ..._summary!.alerts.map((a) => Padding(
                            padding: const EdgeInsets.only(bottom: 4),
                            child: Text("• $a",
                                style: TextStyle(color: Colors.red[800])),
                          )),
                    ],
                  ),
                ),

              // 2. DASHBOARD DE RIESGO
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      "Perfil de Riesgo",
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF1A1C24),
                      ),
                    ),
                    const SizedBox(height: 12),
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      clipBehavior: Clip.none,
                      child: Row(
                        children: [
                          if (_summary?.riskScores.chads2vasc != null)
                            Padding(
                              padding: const EdgeInsets.only(right: 12),
                              child: RiskScoreCard(
                                title: "CHA₂DS₂-VASc",
                                score: _summary!.riskScores.chads2vasc!.toDouble(),
                                riskLabel: _summary!.riskScores.details?['CHA2DS2-VASc']?.risk ?? "Pendiente",
                                color: Colors.blue,
                              ),
                            ),
                          if (_summary?.riskScores.hasBled != null)
                            Padding(
                              padding: const EdgeInsets.only(right: 12),
                              child: RiskScoreCard(
                                title: "HAS-BLED",
                                score: _summary!.riskScores.hasBled!.toDouble(),
                                riskLabel: _summary!.riskScores.details?['HAS-BLED']?.risk ?? "Pendiente",
                                color: Colors.orange,
                              ),
                            ),
                          if (_summary?.riskScores.score2 != null)
                            Padding(
                              padding: const EdgeInsets.only(right: 12),
                              child: RiskScoreCard(
                                title: "SCORE2 (10y)",
                                score: _summary!.riskScores.score2!.toDouble(),
                                riskLabel: _summary!.riskScores.details?['SCORE2']?.risk ?? "Pendiente",
                                color: Colors.purple,
                              ),
                            ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // 2.5 MANEJO DE LÍPIDOS
              if (_summary?.riskScores.lipidManagement != null)
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        "Manejo de Lípidos (LDL)",
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF1A1C24),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.blue.shade100),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.blue.withOpacity(0.05),
                              blurRadius: 10,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      "LDL Actual",
                                      style: TextStyle(color: Colors.grey[600], fontSize: 12),
                                    ),
                                    Text(
                                      "${_summary!.riskScores.lipidManagement!.ldlCurrent!.toInt()} mg/dL",
                                      style: const TextStyle(
                                        fontSize: 24,
                                        fontWeight: FontWeight.bold,
                                        color: Colors.blue,
                                      ),
                                    ),
                                  ],
                                ),
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    Text(
                                      "Meta Objetivo",
                                      style: TextStyle(color: Colors.grey[600], fontSize: 12),
                                    ),
                                    Text(
                                      "< ${_summary!.riskScores.lipidManagement!.ldlTarget.toInt()} mg/dL",
                                      style: TextStyle(
                                        fontSize: 24,
                                        fontWeight: FontWeight.bold,
                                        color: Colors.green[700],
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                            const Divider(height: 24),
                            Text(
                              "Riesgo: ${_summary!.riskScores.lipidManagement!.riskCategory}",
                              style: const TextStyle(fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              "Recomendación: ${_summary!.riskScores.lipidManagement!.recommendation}",
                              style: TextStyle(color: Colors.grey[800]),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),

              const SizedBox(height: 24),

              // 2.8 FACTORES DE RIESGO ACTIVOS (NUEVO)
              if (_summary?.antecedents.isNotEmpty == true)
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        "Factores de Riesgo",
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF1A1C24),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: _summary!.antecedents.entries
                            .where((e) => e.value == true)
                            .map((e) {
                          String label = e.key;
                          // Traducción rápida visual
                          switch (e.key) {
                            case 'hta': label = 'Hipertensión'; break;
                            case 'diabetes': label = 'Diabetes'; break;
                            case 'smoking': label = 'Tabaquismo'; break;
                            case 'obesity': label = 'Obesidad'; break;
                            case 'sedentary': label = 'Sedentarismo'; break;
                            case 'dyslipidemia': label = 'Dislipidemia'; break;
                            case 'atrial_fibrillation': label = 'Fibrilación Auricular'; break;
                            case 'heart_failure': label = 'Insuficiencia Cardíaca'; break;
                            case 'stroke': label = 'ACV Previo'; break;
                            case 'acs_history': label = 'Infarto Previo'; break;
                            case 'vascular_disease': label = 'Enfermedad Vascular'; break;
                            case 'renal_disease': label = 'Enfermedad Renal'; break;
                            case 'liver_disease': label = 'Enfermedad Hepática'; break;
                            case 'bleeding_history': label = 'Historia de Sangrado'; break;
                            case 'labile_inr': label = 'INR Lábil'; break;
                            case 'alcohol_drugs': label = 'Alcohol / Drogas'; break;
                          }
                          return Chip(
                            label: Text(label),
                            backgroundColor: Colors.red.shade50,
                            labelStyle: TextStyle(color: Colors.red.shade700, fontWeight: FontWeight.bold),
                            avatar: const Icon(Icons.warning_amber_rounded, size: 16, color: Colors.red),
                          );
                        }).toList(),
                      ),
                    ],
                  ),
                ),

              const SizedBox(height: 24),

              // 2.9 TENDENCIAS DE LABORATORIO (NUEVO)
              if (_summary?.labTrends.isNotEmpty == true)
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        "Tendencias de Laboratorio",
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF1A1C24),
                        ),
                      ),
                      const SizedBox(height: 12),
                      ..._summary!.labTrends.entries.map((entry) {
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 16.0),
                          child: LabTrendChart(
                            title: entry.key.toUpperCase(),
                            values: entry.value.map((e) => e.value).toList(),
                            dates: entry.value.map((e) => e.date).toList(),
                            color: entry.key == 'ldl' ? Colors.orange : Colors.blue,
                            targetValue: entry.key == 'ldl' 
                                ? _summary!.riskScores.lipidManagement?.ldlTarget 
                                : null,
                            unit: entry.value.isNotEmpty ? entry.value.last.unit : "",
                          ),
                        );
                      }).toList(),
                    ],
                  ),
                ),

              const SizedBox(height: 24),

              // 3. LÍNEA DE TIEMPO CLÍNICA

              const SizedBox(height: 24),

              // 3. MEDICACIONES
              if (_summary?.medications.isNotEmpty ?? false)
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        "Medicaciones Activas",
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF1A1C24),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Container(
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.grey.shade200),
                        ),
                        child: Column(
                          children: _summary!.medications.map((m) {
                            return ListTile(
                              leading: Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: Colors.teal.shade50,
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Icon(Icons.medication_outlined,
                                    color: Colors.teal.shade700, size: 20),
                              ),
                              title: Text(m.name,
                                  style: const TextStyle(fontWeight: FontWeight.w600)),
                              subtitle: Text(m.dose ?? 'Dosis no especificada'),
                              trailing: const Icon(Icons.chevron_right, color: Colors.grey),
                            );
                          }).toList(),
                        ),
                      ),
                    ],
                  ),
                ),

              const SizedBox(height: 24),

              // 4. HISTORIA CLÍNICA (TIMELINE)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      "Historia Clínica",
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF1A1C24),
                      ),
                    ),
                    const SizedBox(height: 16),
                    if (displayEvents.isEmpty)
                      Container(
                        padding: const EdgeInsets.all(32),
                        alignment: Alignment.center,
                        child: Column(
                          children: [
                            Icon(Icons.history_edu,
                                size: 48, color: Colors.grey[300]),
                            const SizedBox(height: 16),
                            Text(
                              "Aún no hay eventos registrados",
                              style: TextStyle(color: Colors.grey[500]),
                            ),
                          ],
                        ),
                      )
                    else
                      ListView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: displayEvents.length,
                        itemBuilder: (context, index) {
                          return TimelineEventCard(
                            event: displayEvents[index],
                            isFirst: index == 0,
                            isLast: index == displayEvents.length - 1,
                          );
                        },
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => AddEventScreen(patientId: _patient.id),
            ),
          ).then((_) => _refreshData());
        },
        backgroundColor: const Color(0xFF2563EB), // Azul vibrante
        label: const Text("Nuevo Evento"),
        icon: const Icon(Icons.add_a_photo_outlined),
      ),
    );
  }
}

