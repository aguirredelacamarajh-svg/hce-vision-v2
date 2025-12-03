import 'package:flutter/material.dart';

/// Loading widget con estilo médico y variantes para pantalla completa o inline.
class HceLoading extends StatelessWidget {
  /// Mensaje contextual para mostrar debajo del spinner.
  final String? message;

  /// Cuando es true ocupa toda la pantalla con fondo suave. Si es false, usa
  /// una variante compacta ideal para listas o secciones.
  final bool fullscreen;

  const HceLoading({
    super.key,
    this.message,
    this.fullscreen = false,
  });

  @override
  Widget build(BuildContext context) {
    final content = Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        _Spinner(),
        if (message != null) ...[
          const SizedBox(height: 12),
          Text(
            message!,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: Colors.black87,
            ),
          ),
        ],
      ],
    );

    if (!fullscreen) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: content,
        ),
      );
    }

    return Container(
      width: double.infinity,
      height: double.infinity,
      color: Colors.white.withOpacity(0.85),
      child: Center(child: content),
    );
  }
}

class _Spinner extends StatefulWidget {
  @override
  State<_Spinner> createState() => _SpinnerState();
}

class _SpinnerState extends State<_Spinner> with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    const primary = Color(0xFF2196F3);
    const secondary = Color(0xFF4CAF50);

    return SizedBox(
      width: 80,
      height: 80,
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Halo externo animado.
          FadeTransition(
            opacity: _controller.drive(CurveTween(curve: Curves.easeInOut)),
            child: Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: primary.withOpacity(0.08),
              ),
            ),
          ),
          // Spinner circular.
          RotationTransition(
            turns: _controller,
            child: SizedBox(
              width: 62,
              height: 62,
              child: CircularProgressIndicator(
                strokeWidth: 4,
                valueColor: const AlwaysStoppedAnimation<Color>(primary),
                backgroundColor: primary.withOpacity(0.12),
              ),
            ),
          ),
          // Ícono central (cruz médica).
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: Colors.white,
              border: Border.all(color: secondary.withOpacity(0.8), width: 1.6),
              boxShadow: [
                BoxShadow(
                  color: primary.withOpacity(0.12),
                  blurRadius: 8,
                  offset: const Offset(0, 3),
                ),
              ],
            ),
            child: const Icon(Icons.health_and_safety_rounded, color: primary, size: 22),
          ),
        ],
      ),
    );
  }
}
