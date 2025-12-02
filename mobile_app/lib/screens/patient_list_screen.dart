
import 'package:flutter/material.dart';
import '../models/patient.dart';
import '../models/patient_summary.dart';
import '../data/repository.dart';
import '../data/remote_api.dart';
import 'patient_detail_screen.dart';

class PatientListScreen extends StatefulWidget {
  const PatientListScreen({super.key});

  @override
  State<PatientListScreen> createState() => _PatientListScreenState();
}

class _PatientListScreenState extends State<PatientListScreen> {
  final Repository _repository = Repository();
  List<Patient> _patients = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _refreshList();
  }

  Future<void> _refreshList() async {
    setState(() => _isLoading = true);
    try {
      // 1. Intentar cargar del backend
      final summaries = await RemoteApi().getPatients();
      
      // 2. Convertir PatientSummary a Patient (modelo UI)
      final remotePatients = summaries.map((s) => Patient(
        id: s.patientId,
        name: s.demographics.name,
        age: s.demographics.age,
        sex: s.demographics.sex,
        scores: {
          'CHA2DS2-VASc': s.riskScores.chads2vasc,
          'HAS-BLED': s.riskScores.hasBled,
          'SCORE2': s.riskScores.score2,
        }
      )).toList();

      // 3. Actualizar repositorio local y UI
      setState(() {
        _patients = remotePatients;
        _isLoading = false;
      });
      
      // Sincronizar repositorio local (opcional)
      for (var p in remotePatients) {
        _repository.addPatient(p); // Esto podría duplicar si no se limpia, pero para demo está bien
      }
      
    } catch (e) {
      debugPrint("Error cargando pacientes: $e");
      // Fallback a local si falla
      setState(() {
        _patients = _repository.getPatients();
        _isLoading = false;
      });
    }
  }

  void _showAddPatientDialog() {
    final nameController = TextEditingController();
    final ageController = TextEditingController();
    String selectedSex = 'M';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom,
            left: 24,
            right: 24,
            top: 24,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'Nuevo Paciente',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF0F172A),
                ),
              ),
              const SizedBox(height: 24),
              TextField(
                controller: nameController,
                decoration: InputDecoration(
                  labelText: 'Nombre Completo',
                  filled: true,
                  fillColor: Colors.grey[50],
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide.none,
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: ageController,
                      decoration: InputDecoration(
                        labelText: 'Edad',
                        filled: true,
                        fillColor: Colors.grey[50],
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide.none,
                        ),
                      ),
                      keyboardType: TextInputType.number,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      value: selectedSex,
                      items: const [
                        DropdownMenuItem(value: 'M', child: Text('Masculino')),
                        DropdownMenuItem(value: 'F', child: Text('Femenino')),
                      ],
                      onChanged: (val) => selectedSex = val!,
                      decoration: InputDecoration(
                        labelText: 'Sexo',
                        filled: true,
                        fillColor: Colors.grey[50],
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide.none,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 32),
              ElevatedButton(
                onPressed: () async {
                  final name = nameController.text;
                  final age = int.tryParse(ageController.text);
                  final sex = selectedSex;

                  if (name.isNotEmpty && age != null && sex.isNotEmpty) {
                    try {
                      await RemoteApi().createPatient(name, age, sex);
                      if (mounted) {
                        Navigator.pop(context);
                        _refreshList(); // Recargar lista desde el backend
                      }
                    } catch (e) {
                      if (mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text("Error creando paciente: $e")),
                        );
                      }
                    }
                  } else {
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text("Por favor, complete todos los campos.")),
                      );
                    }
                  }
                },
                child: const Text('Guardar Paciente'),
              ),
              const SizedBox(height: 24),
            ],
          ),
        );
      },
    );
  }
  
  Future<void> _confirmDelete(Patient patient) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text("Eliminar Paciente"),
        content: Text("¿Estás seguro de que deseas eliminar a ${patient.name}? Esta acción no se puede deshacer."),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text("Cancelar"),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text("Eliminar"),
          ),
        ],
      ),
    );

    if (confirm == true) {
      try {
        await RemoteApi().deletePatient(patient.id);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text("Paciente eliminado correctamente")),
          );
          _refreshList();
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text("Error al eliminar: $e")),
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: CustomScrollView(
          slivers: [
            SliverAppBar(
              floating: true,
              pinned: true,
              expandedHeight: 120.0,
              flexibleSpace: FlexibleSpaceBar(
                titlePadding: const EdgeInsets.only(left: 24, bottom: 16),
                title: const Text(
                  'Mis Pacientes',
                  style: TextStyle(
                    color: Color(0xFF0F172A),
                    fontWeight: FontWeight.bold,
                  ),
                ),
                background: Container(color: const Color(0xFFF8FAFC)),
              ),
            ),
            SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              sliver: SliverList(
                delegate: SliverChildBuilderDelegate(
                  (context, index) {
                    final patient = _patients[index];
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 16),
                      child: _PatientCard(
                        patient: patient,
                        onTap: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) =>
                                  PatientDetailScreen(patient: patient),
                            ),
                          ).then((_) => _refreshList());
                        },
                        onDelete: () => _confirmDelete(patient),
                      ),
                    );
                  },
                  childCount: _patients.length,
                ),
              ),
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showAddPatientDialog,
        label: const Text("Nuevo Paciente"),
        icon: const Icon(Icons.add),
      ),
    );
  }
}

class _PatientCard extends StatelessWidget {
  final Patient patient;
  final VoidCallback onTap;
  final VoidCallback onDelete; // Nuevo callback

  const _PatientCard({
    required this.patient,
    required this.onTap,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: Colors.blue.withOpacity(0.05),
              blurRadius: 20,
              offset: const Offset(0, 4),
            ),
          ],
          border: Border.all(color: Colors.grey.withOpacity(0.1)),
        ),
        child: Row(
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [Colors.blue.shade400, Colors.blue.shade600],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Center(
                child: Text(
                  patient.name.isNotEmpty ? patient.name[0].toUpperCase() : '?',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    patient.name,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF0F172A),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Icon(Icons.cake_outlined,
                          size: 14, color: Colors.grey[500]),
                      const SizedBox(width: 4),
                      Text(
                        "${patient.age} años",
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.grey[500],
                        ),
                      ),
                      const SizedBox(width: 12),
                      Icon(
                          patient.sex == 'M'
                              ? Icons.male
                              : Icons.female,
                          size: 14,
                          color: Colors.grey[500]),
                      const SizedBox(width: 4),
                      Text(
                        patient.sex == 'M' ? "Masculino" : "Femenino",
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.grey[500],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            IconButton(
              icon: const Icon(Icons.delete_outline, color: Colors.red),
              onPressed: onDelete,
            ),
            const SizedBox(width: 8),
            Icon(Icons.chevron_right, color: Colors.grey[300]),
          ],
        ),
      ),
    );
  }
}
