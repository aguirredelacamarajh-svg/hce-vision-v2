import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../data/repository.dart';
import '../data/remote_api.dart';
import '../models/clinical_event.dart';
import 'review_analysis_screen.dart';

class AddEventScreen extends StatefulWidget {
  final String patientId;

  const AddEventScreen({
    Key? key,
    required this.patientId,
  }) : super(key: key);

  @override
  State<AddEventScreen> createState() => _AddEventScreenState();
}

class _AddEventScreenState extends State<AddEventScreen> {
  DateTime _selectedDate = DateTime.now();
  EventType _selectedType = EventType.laboratorio;
  final TextEditingController _descriptionController = TextEditingController();

  bool _isAnalyzing = false;
  XFile? _pickedImage;

  @override
  void dispose() {
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime(2000),
      lastDate: DateTime(2100),
    );

    if (picked != null) {
      setState(() {
        _selectedDate = picked;
      });
    }
  }

  Future<ImageSource?> _chooseImageSource() async {
    return showDialog<ImageSource>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text("Escanear Documento"),
        content: const Text(
          "Elige una opción para analizar el documento con IA.",
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, ImageSource.camera),
            child: const Text("Cámara"),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, ImageSource.gallery),
            child: const Text("Galería"),
          ),
        ],
      ),
    );
  }

  Future<void> _scanWithAI() async {
    final source = await _chooseImageSource();
    if (source == null) return;

    final picker = ImagePicker();
    final image = await picker.pickImage(source: source);
    if (image == null) return;

    setState(() {
      _isAnalyzing = true;
      _pickedImage = image;
    });
    debugPrint('Iniciando escaneo con IA para paciente ${widget.patientId}');

    try {
      // 1. Extraer datos (sin guardar)
      final extractedData =
          await RemoteApi().extractData(widget.patientId, image);

      if (!mounted) return;

      // 2. Navegar a pantalla de revisión
      final result = await Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => ReviewAnalysisScreen(
            patientId: widget.patientId,
            extractedData: extractedData,
          ),
        ),
      );

      // Si result es true, es que se guardó exitosamente en la pantalla de revisión
      if (result == true) {
        Navigator.pop(context); // Cerrar AddEventScreen
      }
    } catch (e) {
      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text("Error al analizar: $e"),
        ),
      );
    } finally {
      if (mounted) {
        setState(() {
          _isAnalyzing = false;
        });
      }
    }
  }

  void _saveManualEvent() {
    if (_descriptionController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("Por favor ingresa una descripción"),
        ),
      );
      return;
    }

    final newEvent = ClinicalEvent(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      patientId: widget.patientId,
      date: _selectedDate,
      type: _selectedType,
      title: _selectedType.name.toUpperCase(),
      description: _descriptionController.text.trim(),
    );

    Repository().addEvent(newEvent);
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Nuevo Evento")),
      body: Stack(
        children: [
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: ListView(
              children: [
                // BOTÓN IA
                ElevatedButton.icon(
                  onPressed: _isAnalyzing ? null : _scanWithAI,
                  icon: const Icon(Icons.auto_awesome),
                  label:
                      const Text("ESCANEAR CON IA (FOTO/GALERÍA)"),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.purple.shade100,
                    foregroundColor: Colors.purple.shade900,
                    minimumSize: const Size(double.infinity, 50),
                  ),
                ),
                const SizedBox(height: 24),
                const Text(
                  "O agregar manualmente:",
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: Colors.grey,
                  ),
                ),
                const Divider(),

                // Fecha
                ListTile(
                  title: Text(
                    "Fecha: ${_selectedDate.day}/${_selectedDate.month}/${_selectedDate.year}",
                  ),
                  trailing: const Icon(Icons.calendar_today),
                  onTap: _pickDate,
                ),
                const Divider(),

                // Tipo de evento
                DropdownButtonFormField<EventType>(
                  decoration: const InputDecoration(
                    labelText: "Tipo de Documento",
                  ),
                  value: _selectedType,
                  items: EventType.values.map((type) {
                    return DropdownMenuItem(
                      value: type,
                      child: Text(type.name.toUpperCase()),
                    );
                  }).toList(),
                  onChanged: (val) {
                    if (val != null) {
                      setState(() {
                        _selectedType = val;
                      });
                    }
                  },
                ),
                const SizedBox(height: 16),

                // Descripción
                TextField(
                  controller: _descriptionController,
                  maxLines: 4,
                  decoration: const InputDecoration(
                    labelText: "Descripción",
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 16),

                // Indicador de foto (si se quiere mostrar algo)
                if (_pickedImage != null)
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade200,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      children: const [
                        Icon(
                          Icons.check_circle,
                          color: Colors.green,
                          size: 24,
                        ),
                        SizedBox(width: 8),
                        Text("Foto adjunta (simulada / último escaneo)"),
                      ],
                    ),
                  ),

                const SizedBox(height: 24),

                // Guardar manual
                ElevatedButton(
                  onPressed: _isAnalyzing ? null : _saveManualEvent,
                  style: ElevatedButton.styleFrom(
                    minimumSize: const Size(double.infinity, 50),
                  ),
                  child: const Text("Guardar Evento Manual"),
                ),
              ],
            ),
          ),

          // Overlay de carga al analizar con IA
          if (_isAnalyzing)
            Container(
              color: Colors.black54,
              child: const Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    CircularProgressIndicator(),
                    SizedBox(height: 16),
                    Text(
                      "Analizando documento...",
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}