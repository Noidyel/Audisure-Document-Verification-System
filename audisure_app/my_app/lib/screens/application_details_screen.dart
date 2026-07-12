import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;

class ApplicationDetailsScreen extends StatefulWidget {
  final Map<String, dynamic> application;

  const ApplicationDetailsScreen({super.key, required this.application});

  @override
  State<ApplicationDetailsScreen> createState() =>
      _ApplicationDetailsScreenState();
}

class _ApplicationDetailsScreenState extends State<ApplicationDetailsScreen> {
  static const Color primaryRed = Color(0xFFD32F2F);

  static const String backendUrl =
      'https://audisure-document-verification-system.onrender.com';

  final List<Map<String, dynamic>> _history = [];

  bool _isLoadingHistory = true;
  String? _historyError;

  String get _documentUid {
    return (widget.application['document_uid'] ??
            widget.application['uid'] ??
            '')
        .toString();
  }

  @override
  void initState() {
    super.initState();
    _loadDocumentHistory();
  }

  Future<void> _loadDocumentHistory() async {
    if (_documentUid.isEmpty) {
      if (!mounted) return;

      setState(() {
        _isLoadingHistory = false;
        _historyError = null;
      });

      return;
    }

    if (mounted) {
      setState(() {
        _isLoadingHistory = true;
        _historyError = null;
      });
    }

    try {
      final encodedUid = Uri.encodeComponent(_documentUid);

      final response = await http.get(
        Uri.parse('$backendUrl/api/documents/history/$encodedUid'),
        headers: const {'Accept': 'application/json'},
      );

      if (response.statusCode != 200) {
        throw Exception(
          'Server returned ${response.statusCode}: '
          '${response.body}',
        );
      }

      final dynamic decodedBody = jsonDecode(response.body);

      List<dynamic> historyData = [];

      if (decodedBody is List) {
        historyData = decodedBody;
      } else if (decodedBody is Map<String, dynamic>) {
        final dynamic result =
            decodedBody['history'] ?? decodedBody['data'] ?? [];

        if (result is List) {
          historyData = result;
        }
      }

      if (!mounted) return;

      setState(() {
        _history
          ..clear()
          ..addAll(
            historyData.whereType<Map>().map(
              (item) => Map<String, dynamic>.from(item),
            ),
          );

        _isLoadingHistory = false;
        _historyError = null;
      });
    } catch (error) {
      debugPrint('Document history error: $error');

      if (!mounted) return;

      setState(() {
        _isLoadingHistory = false;
        _historyError = 'Unable to load status history.';
      });
    }
  }

  String _valueFrom(
    List<String> possibleKeys, {
    String fallback = 'Not available',
  }) {
    for (final key in possibleKeys) {
      final dynamic value = widget.application[key];

      if (value != null && value.toString().trim().isNotEmpty) {
        return value.toString();
      }
    }

    return fallback;
  }

  String _formatStatus(String status) {
    switch (status.trim().toLowerCase()) {
      case 'needs_revision':
      case 'needs revision':
        return 'Needs Revision';

      case 'pending':
      case 'pending_staff':
        return 'Pending Staff Review';

      case 'pending_admin':
        return 'Pending Final Review';

      case 'verified':
        return 'Verified';

      case 'approved':
        return 'Approved';

      case 'rejected':
        return 'Rejected';

      case 'submitted':
        return 'Submitted';

      default:
        return status
            .replaceAll('_', ' ')
            .split(' ')
            .where((word) => word.isNotEmpty)
            .map(
              (word) =>
                  '${word[0].toUpperCase()}'
                  '${word.substring(1)}',
            )
            .join(' ');
    }
  }

  Color _getStatusColor(String status) {
    switch (status.trim().toLowerCase()) {
      case 'approved':
      case 'verified':
        return Colors.green;

      case 'needs_revision':
      case 'needs revision':
        return Colors.orange;

      case 'rejected':
        return Colors.red;

      case 'pending':
      case 'pending_staff':
      case 'pending_admin':
        return Colors.blueGrey;

      default:
        return Colors.blue;
    }
  }

