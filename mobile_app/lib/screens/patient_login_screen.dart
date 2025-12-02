import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../data/remote_api.dart';
import 'patient_detail_screen.dart';

class PatientLoginScreen extends StatefulWidget {
  const PatientLoginScreen({super.key});

  @override
  State<PatientLoginScreen> createState() => _PatientLoginScreenState();
}

class _PatientLoginScreenState extends State<PatientLoginScreen> {
  final _nameController = TextEditingController();
  final _ageController = TextEditingController();
  String _selectedSex = 'M';
  bool _isLoading = false;

  Future<void> _register() async {
    if (_nameController.text.isEmpty || _ageController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Por favor completa todos los campos")),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      // 1. Crear el paciente en el backend
      // NOTA: En una app real, aquí guardaríamos el ID en el teléfono para no pedirlo siempre.
      // Por ahora, creamos uno nuevo cada vez para la demo.
      final newSummary = await RemoteApi().createPatientAndReturn(
        _nameController.text,
        int.parse(_ageController.text),
        _selectedSex,
      );

      // 2. Guardar sesión localmente (Lista de perfiles)
      final prefs = await SharedPreferences.getInstance();
      final String? profilesJson = prefs.getString('saved_profiles');
      List<dynamic> profiles = profilesJson != null ? jsonDecode(profilesJson) : [];

      // Remover si ya existe para ponerlo al principio (actualizar)
      profiles.removeWhere((p) => p['id'] == newSummary.patientId);
      
      // Agregar al inicio
      profiles.insert(0, {
        'id': newSummary.patientId,
        'name': newSummary.demographics.name,
      });

      await prefs.setString('saved_profiles', jsonEncode(profiles));

      if (!mounted) return;

      // 3. Ir a la pantalla de detalle (Mi Historia)
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (context) => PatientDetailScreen(
            patientId: newSummary.patientId,
            patientName: newSummary.demographics.name,
          ),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Error al registrar: $e")),
      );
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Soy Paciente")),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              "Bienvenido",
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            const Text(
              "Ingresa tus datos para acceder a tu historia clínica personal.",
              style: TextStyle(color: Colors.grey),
            ),
            const SizedBox(height: 32),
            TextField(
              controller: _nameController,
              decoration: const InputDecoration(
                labelText: "Nombre Completo",
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.person),
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _ageController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: "Edad",
                      border: OutlineInputBorder(),
                      prefixIcon: Icon(Icons.calendar_today),
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: DropdownButtonFormField<String>(
                    value: _selectedSex,
                    decoration: const InputDecoration(
                      labelText: "Sexo",
                      border: OutlineInputBorder(),
                    ),
                    items: const [
                      DropdownMenuItem(value: 'M', child: Text("Masculino")),
                      DropdownMenuItem(value: 'F', child: Text("Femenino")),
                    ],
                    onChanged: (val) => setState(() => _selectedSex = val!),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 32),
            ElevatedButton(
              onPressed: _isLoading ? null : _register,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF059669),
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: _isLoading
                  ? const CircularProgressIndicator(color: Colors.white)
                  : const Text(
                      "CREAR MI PERFIL",
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
