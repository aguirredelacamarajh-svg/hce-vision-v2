
import 'package:flutter/material.dart';
import 'screens/patient_list_screen.dart';
import 'screens/role_selection_screen.dart';

void main() {
  runApp(const HceVisionApp());
}

class HceVisionApp extends StatelessWidget {
  const HceVisionApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'HCE Vision',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF2563EB), // Blue 600
          primary: const Color(0xFF1E40AF), // Blue 800
          secondary: const Color(0xFF3B82F6), // Blue 500
          background: const Color(0xFFF8FAFC), // Slate 50
          surface: Colors.white,
        ),
        scaffoldBackgroundColor: const Color(0xFFF8FAFC),
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.transparent,
          elevation: 0,
          centerTitle: false,
          titleTextStyle: TextStyle(
            color: Color(0xFF0F172A), // Slate 900
            fontSize: 24,
            fontWeight: FontWeight.bold,
            letterSpacing: -0.5,
          ),
          iconTheme: IconThemeData(color: Color(0xFF0F172A)),
        ),

        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF2563EB),
            foregroundColor: Colors.white,
            elevation: 0,
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            textStyle: const TextStyle(
              fontWeight: FontWeight.w600,
              fontSize: 16,
            ),
          ),
        ),
        floatingActionButtonTheme: const FloatingActionButtonThemeData(
          backgroundColor: Color(0xFF2563EB),
          foregroundColor: Colors.white,
          elevation: 4,
        ),
      ),
      home: const RoleSelectionScreen(),
    );
  }
}
