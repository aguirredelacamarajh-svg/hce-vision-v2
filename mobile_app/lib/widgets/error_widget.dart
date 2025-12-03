import 'package:flutter/material.dart';

/// Widget de error amigable con sugerencias y botón de reintentar.
class HceError extends StatelessWidget {
  final String title;
  final String message;
  final List<String>? hints;
  final VoidCallback? onRetry;
  final String? stackTraceSnippet;

  const HceError({
    super.key,
    this.title = "Algo salió mal",
    required this.message,
    this.hints,
    this.onRetry,
    this.stackTraceSnippet,
  });

  @override
  Widget build(BuildContext context) {
    const errorColor = Color(0xFFE53935);
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.all(12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: errorColor.withOpacity(0.06),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: errorColor.withOpacity(0.3)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 12,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              const Icon(Icons.error_outline, color: errorColor),
              const SizedBox(width: 8),
              Text(
                title,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: errorColor,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            message,
            style: const TextStyle(
              fontSize: 14,
              color: Colors.black87,
            ),
          ),
          if (hints != null && hints!.isNotEmpty) ...[
            const SizedBox(height: 10),
            ...hints!.map(
              (hint) => Row(
                children: [
                  const Icon(Icons.chevron_right, size: 18, color: Colors.black54),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      hint,
                      style: const TextStyle(fontSize: 13, color: Colors.black87),
                    ),
                  ),
                ],
              ),
            ),
          ],
          if (stackTraceSnippet != null && stackTraceSnippet!.isNotEmpty) ...[
            const SizedBox(height: 10),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.04),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                stackTraceSnippet!,
                style: const TextStyle(fontSize: 12, color: Colors.black87),
              ),
            ),
          ],
          if (onRetry != null) ...[
            const SizedBox(height: 12),
            Align(
              alignment: Alignment.centerLeft,
              child: ElevatedButton(
                onPressed: onRetry,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF2196F3),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: const Text("Reintentar"),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
