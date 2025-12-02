import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import '../models/patient_summary.dart';
import '../models/extraction_models.dart';
import 'package:flutter/foundation.dart';

import 'dart:io' show Platform;

class RemoteApi {
  static String get baseUrl {
    if (kIsWeb) return 'http://127.0.0.1:8000';
    // IP Local de tu Mac para que el celular se conecte por Wi-Fi
    return 'http://192.168.1.68:8000';
  }

  Future<List<PatientSummary>> getPatients() async {
    final uri = Uri.parse('$baseUrl/patients');
    final response = await http.get(uri);

    if (response.statusCode == 200) {
      final List<dynamic> body = jsonDecode(response.body);
      return body.map((json) => PatientSummary.fromJson(json)).toList();
    } else {
      throw Exception('Failed to load patients');
    }
  }

  Future<PatientSummary> createPatientAndReturn(String name, int age, String sex) async {
    final uri = Uri.parse('$baseUrl/patients');
    final response = await http.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'name': name,
        'age': age,
        'sex': sex,
      }),
    );

    if (response.statusCode == 200) {
      return PatientSummary.fromJson(jsonDecode(response.body));
    } else {
      throw Exception('Failed to create patient: ${response.statusCode}');
    }
  }

  Future<void> createPatient(String name, int age, String sex) async {
    final uri = Uri.parse('$baseUrl/patients');
    final response = await http.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'name': name,
        'age': age,
        'sex': sex,
      }),
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to create patient: ${response.statusCode}');
    }
  }

  Future<PatientSummary> getPatientSummary(String patientId) async {
    final uri = Uri.parse('$baseUrl/patients/$patientId/summary');
    final response = await http.get(uri);

    if (response.statusCode == 200) {
      return PatientSummary.fromJson(jsonDecode(response.body));
    } else {
      throw Exception('Failed to load patient summary: ${response.statusCode}');
    }
  }

  Future<ExtractedData> extractData(String patientId, XFile image) async {
    final uri = Uri.parse('$baseUrl/extract_data');
    final request = http.MultipartRequest('POST', uri);
    request.fields['patient_id'] = patientId;

    if (kIsWeb) {
      final bytes = await image.readAsBytes();
      request.files.add(
        http.MultipartFile.fromBytes('file', bytes, filename: image.name),
      );
    } else {
      request.files.add(
        await http.MultipartFile.fromPath('file', image.path),
      );
    }

    final streamedResponse = await request.send();
    final response = await http.Response.fromStream(streamedResponse);

    if (response.statusCode == 200) {
      return ExtractedData.fromJson(jsonDecode(response.body));
    } else {
      throw Exception('Failed to extract data: ${response.statusCode}');
    }
  }

  Future<PatientSummary> submitAnalysis(SubmitAnalysisRequest data) async {
    final uri = Uri.parse('$baseUrl/submit_analysis');
    final response = await http.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(data.toJson()),
    );

    if (response.statusCode == 200) {
      return PatientSummary.fromJson(jsonDecode(response.body));
    } else {
      throw Exception('Failed to submit analysis: ${response.statusCode}');
    }
  }

  Future<void> deletePatient(String patientId) async {
    final uri = Uri.parse('$baseUrl/patients/$patientId');
    final response = await http.delete(uri);

    if (response.statusCode != 200) {
      throw Exception('Failed to delete patient: ${response.statusCode}');
    }
  }

  // Legacy method kept for reference, but should be replaced by the flow above
  Future<PatientSummary> sendDocumentImage(String patientId, XFile image) async {
    // ... (Legacy implementation)
    return extractData(patientId, image).then((extracted) {
       // This is just a dummy bridge if needed, but we will switch to new flow
       throw UnimplementedError("Use extractData + submitAnalysis instead");
    });
  }
}
