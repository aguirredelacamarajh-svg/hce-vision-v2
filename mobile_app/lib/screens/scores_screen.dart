
import 'package:flutter/material.dart';
import '../models/patient.dart';
import '../utils/score_calculator.dart';

class ScoresScreen extends StatefulWidget {
  final Patient patient;

  const ScoresScreen({super.key, required this.patient});

  @override
  State<ScoresScreen> createState() => _ScoresScreenState();
}

class _ScoresScreenState extends State<ScoresScreen> {
  // --- Estado para CHA2DS2-VASc ---
  bool _hf = false; // Insuficiencia Cardíaca
  bool _htn = false; // Hipertensión
  bool _diabetes = false;
  bool _stroke = false;
  bool _vascular = false;

  // --- Estado para HAS-BLED ---
  bool _hbHtn = false; // H
  bool _hbRenal = false; // A
  bool _hbLiver = false; // A
  bool _hbStroke = false; // S
  bool _hbBleeding = false; // B
  bool _hbLabileInr = false; // L
  bool _hbDrugsAlcohol = false; // D

  Map<String, dynamic>? _chaResult;
  Map<String, dynamic>? _hasBledResult;

  void _calculate() {
    setState(() {
      // Calcular CHA2DS2-VASc
      _chaResult = ScoreCalculator.calculateCha2ds2Vasc(
        heartFailure: _hf,
        hypertension: _htn,
        age: widget.patient.age,
        diabetes: _diabetes,
        stroke: _stroke,
        vascularDisease: _vascular,
        sex: widget.patient.sex,
      );

      // Calcular HAS-BLED
      _hasBledResult = ScoreCalculator.calculateHasBled(
        hypertension: _hbHtn,
        renalDisease: _hbRenal,
        liverDisease: _hbLiver,
        strokeHistory: _hbStroke,
        bleedingHistory: _hbBleeding,
        labileInr: _hbLabileInr,
        elderly: widget.patient.age > 65,
        drugsOrAlcohol: _hbDrugsAlcohol,
      );
    });
  }

  Widget _buildSwitch(String label, bool value, Function(bool) onChanged) {
    return SwitchListTile(
      title: Text(label),
      value: value,
      onChanged: onChanged,
      dense: true,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Calculadora de Riesgo")),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // --- CHA2DS2-VASc ---
            const Text("CHA₂DS₂-VASc (Riesgo ACV)", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.blue)),
            const SizedBox(height: 8),
            Card(
              child: Column(
                children: [
                  _buildSwitch("Insuficiencia Cardíaca", _hf, (v) => setState(() => _hf = v)),
                  _buildSwitch("Hipertensión", _htn, (v) => setState(() => _htn = v)),
                  _buildSwitch("Diabetes", _diabetes, (v) => setState(() => _diabetes = v)),
                  _buildSwitch("ACV / AIT Previo", _stroke, (v) => setState(() => _stroke = v)),
                  _buildSwitch("Enfermedad Vascular", _vascular, (v) => setState(() => _vascular = v)),
                  ListTile(
                    title: const Text("Edad / Sexo (Automático)"),
                    subtitle: Text("${widget.patient.age} años / ${widget.patient.sex}"),
                    leading: const Icon(Icons.info_outline),
                  )
                ],
              ),
            ),
            if (_chaResult != null)
              Container(
                padding: const EdgeInsets.all(12),
                color: Colors.blue.shade100,
                child: Text(
                  "Score: ${_chaResult!['score']}\n${_chaResult!['interpretation']}",
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  textAlign: TextAlign.center,
                ),
              ),

            const SizedBox(height: 24),

            // --- HAS-BLED ---
            const Text("HAS-BLED (Riesgo Sangrado)", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.red)),
            const SizedBox(height: 8),
            Card(
              child: Column(
                children: [
                  _buildSwitch("Hipertensión no controlada", _hbHtn, (v) => setState(() => _hbHtn = v)),
                  _buildSwitch("Función Renal Alterada", _hbRenal, (v) => setState(() => _hbRenal = v)),
                  _buildSwitch("Función Hepática Alterada", _hbLiver, (v) => setState(() => _hbLiver = v)),
                  _buildSwitch("ACV Previo", _hbStroke, (v) => setState(() => _hbStroke = v)),
                  _buildSwitch("Antecedente de Sangrado", _hbBleeding, (v) => setState(() => _hbBleeding = v)),
                  _buildSwitch("INR Lábil", _hbLabileInr, (v) => setState(() => _hbLabileInr = v)),
                  _buildSwitch("Drogas / Alcohol", _hbDrugsAlcohol, (v) => setState(() => _hbDrugsAlcohol = v)),
                ],
              ),
            ),
            if (_hasBledResult != null)
              Container(
                padding: const EdgeInsets.all(12),
                color: Colors.red.shade100,
                child: Text(
                  "Score: ${_hasBledResult!['score']}\n${_hasBledResult!['interpretation']}",
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  textAlign: TextAlign.center,
                ),
              ),

            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _calculate,
              style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
              child: const Text("CALCULAR RIESGO", style: TextStyle(fontSize: 18)),
            ),
          ],
        ),
      ),
    );
  }
}
