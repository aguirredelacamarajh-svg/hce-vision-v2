import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'patient_list_screen.dart';
import 'patient_login_screen.dart';
import 'patient_detail_screen.dart';

class RoleSelectionScreen extends StatefulWidget {
  const RoleSelectionScreen({super.key});

  @override
  State<RoleSelectionScreen> createState() => _RoleSelectionScreenState();
}

class _RoleSelectionScreenState extends State<RoleSelectionScreen> {
  List<Map<String, dynamic>> _savedProfiles = [];

  @override
  void initState() {
    super.initState();
    _checkLastSession();
  }

  Future<void> _checkLastSession() async {
    final prefs = await SharedPreferences.getInstance();
    final String? profilesJson = prefs.getString('saved_profiles');
    if (profilesJson != null) {
      setState(() {
        _savedProfiles = List<Map<String, dynamic>>.from(jsonDecode(profilesJson));
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
              const Icon(
                Icons.health_and_safety,
                size: 80,
                color: Color(0xFF2563EB),
              ),
              const SizedBox(height: 24),
              const Text(
                "HCE Vision",
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 32,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF1E293B),
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                "Tu historia clínica inteligente",
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 16,
                  color: Color(0xFF64748B),
                ),
              ),
              const SizedBox(height: 40),
              
              if (_savedProfiles.isNotEmpty) ...[
                const Text(
                  "Acceso Rápido",
                  style: TextStyle(
                    fontSize: 14, 
                    fontWeight: FontWeight.bold, 
                    color: Colors.grey
                  ),
                ),
                const SizedBox(height: 12),
                Container(
                  constraints: const BoxConstraints(maxHeight: 200),
                  child: ListView.separated(
                    shrinkWrap: true,
                    itemCount: _savedProfiles.length,
                    separatorBuilder: (ctx, i) => const SizedBox(height: 12),
                    itemBuilder: (context, index) {
                      final profile = _savedProfiles[index];
                      return _buildRoleCard(
                        context,
                        title: profile['name'],
                        subtitle: "Continuar sesión",
                        icon: Icons.account_circle,
                        color: const Color(0xFF7C3AED),
                        onTap: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) => PatientDetailScreen(
                                patientId: profile['id'],
                                patientName: profile['name'],
                              ),
                            ),
                          ).then((_) => _checkLastSession());
                        },
                      );
                    },
                  ),
                ),
                const SizedBox(height: 24),
                const Divider(height: 32),
                const SizedBox(height: 8),
              ],

              _buildRoleCard(
                context,
                title: "Soy Médico",
                subtitle: "Gestionar mis pacientes",
                icon: Icons.medical_services_outlined,
                color: const Color(0xFF2563EB),
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (context) => const PatientListScreen()),
                  );
                },
              ),
              const SizedBox(height: 24),
              _buildRoleCard(
                context,
                title: "Soy Paciente",
                subtitle: "Ingresar con otra cuenta",
                icon: Icons.person_outline,
                color: const Color(0xFF059669), // Green for patients
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (context) => const PatientLoginScreen()),
                  ).then((_) => _checkLastSession());
                },
              ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildRoleCard(
    BuildContext context, {
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.grey.shade200),
          boxShadow: [
            BoxShadow(
              color: color.withOpacity(0.1),
              blurRadius: 20,
              offset: const Offset(0, 10),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: color, size: 32),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF1E293B),
                    ),
                  ),
                  Text(
                    subtitle,
                    style: const TextStyle(
                      fontSize: 14,
                      color: Color(0xFF64748B),
                    ),
                  ),
                ],
              ),
            ),
            Icon(Icons.arrow_forward_ios, size: 16, color: Colors.grey.shade400),
          ],
        ),
      ),
    );
  }
}
