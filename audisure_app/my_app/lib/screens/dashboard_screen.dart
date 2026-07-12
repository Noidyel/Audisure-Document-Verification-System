import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import 'document_upload_screen.dart';
import 'profile_screen.dart';
import 'status_screen.dart';

import 'package:my_app/screens/my_applications_screen.dart' as my_applications;
import 'package:my_app/screens/notifications_screen.dart' as app_notifications;

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  static const Color primaryRed = Color(0xFFD32F2F);

  static const String backendUrl =
      'https://audisure-document-verification-system.onrender.com';

  String firstName = '';
  String lastName = '';
  String email = '';

  bool isEnglish = true;
  bool isLoadingNotifications = false;

  int unreadNotificationCount = 0;

  String t(String english, String tagalog) {
    return isEnglish ? english : tagalog;
  }

  @override
  void initState() {
    super.initState();
    _initializeDashboard();
  }

  Future<void> _initializeDashboard() async {
    await _loadUserData();
    await _loadUnreadNotificationCount();
  }

  Future<void> _loadUserData() async {
    final prefs = await SharedPreferences.getInstance();

    if (!mounted) return;

    setState(() {
      firstName = prefs.getString('first_name') ?? '';
      lastName = prefs.getString('last_name') ?? '';
      email = prefs.getString('email') ?? prefs.getString('user_email') ?? '';
    });
  }

  Future<void> _loadUnreadNotificationCount() async {
    if (email.isEmpty || isLoadingNotifications) return;

    setState(() {
      isLoadingNotifications = true;
    });

    try {
      final encodedEmail = Uri.encodeComponent(email);

      final response = await http.get(
        Uri.parse('$backendUrl/api/notifications/unread-count/$encodedEmail'),
        headers: const {'Accept': 'application/json'},
      );

      if (response.statusCode == 200) {
        final dynamic decodedResponse = jsonDecode(response.body);

        if (decodedResponse is Map<String, dynamic>) {
          final dynamic rawCount = decodedResponse['unread_count'] ?? 0;

          if (!mounted) return;

          setState(() {
            unreadNotificationCount = int.tryParse(rawCount.toString()) ?? 0;
          });
        }
      } else {
        debugPrint(
          'Unable to load notification count. '
          'Status: ${response.statusCode}, '
          'Body: ${response.body}',
        );
      }
    } catch (error) {
      debugPrint('Notification count error: $error');
    } finally {
      if (mounted) {
        setState(() {
          isLoadingNotifications = false;
        });
      }
    }
  }

  Future<void> _openScreen(Widget screen) async {
    await Navigator.of(
      context,
    ).push(MaterialPageRoute<void>(builder: (context) => screen));

    await _loadUnreadNotificationCount();
  }

  void _openUploadScreen() {
    _openScreen(const DocumentUploadScreen());
  }

  void _openMyApplicationsScreen() {
    _openScreen(const my_applications.MyApplicationsScreen());
  }

  void _openStatusScreen() {
    _openScreen(const StatusScreen());
  }

  void _openNotificationsScreen() {
    _openScreen(const app_notifications.NotificationsScreen());
  }

  void _openProfileScreen() {
    _openScreen(const ProfileScreen());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
          t('Dashboard', 'Dashboard'),
          style: const TextStyle(
            fontFamily: 'Inter',
            fontWeight: FontWeight.w600,
          ),
        ),
        backgroundColor: primaryRed,
        foregroundColor: Colors.white,
        centerTitle: true,
        actions: [
          _buildNotificationButton(),
          IconButton(
            tooltip: t('Profile', 'Profile'),
            icon: const Icon(Icons.person_outline),
            onPressed: _openProfileScreen,
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            if (firstName.isNotEmpty) _buildWelcomeSection(),

            Expanded(
              child: RefreshIndicator(
                onRefresh: _loadUnreadNotificationCount,
                child: GridView.count(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.all(16),
                  crossAxisCount: 2,
                  crossAxisSpacing: 16,
                  mainAxisSpacing: 16,
                  children: [
                    _buildModuleCard(
                      icon: Icons.upload_file,
                      label: t('Upload Document', 'Mag-upload ng Dokumento'),
                      onTap: _openUploadScreen,
                    ),
                    _buildModuleCard(
                      icon: Icons.folder_copy_outlined,
                      label: t('My Applications', 'Aking mga Application'),
                      onTap: _openMyApplicationsScreen,
                    ),
                    _buildModuleCard(
                      icon: Icons.manage_search,
                      label: t('Track by UID', 'Hanapin gamit ang UID'),
                      onTap: _openStatusScreen,
                    ),
                    _buildModuleCard(
                      icon: Icons.notifications_none,
                      label: t('Notifications', 'Mga Abiso'),
                      badgeCount: unreadNotificationCount,
                      onTap: _openNotificationsScreen,
                    ),
                  ],
                ),
              ),
            ),

            Container(
              padding: const EdgeInsets.symmetric(vertical: 16),
              color: Colors.white,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  _languageButton('English', true),
                  const SizedBox(width: 12),
                  _languageButton('Tagalog', false),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildWelcomeSection() {
    final fullName = '$firstName $lastName'.trim();

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.fromLTRB(16, 16, 16, 0),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: primaryRed.withOpacity(0.08),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        t('Welcome, $fullName!', 'Maligayang pagdating, $fullName!'),
        style: const TextStyle(
          fontFamily: 'Inter',
          fontSize: 18,
          fontWeight: FontWeight.w600,
          color: Colors.black87,
        ),
      ),
    );
  }

  Widget _buildNotificationButton() {
    return Stack(
      alignment: Alignment.center,
      children: [
        IconButton(
          tooltip: t('Notifications', 'Mga Abiso'),
          icon: const Icon(Icons.notifications_outlined),
          onPressed: _openNotificationsScreen,
        ),
        if (unreadNotificationCount > 0)
          Positioned(
            right: 6,
            top: 6,
            child: IgnorePointer(
              child: Container(
                constraints: const BoxConstraints(minWidth: 18, minHeight: 18),
                padding: const EdgeInsets.symmetric(horizontal: 4),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: primaryRed, width: 1.5),
                ),
                alignment: Alignment.center,
                child: Text(
                  unreadNotificationCount > 99
                      ? '99+'
                      : unreadNotificationCount.toString(),
                  style: const TextStyle(
                    color: primaryRed,
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildModuleCard({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
    int badgeCount = 0,
  }) {
    return Card(
      elevation: 4,
      color: Colors.white,
      clipBehavior: Clip.antiAlias,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Stack(
            children: [
              Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(icon, size: 48, color: primaryRed),
                    const SizedBox(height: 16),
                    Text(
                      label,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontFamily: 'Inter',
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: Colors.black87,
                      ),
                    ),
                  ],
                ),
              ),
              if (badgeCount > 0)
                Positioned(
                  right: 0,
                  top: 0,
                  child: Container(
                    constraints: const BoxConstraints(
                      minWidth: 24,
                      minHeight: 24,
                    ),
                    padding: const EdgeInsets.symmetric(horizontal: 6),
                    decoration: BoxDecoration(
                      color: primaryRed,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      badgeCount > 99 ? '99+' : badgeCount.toString(),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _languageButton(String label, bool english) {
    const Color mediumGrey = Color(0xFF757575);

    return GestureDetector(
      onTap: () {
        if (isEnglish == english) return;

        setState(() {
          isEnglish = english;
        });
      },
      child: Text(
        label,
        style: TextStyle(
          fontFamily: 'Inter',
          fontWeight: FontWeight.w600,
          color: isEnglish == english ? primaryRed : mediumGrey,
        ),
      ),
    );
  }
}