  IconData _getStatusIcon(String status) {
    switch (status.trim().toLowerCase()) {
      case 'approved':
      case 'verified':
        return Icons.check_circle;

      case 'needs_revision':
      case 'needs revision':
        return Icons.edit_note;

      case 'rejected':
        return Icons.cancel;

      case 'pending':
      case 'pending_staff':
      case 'pending_admin':
        return Icons.schedule;

      default:
        return Icons.description;
    }
  }

  String _formatDate(dynamic rawDate) {
    if (rawDate == null || rawDate.toString().trim().isEmpty) {
      return 'Not available';
    }

    try {
      final date = DateTime.parse(rawDate.toString()).toLocal();

      const monthNames = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
      ];

      final hour =
          date.hour == 0
              ? 12
              : date.hour > 12
              ? date.hour - 12
              : date.hour;

      final minute = date.minute.toString().padLeft(2, '0');

      final period = date.hour >= 12 ? 'PM' : 'AM';

      return '${monthNames[date.month - 1]} '
          '${date.day}, ${date.year} at '
          '$hour:$minute $period';
    } catch (_) {
      return rawDate.toString();
    }
  }

  Future<void> _copyUid() async {
    if (_documentUid.isEmpty) return;

    await Clipboard.setData(ClipboardData(text: _documentUid));

    if (!mounted) return;

    ScaffoldMessenger.of(
      context,
    ).showSnackBar(const SnackBar(content: Text('Document UID copied.')));
  }

  @override
  Widget build(BuildContext context) {
    final title = _valueFrom([
      'title',
      'document_title',
      'main_application_type',
    ], fallback: 'Application Details');

    final applicationType = _valueFrom([
      'main_application_type',
      'application_type',
      'document_type',
      'type_name',
      'code',
    ]);

    final status = _valueFrom([
      'status',
      'document_status',
      'latest_status',
    ], fallback: 'submitted');

    final remarks = _valueFrom([
      'revision_remarks',
      'remarks',
      'staff_remarks',
      'review_notes',
      'reason',
    ], fallback: '');

    final submittedDate = _valueFrom([
      'created_at',
      'submitted_at',
      'upload_date',
    ], fallback: '');

    final updatedDate = _valueFrom([
      'updated_at',
      'status_updated_at',
      'reviewed_at',
    ], fallback: '');

    final statusColor = _getStatusColor(status);

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Application Details',
          style: TextStyle(fontFamily: 'Inter', fontWeight: FontWeight.w600),
        ),
        centerTitle: true,
        backgroundColor: primaryRed,
        foregroundColor: Colors.white,
      ),
      body: RefreshIndicator(
        onRefresh: _loadDocumentHistory,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          children: [
            _buildStatusHeader(
              title: title,
              status: status,
              statusColor: statusColor,
            ),
            const SizedBox(height: 16),
            _buildInformationCard(
              applicationType: applicationType,
              submittedDate: submittedDate,
              updatedDate: updatedDate,
            ),
            if (remarks.isNotEmpty) ...[
              const SizedBox(height: 16),
              _buildRemarksCard(remarks),
            ],
            const SizedBox(height: 24),
            const Text(
              'Status History',
              style: TextStyle(
                fontFamily: 'Inter',
                fontSize: 18,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 12),
            _buildHistorySection(),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusHeader({
    required String title,
    required String status,
    required Color statusColor,
  }) {
    return Card(
      elevation: 3,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: statusColor.withOpacity(0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(_getStatusIcon(status), size: 40, color: statusColor),
            ),
            const SizedBox(height: 14),
            Text(
              title,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontFamily: 'Inter',
                fontSize: 20,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
              decoration: BoxDecoration(
                color: statusColor.withOpacity(0.12),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                _formatStatus(status),
                style: TextStyle(
                  fontFamily: 'Inter',
                  fontWeight: FontWeight.w600,
                  color: statusColor,
                ),
              ),
            ),
            const SizedBox(height: 18),
            Row(
              children: [
                const Expanded(
                  child: Text(
                    'Document UID',
                    style: TextStyle(fontFamily: 'Inter', color: Colors.grey),
                  ),
                ),
                IconButton(
                  tooltip: 'Copy UID',
                  onPressed: _documentUid.isEmpty ? null : _copyUid,
                  icon: const Icon(Icons.copy, size: 20, color: primaryRed),
                ),
              ],
            ),
            Align(
              alignment: Alignment.centerLeft,
              child: SelectableText(
                _documentUid.isEmpty ? 'Not available' : _documentUid,
                style: const TextStyle(
                  fontFamily: 'Inter',
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInformationCard({
    required String applicationType,
    required String submittedDate,
    required String updatedDate,
  }) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          children: [
            _buildInformationRow(
              icon: Icons.category_outlined,
              label: 'Application Type',
              value: applicationType,
            ),
            const Divider(height: 28),
            _buildInformationRow(
              icon: Icons.calendar_today_outlined,
              label: 'Date Submitted',
              value: _formatDate(submittedDate),
            ),
            const Divider(height: 28),
            _buildInformationRow(
              icon: Icons.update,
              label: 'Last Updated',
              value: _formatDate(updatedDate),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInformationRow({
    required IconData icon,
    required String label,
    required String value,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, color: primaryRed, size: 22),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: const TextStyle(
                  fontFamily: 'Inter',
                  fontSize: 13,
                  color: Colors.grey,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                value,
                style: const TextStyle(
                  fontFamily: 'Inter',
                  fontSize: 15,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildRemarksCard(String remarks) {
    return Card(
      elevation: 2,
      color: Colors.orange.shade50,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(color: Colors.orange.shade200),
      ),
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Icon(Icons.warning_amber_rounded, color: Colors.orange),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Revision Remarks',
                    style: TextStyle(
                      fontFamily: 'Inter',
                      fontWeight: FontWeight.w700,
                      color: Colors.orange,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    remarks,
                    style: const TextStyle(fontFamily: 'Inter', height: 1.4),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHistorySection() {
    if (_isLoadingHistory) {
      return const Padding(
        padding: EdgeInsets.all(24),
        child: Center(child: CircularProgressIndicator(color: primaryRed)),
      );
    }

    if (_historyError != null) {
      return Card(
        elevation: 1,
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            children: [
              const Icon(Icons.error_outline, color: Colors.redAccent),
              const SizedBox(height: 8),
              Text(_historyError!, textAlign: TextAlign.center),
              const SizedBox(height: 12),
              TextButton.icon(
                onPressed: _loadDocumentHistory,
                icon: const Icon(Icons.refresh),
                label: const Text('Try Again'),
              ),
            ],
          ),
        ),
      );
    }

    if (_history.isEmpty) {
      return Card(
        elevation: 1,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        child: const Padding(
          padding: EdgeInsets.all(20),
          child: Text(
            'No status history is available yet.',
            textAlign: TextAlign.center,
            style: TextStyle(fontFamily: 'Inter', color: Colors.grey),
          ),
        ),
      );
    }

    return Column(
      children:
          _history.map((historyItem) {
            final status =
                (historyItem['status'] ??
                        historyItem['action'] ??
                        historyItem['new_status'] ??
                        'updated')
                    .toString();

            final remarks =
                (historyItem['remarks'] ??
                        historyItem['description'] ??
                        historyItem['notes'] ??
                        '')
                    .toString();

            final dynamic date =
                historyItem['created_at'] ??
                historyItem['updated_at'] ??
                historyItem['changed_at'];

            final color = _getStatusColor(status);

            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Column(
                    children: [
                      Container(
                        width: 34,
                        height: 34,
                        decoration: BoxDecoration(
                          color: color.withOpacity(0.12),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          _getStatusIcon(status),
                          size: 18,
                          color: color,
                        ),
                      ),
                      Container(
                        width: 2,
                        height: 45,
                        color: Colors.grey.shade300,
                      ),
                    ],
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Card(
                      margin: EdgeInsets.zero,
                      elevation: 1,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(14),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _formatStatus(status),
                              style: TextStyle(
                                fontFamily: 'Inter',
                                fontWeight: FontWeight.w600,
                                color: color,
                              ),
                            ),
                            if (remarks.isNotEmpty) ...[
                              const SizedBox(height: 6),
                              Text(
                                remarks,
                                style: const TextStyle(fontFamily: 'Inter'),
                              ),
                            ],
                            const SizedBox(height: 6),
                            Text(
                              _formatDate(date),
                              style: const TextStyle(
                                fontFamily: 'Inter',
                                fontSize: 12,
                                color: Colors.grey,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            );
          }).toList(),
    );
  }
}
