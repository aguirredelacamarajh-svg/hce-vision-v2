import 'package:flutter/material.dart';
import '../models/extraction_models.dart';
import '../models/clinical_event.dart';
import '../models/patient_summary.dart'; // For RiskScores if needed visually
import '../data/remote_api.dart';
import '../data/repository.dart';

class ReviewAnalysisScreen extends StatefulWidget {
  final String patientId;
  final ExtractedData extractedData;

  const ReviewAnalysisScreen({
    super.key,
    required this.patientId,
    required this.extractedData,
  });

  @override
  State<ReviewAnalysisScreen> createState() => _ReviewAnalysisScreenState();
}

class _ReviewAnalysisScreenState extends State<ReviewAnalysisScreen> {
  late TextEditingController _titleController;
  late TextEditingController _descriptionController;
  late DateTime _selectedDate;
  late EventType _selectedType;
  late List<String> _medications;
  late Map<String, bool> _antecedents;

  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    final event = widget.extractedData.event;
    _titleController = TextEditingController(text: event.title);
    _descriptionController = TextEditingController(text: event.description);
    _selectedDate = event.date;
    _selectedType = event.type;
    _medications = List.from(widget.extractedData.medications);
    _antecedents = Map.from(widget.extractedData.antecedents);
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _isSaving = true);

    try {
      // Reconstruct the event with edited data
      final updatedEvent = ClinicalEvent(
        id: widget.extractedData.event.id, // Keep temp ID, backend will fix
        patientId: widget.patientId,
        date: _selectedDate,
        type: _selectedType,
        title: _titleController.text,
        description: _descriptionController.text,
        imagePath: widget.extractedData.event.imagePath,
        labs: widget.extractedData.event.labs, // NO OLVIDAR ESTO
      );

      final request = SubmitAnalysisRequest(
        patientId: widget.patientId,
        event: updatedEvent,
        medications: _medications,
        antecedents: _antecedents,
        historicalData: widget.extractedData.historicalData, // PASAR DATOS HISTÓRICOS
      );

      final summary = await RemoteApi().submitAnalysis(request);

      // Update local repo for offline/immediate consistency if needed
      if (summary.timeline.isNotEmpty) {
        Repository().addEvent(summary.timeline.first);
      }
      
      // Update local patient scores
      final patients = Repository().getPatients();
      final index = patients.indexWhere((p) => p.id == widget.patientId);
      if (index != -1) {
         final scoresMap = {
          'CHA2DS2-VASc': summary.riskScores.chads2vasc,
          'HAS-BLED': summary.riskScores.hasBled,
          'SCORE2': summary.riskScores.score2,
        };
        Repository().updatePatient(patients[index].copyWithScores(scoresMap));
      }

      if (!mounted) return;
      
      // Pop back to PatientDetailScreen (pop Review, then pop AddEvent)
      Navigator.pop(context); // Pop Review
      Navigator.pop(context, true); // Pop AddEvent with success
      
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Análisis confirmado y guardado")),
      );

    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Error al guardar: $e")),
      );
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Revisar Análisis IA"),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildSectionTitle("Detalles del Evento"),
            const SizedBox(height: 16),
            TextField(
              controller: _titleController,
              decoration: const InputDecoration(
                labelText: "Título",
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<EventType>(
              value: _selectedType,
              decoration: const InputDecoration(labelText: "Tipo", border: OutlineInputBorder()),
              items: EventType.values.map((e) => DropdownMenuItem(value: e, child: Text(e.name.toUpperCase()))).toList(),
              onChanged: (val) => setState(() => _selectedType = val!),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _descriptionController,
              maxLines: 3,
              decoration: const InputDecoration(
                labelText: "Resumen / Hallazgos",
                border: OutlineInputBorder(),
              ),
            ),
            
            const SizedBox(height: 24),
            _buildSectionTitle("Medicaciones Detectadas"),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              children: _medications.map((med) => Chip(
                label: Text(med),
                onDeleted: () => setState(() => _medications.remove(med)),
                backgroundColor: Colors.blue.shade50,
                labelStyle: const TextStyle(color: Colors.blue),
                deleteIconColor: Colors.blue,
              )).toList(),
            ),
            const SizedBox(height: 8),
            OutlinedButton.icon(
              onPressed: _showAddMedicationDialog,
              icon: const Icon(Icons.add),
              label: const Text("Agregar Medicación"),
            ),
            
            const SizedBox(height: 24),
            _buildSectionTitle("Antecedentes (para Scores)"),
            const SizedBox(height: 8),
            Card(
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
                side: BorderSide(color: Colors.grey.shade200),
              ),
              child: Column(
                children: _antecedents.entries.map((entry) {
                  return CheckboxListTile(
                    title: Text(_formatAntecedentKey(entry.key)),
                    value: entry.value,
                    onChanged: (val) => setState(() => _antecedents[entry.key] = val!),
                    dense: true,
                    activeColor: const Color(0xFF2563EB),
                  );
                }).toList(),
              ),
            ),
            const SizedBox(height: 80), // Space for FAB
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _isSaving ? null : _submit,
        backgroundColor: const Color(0xFF2563EB),
        icon: _isSaving 
          ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
          : const Icon(Icons.check),
        label: Text(_isSaving ? "GUARDANDO..." : "CONFIRMAR Y GUARDAR"),
      ),
    );
  }

  void _showAddMedicationDialog() {
    final controller = TextEditingController();
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text("Agregar Medicación"),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(hintText: "Nombre del medicamento"),
          autofocus: true,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text("Cancelar"),
          ),
          ElevatedButton(
            onPressed: () {
              if (controller.text.isNotEmpty) {
                setState(() {
                  _medications.add(controller.text);
                });
                Navigator.pop(context);
              }
            },
            child: const Text("Agregar"),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(
      title,
      style: const TextStyle(
        fontSize: 18,
        fontWeight: FontWeight.bold,
        color: Color(0xFF1E40AF),
      ),
    );
  }

  String _formatAntecedentKey(String key) {
    switch (key) {
      case 'hta': return 'Hipertensión Arterial';
      case 'diabetes': return 'Diabetes';
      case 'heart_failure': return 'Insuficiencia Cardíaca';
      case 'atrial_fibrillation': return 'Fibrilación Auricular';
      case 'acs_history': return 'SCA / Infarto Previo';
      case 'stroke': return 'ACV Previo';
      case 'vascular_disease': return 'Enfermedad Vascular';
      case 'renal_disease': return 'Enfermedad Renal';
      case 'liver_disease': return 'Enfermedad Hepática';
      case 'bleeding_history': return 'Historia de Sangrado';
      case 'labile_inr': return 'INR Lábil';
      case 'alcohol_drugs': return 'Alcohol / Drogas';
      case 'smoking': return 'Tabaquismo';
      case 'obesity': return 'Obesidad';
      case 'sedentary': return 'Sedentarismo';
      case 'dyslipidemia': return 'Dislipidemia';
      default: return key;
    }
  }
}
