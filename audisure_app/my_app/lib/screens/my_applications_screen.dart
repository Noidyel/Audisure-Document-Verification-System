import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import 'application_details_screen.dart';

class MyApplicationsScreen extends StatefulWidget {
  const MyApplicationsScreen({super.key});

  @override
  State<MyApplicationsScreen> createState() => _MyApplicationsScreenState();
}

class _MyApplicationsScreenState extends State<MyApplicationsScreen> {
  static const Color primaryRed = Color(0xFFD32F2F);

  static const String backendUrl =
      'https://audisure-document-verification-system.onrender.com';

  final List<Map<String, dynamic>> _applications = [];

  bool _isLoading = true;
  String? _errorMessage;
  String _email = '';

  @override
  void initState() {
    super.initState();
    _initializeScreen();
  }

  Future<void> _initializeScreen() async {
    final prefs = await SharedPreferences.getInstance();

    _email = prefs.getString('email') ?? prefs.getString('user_email') ?? '';

    if (_email.isEmpty) {
      if (!mounted) return;

      setState(() {
        _isLoading = false;
        _errorMessage = 'Unable to identify the logged-in applicant.';
      });

      return;
    }

    await _loadApplications();
  }

  Future<void> _loadApplications() async {
    if (!mounted) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final encodedEmail = Uri.encodeComponent(_email);

      final response = await http.get(
        Uri.parse('$backendUrl/api/documents/applicant/$encodedEmail'),
        headers: {'Accept': 'application/json'},
      );

      if (response.statusCode == 200) {
        final decodedBody = jsonDecode(response.body);

        List<dynamic> applicationData;

        if (decodedBody is List) {
          applicationData = decodedBody;
        } else if (decodedBody is Map<String, dynamic>) {
          applicationData =
              decodedBody['documents'] ??
              decodedBody['applications'] ??
              decodedBody['data'] ??
              [];
        } else {
          applicationData = [];
        }

        if (!mounted) return;

        setState(() {
          _applications
            ..clear()
            ..addAll(
              applicationData.whereType<Map>().map(
                (item) => Map<String, dynamic>.from(item),
              ),
            );

          _isLoading = false;
        });
      } else {
        throw Exception('Server returned status ${response.statusCode}.');
      }
    } catch (error) {
      debugPrint('Applications loading error: $error');

      if (!mounted) return;

      setState(() {
        _isLoading = false;
        _errorMessage = 'Unable to load your applications. Please try again.';
      });
    }
  }

  String _getStatus(Map<String, dynamic> application) {
    return (application['status'] ??
            application['document_status'] ??
            application['latest_status'] ??
            'submitted')
        .toString()
        .toLowerCase();
  }

  String _getTitle(Map<String, dynamic> application) {
    return (application['title'] ??
            application['document_title'] ??
            application['main_application_type'] ??
            'Application')
        .toString();
  }

  String _getUid(Map<String, dynamic> application) {
    return (application['document_uid'] ??
            application['uid'] ??
            'No UID available')
        .toString();
  }

  String _formatStatus(String status) {
    switch (status.toLowerCase()) {
      case 'needs_revision':
      case 'needs revision':
        return 'Needs Revision';

      case 'verified':
        return 'Verified';

      case 'approved':
        return 'Approved';

      case 'rejected':
        return 'Rejected';

      case 'pending':
        return 'Pending Review';

      case 'submitted':
        return 'Submitted';

      default:
        return status
            .replaceAll('_', ' ')
            .split(' ')
            .map(
              (word) =>
                  word.isEmpty
                      ? word
                      : '${word[0].toUpperCase()}${word.substring(1)}',
            )
            .join(' ');
    }
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'approved':
      case 'verified':
        return Colors.green;

      case 'needs_revision':
      case 'needs revision':
        return Colors.orange;

      case 'rejected':
        return Colors.red;

      case 'pending':
        return Colors.blueGrey;

      default:
        return Colors.blue;
    }
  }

  IconData _getStatusIcon(String status) {
    switch (status.toLowerCase()) {
      case 'approved':
      case 'verified':
        return Icons.check_circle_outline;

      case 'needs_revision':
      case 'needs revision':
        return Icons.edit_note;

      case 'rejected':
        return Icons.cancel_outlined;

      case 'pending':
        return Icons.schedule;

      default:
        return Icons.description_outlined;
    }
  }

  Future<void> _openApplication(Map<String, dynamic> application) async {
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder:
            (context) => ApplicationDetailsScreen(application: application),
      ),
    );

    await _loadApplications();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'My Applications',
          style: TextStyle(fontFamily: 'Inter', fontWeight: FontWeight.w600),
        ),
        centerTitle: true,
        backgroundColor: primaryRed,
        foregroundColor: Colors.white,
      ),
      body: RefreshIndicator(onRefresh: _loadApplications, child: _buildBody()),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator(color: primaryRed));
    }

    if (_errorMessage != null) {
      return ListView(
        padding: const EdgeInsets.all(24),
        children: [
          const SizedBox(height: 100),
          const Icon(Icons.error_outline, size: 72, color: Colors.redAccent),
          const SizedBox(height: 16),
          Text(
            _errorMessage!,
            textAlign: TextAlign.center,
            style: const TextStyle(fontFamily: 'Inter', fontSize: 16),
          ),
          const SizedBox(height: 24),
          Center(
            child: ElevatedButton.icon(
              onPressed: _loadApplications,
              icon: const Icon(Icons.refresh),
              label: const Text('Try Again'),
              style: ElevatedButton.styleFrom(
                backgroundColor: primaryRed,
                foregroundColor: Colors.white,
              ),
            ),
          ),
        ],
      );
    }

    if (_applications.isEmpty) {
      return ListView(
        padding: const EdgeInsets.all(24),
        children: const [
          SizedBox(height: 100),
          Icon(Icons.folder_open_outlined, size: 80, color: Colors.grey),
          SizedBox(height: 16),
          Text(
            'No applications found',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontFamily: 'Inter',
              fontSize: 20,
              fontWeight: FontWeight.w600,
            ),
          ),
          SizedBox(height: 8),
          Text(
            'Documents you upload will appear here.',
            textAlign: TextAlign.center,
            style: TextStyle(fontFamily: 'Inter', color: Colors.grey),
          ),
        ],
      );
    }

    return ListView.separated(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16),
      itemCount: _applications.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final application = _applications[index];

        final title = _getTitle(application);
        final uid = _getUid(application);
        final status = _getStatus(application);
        final statusColor = _getStatusColor(status);

        return Card(
          elevation: 3,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          child: InkWell(
            borderRadius: BorderRadius.circular(12),
            onTap: () => _openApplication(application),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: statusColor.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(_getStatusIcon(status), color: statusColor),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          title,
                          style: const TextStyle(
                            fontFamily: 'Inter',
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'UID: $uid',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontFamily: 'Inter',
                            fontSize: 13,
                            color: Colors.grey,
                          ),
                        ),
                        const SizedBox(height: 10),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 5,
                          ),
                          decoration: BoxDecoration(
                            color: statusColor.withOpacity(0.12),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            _formatStatus(status),
                            style: TextStyle(
                              fontFamily: 'Inter',
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: statusColor,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Icon(Icons.chevron_right, color: Colors.grey),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
