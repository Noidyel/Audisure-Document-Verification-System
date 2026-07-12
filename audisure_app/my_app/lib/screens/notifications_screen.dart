import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import 'package:my_app/screens/application_details_screen.dart'
    as application_details;

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  static const Color primaryRed = Color(0xFFD32F2F);

  static const String backendUrl =
      'https://audisure-document-verification-system.onrender.com';

  final List<Map<String, dynamic>> _notifications = [];

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

    debugPrint('Saved applicant email: $_email');

    if (_email.isEmpty) {
      if (!mounted) return;

      setState(() {
        _isLoading = false;
        _errorMessage =
            'Unable to identify the logged-in applicant. Please log in again.';
      });

      return;
    }

    await _loadNotifications();
  }

  Future<void> _loadNotifications() async {
    if (!mounted) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final encodedEmail = Uri.encodeComponent(_email);

      final response = await http.get(
        Uri.parse('$backendUrl/api/notifications/$encodedEmail'),
        headers: const {'Accept': 'application/json'},
      );

      if (response.statusCode != 200) {
        debugPrint(
          'Notifications API error: '
          '${response.statusCode} ${response.body}',
        );

        if (!mounted) return;

        setState(() {
          _isLoading = false;
          _errorMessage =
              'Unable to load notifications.\n'
              'Server error: ${response.statusCode}\n'
              '${response.body}';
        });

        return;
      }

      final dynamic decodedBody = jsonDecode(response.body);

      List<dynamic> notificationData = [];

      if (decodedBody is List) {
        notificationData = decodedBody;
      } else if (decodedBody is Map<String, dynamic>) {
        final dynamic result =
            decodedBody['notifications'] ?? decodedBody['data'] ?? [];

        if (result is List) {
          notificationData = result;
        }
      }

      if (!mounted) return;

      setState(() {
        _notifications
          ..clear()
          ..addAll(
            notificationData.whereType<Map>().map(
              (item) => Map<String, dynamic>.from(item),
            ),
          );

        _isLoading = false;
      });
    } catch (error) {
      debugPrint('Notifications loading error: $error');

      if (!mounted) return;

      setState(() {
        _isLoading = false;
        _errorMessage = 'Unable to load notifications.\n$error';
      });
    }
  }

  bool _isRead(Map<String, dynamic> notification) {
    final dynamic value = notification['is_read'] ?? notification['read'] ?? 0;

    if (value is bool) return value;

    final normalizedValue = value.toString().trim().toLowerCase();

    return normalizedValue == '1' || normalizedValue == 'true';
  }

  Future<void> _markAsRead(Map<String, dynamic> notification) async {
    if (_isRead(notification)) return;

    final dynamic notificationId =
        notification['id'] ?? notification['notification_id'];

    if (notificationId == null) return;

    try {
      final response = await http.put(
        Uri.parse(
          '$backendUrl/api/notifications/'
          '$notificationId/read',
        ),
        headers: const {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      );

      if (response.statusCode == 200 && mounted) {
        final index = _notifications.indexOf(notification);

        if (index >= 0) {
          setState(() {
            _notifications[index]['is_read'] = 1;
          });
        }
      }
    } catch (error) {
      debugPrint('Mark notification as read error: $error');
    }
  }

  Future<void> _markAllAsRead() async {
    if (_email.isEmpty) return;

    try {
      final encodedEmail = Uri.encodeComponent(_email);

      final response = await http.put(
        Uri.parse(
          '$backendUrl/api/notifications/'
          'read-all/$encodedEmail',
        ),
        headers: const {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      );

      if (response.statusCode == 200 && mounted) {
        setState(() {
          for (final notification in _notifications) {
            notification['is_read'] = 1;
          }
        });

        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('All notifications marked as read.')),
        );
      }
    } catch (error) {
      debugPrint('Mark all as read error: $error');
    }
  }

  Future<Map<String, dynamic>?> _loadApplicationByUid(
    String documentUid,
  ) async {
    try {
      final encodedUid = Uri.encodeComponent(documentUid);

      final response = await http.get(
        Uri.parse('$backendUrl/api/documents/uid/$encodedUid'),
        headers: const {'Accept': 'application/json'},
      );

      if (response.statusCode != 200) {
        return null;
      }

      final dynamic decodedBody = jsonDecode(response.body);

      if (decodedBody is! Map<String, dynamic>) {
        return null;
      }

      final dynamic document = decodedBody['document'];

      if (document is Map) {
        return Map<String, dynamic>.from(document);
      }

      final dynamic data = decodedBody['data'];

      if (data is Map) {
        return Map<String, dynamic>.from(data);
      }

      if (decodedBody.containsKey('document_uid')) {
        return decodedBody;
      }

      return null;
    } catch (error) {
      debugPrint('Application lookup error: $error');
      return null;
    }
  }

  Future<void> _openNotification(Map<String, dynamic> notification) async {
    await _markAsRead(notification);

    final documentUid =
        (notification['document_uid'] ?? notification['uid'] ?? '').toString();

    if (documentUid.isEmpty) {
      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('This notification has no related document.'),
        ),
      );

      return;
    }

    Map<String, dynamic>? application;

    final dynamic embeddedDocument = notification['document'];

    if (embeddedDocument is Map) {
      application = Map<String, dynamic>.from(embeddedDocument);
    } else {
      application = await _loadApplicationByUid(documentUid);
    }

    if (!mounted) return;

    if (application == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('The related application could not be loaded.'),
        ),
      );

      return;
    }

    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder:
            (context) => application_details.ApplicationDetailsScreen(
              application: application!,
            ),
      ),
    );
  }

  String _formatDate(dynamic rawDate) {
    if (rawDate == null || rawDate.toString().trim().isEmpty) {
      return '';
    }

    try {
      final date = DateTime.parse(rawDate.toString()).toLocal();

      final difference = DateTime.now().difference(date);

      if (difference.inSeconds < 60) {
        return 'Just now';
      }

      if (difference.inMinutes < 60) {
        return '${difference.inMinutes}m ago';
      }

      if (difference.inHours < 24) {
        return '${difference.inHours}h ago';
      }

      if (difference.inDays < 7) {
        return '${difference.inDays}d ago';
      }

      return '${date.month}/${date.day}/${date.year}';
    } catch (_) {
      return rawDate.toString();
    }
  }

  IconData _getNotificationIcon(String type) {
    switch (type.toLowerCase()) {
      case 'verified':
      case 'pending_admin':
      case 'approved':
        return Icons.check_circle_outline;

      case 'needs_revision':
        return Icons.edit_note;

      case 'rejected':
        return Icons.cancel_outlined;

      case 'submitted':
        return Icons.upload_file;

      case 'task':
        return Icons.assignment_outlined;

      default:
        return Icons.notifications_outlined;
    }
  }

  Color _getNotificationColor(String type) {
    switch (type.toLowerCase()) {
      case 'verified':
      case 'pending_admin':
      case 'approved':
        return Colors.green;

      case 'needs_revision':
        return Colors.orange;

      case 'rejected':
        return Colors.red;

      case 'task':
        return Colors.purple;

      default:
        return Colors.blue;
    }
  }

  @override
  Widget build(BuildContext context) {
    final hasUnread = _notifications.any(
      (notification) => !_isRead(notification),
    );

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Notifications',
          style: TextStyle(fontFamily: 'Inter', fontWeight: FontWeight.w600),
        ),
        centerTitle: true,
        backgroundColor: primaryRed,
        foregroundColor: Colors.white,
        actions: [
          if (hasUnread)
            TextButton(
              onPressed: _markAllAsRead,
              child: const Text(
                'Read all',
                style: TextStyle(
                  color: Colors.white,
                  fontFamily: 'Inter',
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadNotifications,
        child: _buildBody(),
      ),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator(color: primaryRed));
    }

    if (_errorMessage != null) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
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
              onPressed: _loadNotifications,
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

    if (_notifications.isEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(24),
        children: const [
          SizedBox(height: 100),
          Icon(Icons.notifications_off_outlined, size: 80, color: Colors.grey),
          SizedBox(height: 16),
          Text(
            'No notifications',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontFamily: 'Inter',
              fontSize: 20,
              fontWeight: FontWeight.w600,
            ),
          ),
          SizedBox(height: 8),
          Text(
            'Updates about your submitted documents '
            'will appear here.',
            textAlign: TextAlign.center,
            style: TextStyle(fontFamily: 'Inter', color: Colors.grey),
          ),
        ],
      );
    }

    return ListView.separated(
      physics: const AlwaysScrollableScrollPhysics(),
      itemCount: _notifications.length,
      separatorBuilder: (_, __) => const Divider(height: 1),
      itemBuilder: (context, index) {
        final notification = _notifications[index];

        final title = (notification['title'] ?? 'Document Update').toString();

        final message =
            (notification['message'] ?? notification['description'] ?? '')
                .toString();

        final type =
            (notification['notification_type'] ??
                    notification['type'] ??
                    'general')
                .toString();

        final isRead = _isRead(notification);
        final color = _getNotificationColor(type);

        return Material(
          color: isRead ? Colors.white : primaryRed.withOpacity(0.05),
          child: InkWell(
            onTap: () => _openNotification(notification),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: color.withOpacity(0.12),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(_getNotificationIcon(type), color: color),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                title,
                                style: TextStyle(
                                  fontFamily: 'Inter',
                                  fontSize: 15,
                                  fontWeight:
                                      isRead
                                          ? FontWeight.w500
                                          : FontWeight.w700,
                                ),
                              ),
                            ),
                            if (!isRead)
                              Container(
                                width: 9,
                                height: 9,
                                decoration: const BoxDecoration(
                                  color: primaryRed,
                                  shape: BoxShape.circle,
                                ),
                              ),
                          ],
                        ),
                        if (message.isNotEmpty) ...[
                          const SizedBox(height: 5),
                          Text(
                            message,
                            maxLines: 3,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontFamily: 'Inter',
                              color: Colors.black54,
                              height: 1.35,
                            ),
                          ),
                        ],
                        const SizedBox(height: 7),
                        Text(
                          _formatDate(notification['created_at']),
                          style: const TextStyle(
                            fontFamily: 'Inter',
                            fontSize: 12,
                            color: Colors.grey,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
