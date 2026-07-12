import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import 'login_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  static const Color primaryRed = Color(0xFFD32F2F);
  static const Color lightRed = Color(0xFFFFEBEE);

  static const String backendUrl =
      'https://audisure-document-verification-system.onrender.com';

  String firstName = '';
  String lastName = '';
  String email = '';
  String role = '';
  String accountStatus = '';

  bool isLoading = true;
  String? errorMessage;

  @override
  void initState() {
    super.initState();
    _initializeProfile();
  }

  Future<void> _initializeProfile() async {
    final prefs = await SharedPreferences.getInstance();

    final savedEmail =
        prefs.getString('email') ?? prefs.getString('user_email') ?? '';

    if (savedEmail.trim().isEmpty) {
      if (!mounted) return;

      setState(() {
        email = '';
        isLoading = false;
        errorMessage =
            'Unable to identify the logged-in account. Please log in again.';
      });

      return;
    }

    email = savedEmail.trim();

    await _loadProfileFromDatabase();
  }

  Future<void> _loadProfileFromDatabase() async {
    if (email.isEmpty) return;

    if (mounted) {
      setState(() {
        isLoading = true;
        errorMessage = null;
      });
    }

    try {
      final encodedEmail = Uri.encodeComponent(email);

      final response = await http.get(
        Uri.parse('$backendUrl/api/auth/profile/$encodedEmail'),
        headers: const {'Accept': 'application/json'},
      );

      if (response.statusCode != 200) {
        throw Exception(
          'Server returned ${response.statusCode}: ${response.body}',
        );
      }

      final dynamic decodedBody = jsonDecode(response.body);

      if (decodedBody is! Map<String, dynamic>) {
        throw Exception('Invalid profile response.');
      }

      final dynamic userData = decodedBody['user'] ?? decodedBody['data'];

      if (userData is! Map) {
        throw Exception('User information was not returned.');
      }

      final user = Map<String, dynamic>.from(userData);

      final loadedFirstName =
          (user['first_name'] ?? user['firstName'] ?? '').toString().trim();

      final loadedLastName =
          (user['last_name'] ?? user['lastName'] ?? '').toString().trim();

      final loadedEmail = (user['email'] ?? email).toString().trim();

      final loadedRole = (user['role'] ?? '').toString().trim();

      final loadedStatus = (user['status'] ?? '').toString().trim();

      final prefs = await SharedPreferences.getInstance();

      // Update local values using the latest database information.
      await prefs.setString('first_name', loadedFirstName);
      await prefs.setString('last_name', loadedLastName);
      await prefs.setString('email', loadedEmail);
      await prefs.setString('user_email', loadedEmail);
      await prefs.setString('user_role', loadedRole);
      await prefs.setString('user_status', loadedStatus);

      if (!mounted) return;

      setState(() {
        firstName = loadedFirstName;
        lastName = loadedLastName;
        email = loadedEmail;
        role = loadedRole;
        accountStatus = loadedStatus;

        isLoading = false;
        errorMessage = null;
      });
    } catch (error) {
      debugPrint('Profile loading error: $error');

      if (!mounted) return;

      setState(() {
        isLoading = false;
        errorMessage = 'Unable to load your profile from the database.';
      });
    }
  }

  Future<void> _logout() async {
    final prefs = await SharedPreferences.getInstance();

    await prefs.clear();

    if (!mounted) return;

    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute<void>(builder: (context) => const LoginScreen()),
      (route) => false,
    );
  }

  void _showProfilePictureMessage() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Profile picture uploading will be available soon.'),
      ),
    );
  }

  String get fullName {
    final value = '$firstName $lastName'.trim();

    return value.isEmpty ? 'Applicant' : value;
  }

  String get initials {
    final firstInitial = firstName.isNotEmpty ? firstName[0].toUpperCase() : '';

    final lastInitial = lastName.isNotEmpty ? lastName[0].toUpperCase() : '';

    final value = '$firstInitial$lastInitial';

    return value.isEmpty ? 'A' : value;
  }

  String _formatRole(String value) {
    if (value.trim().isEmpty) return 'Applicant';

    return value
        .replaceAll('_', ' ')
        .split(' ')
        .where((word) => word.isNotEmpty)
        .map(
          (word) =>
              '${word[0].toUpperCase()}${word.substring(1).toLowerCase()}',
        )
        .join(' ');
  }

  String _formatStatus(String value) {
    if (value.trim().isEmpty) return 'Active';

    return value
        .replaceAll('_', ' ')
        .split(' ')
        .where((word) => word.isNotEmpty)
        .map(
          (word) =>
              '${word[0].toUpperCase()}${word.substring(1).toLowerCase()}',
        )
        .join(' ');
  }

  Color _statusColor(String status) {
    switch (status.toLowerCase()) {
      case 'approved':
      case 'active':
      case 'verified':
        return Colors.green;

      case 'pending':
        return Colors.orange;

      case 'rejected':
      case 'disabled':
        return Colors.red;

      default:
        return Colors.blueGrey;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: lightRed,
      appBar: AppBar(
        title: const Text(
          'My Profile',
          style: TextStyle(fontFamily: 'Inter', fontWeight: FontWeight.w600),
        ),
        backgroundColor: primaryRed,
        foregroundColor: Colors.white,
        centerTitle: true,
        actions: [
          IconButton(
            tooltip: 'Refresh profile',
            onPressed: isLoading ? null : _loadProfileFromDatabase,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _loadProfileFromDatabase,
          child: _buildBody(),
        ),
      ),
    );
  }

  Widget _buildBody() {
    if (isLoading) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: const [
          SizedBox(height: 220),
          Center(child: CircularProgressIndicator(color: primaryRed)),
        ],
      );
    }

    if (errorMessage != null) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(24),
        children: [
          const SizedBox(height: 120),
          const Icon(
            Icons.account_circle_outlined,
            size: 88,
            color: Colors.grey,
          ),
          const SizedBox(height: 20),
          Text(
            errorMessage!,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontFamily: 'Inter',
              fontSize: 16,
              color: Colors.black87,
            ),
          ),
          const SizedBox(height: 24),
          Center(
            child: ElevatedButton.icon(
              onPressed: _loadProfileFromDatabase,
              icon: const Icon(Icons.refresh),
              label: const Text('Try Again'),
              style: ElevatedButton.styleFrom(
                backgroundColor: primaryRed,
                foregroundColor: Colors.white,
              ),
            ),
          ),
          const SizedBox(height: 12),
          Center(
            child: TextButton(onPressed: _logout, child: const Text('Log out')),
          ),
        ],
      );
    }

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(20),
      children: [
        _buildProfileHeader(),
        const SizedBox(height: 18),
        _buildPersonalInformationCard(),
        const SizedBox(height: 18),
        _buildAccountCard(),
        const SizedBox(height: 24),
        _buildLogoutButton(),
        const SizedBox(height: 20),
      ],
    );
  }

  Widget _buildProfileHeader() {
    return Card(
      elevation: 3,
      color: Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 26),
        child: Column(
          children: [
            Stack(
              clipBehavior: Clip.none,
              children: [
                CircleAvatar(
                  radius: 55,
                  backgroundColor: primaryRed.withOpacity(0.12),
                  child: Text(
                    initials,
                    style: const TextStyle(
                      fontFamily: 'Inter',
                      color: primaryRed,
                      fontWeight: FontWeight.w700,
                      fontSize: 34,
                    ),
                  ),
                ),
                Positioned(
                  right: -2,
                  bottom: 0,
                  child: Material(
                    color: primaryRed,
                    shape: const CircleBorder(),
                    elevation: 3,
                    child: InkWell(
                      customBorder: const CircleBorder(),
                      onTap: _showProfilePictureMessage,
                      child: const Padding(
                        padding: EdgeInsets.all(10),
                        child: Icon(
                          Icons.camera_alt_outlined,
                          color: Colors.white,
                          size: 20,
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 18),
            Text(
              fullName,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontFamily: 'Inter',
                fontSize: 23,
                fontWeight: FontWeight.w700,
                color: Color(0xFF303030),
              ),
            ),
            const SizedBox(height: 6),
            Text(
              email,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontFamily: 'Inter',
                fontSize: 15,
                color: Colors.black54,
              ),
            ),
            const SizedBox(height: 16),
            OutlinedButton.icon(
              onPressed: _showProfilePictureMessage,
              icon: const Icon(Icons.add_a_photo_outlined),
              label: const Text('Change Profile Picture'),
              style: OutlinedButton.styleFrom(
                foregroundColor: primaryRed,
                side: const BorderSide(color: primaryRed),
                padding: const EdgeInsets.symmetric(
                  horizontal: 18,
                  vertical: 12,
                ),
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Image uploading will be added in a future update.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontFamily: 'Inter',
                fontSize: 12,
                color: Colors.grey,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPersonalInformationCard() {
    return Card(
      elevation: 2,
      color: Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Personal Information',
              style: TextStyle(
                fontFamily: 'Inter',
                fontSize: 17,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 20),
            _buildInformationRow(
              icon: Icons.person_outline,
              label: 'First Name',
              value: firstName.isEmpty ? 'Not provided' : firstName,
            ),
            const Divider(height: 30),
            _buildInformationRow(
              icon: Icons.badge_outlined,
              label: 'Last Name',
              value: lastName.isEmpty ? 'Not provided' : lastName,
            ),
            const Divider(height: 30),
            _buildInformationRow(
              icon: Icons.email_outlined,
              label: 'Email Address',
              value: email,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAccountCard() {
    final formattedStatus = _formatStatus(accountStatus);

    final statusColor = _statusColor(accountStatus);

    return Card(
      elevation: 2,
      color: Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Account Information',
              style: TextStyle(
                fontFamily: 'Inter',
                fontSize: 17,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 20),
            _buildInformationRow(
              icon: Icons.admin_panel_settings_outlined,
              label: 'Account Role',
              value: _formatRole(role),
            ),
            const Divider(height: 30),
            Row(
              children: [
                Icon(
                  Icons.verified_user_outlined,
                  color: statusColor,
                  size: 24,
                ),
                const SizedBox(width: 14),
                const Expanded(
                  child: Text(
                    'Account Status',
                    style: TextStyle(
                      fontFamily: 'Inter',
                      fontSize: 14,
                      color: Colors.black54,
                    ),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: statusColor.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    formattedStatus,
                    style: TextStyle(
                      fontFamily: 'Inter',
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: statusColor,
                    ),
                  ),
                ),
              ],
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
        const SizedBox(width: 2),
        Icon(icon, color: primaryRed, size: 24),
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
                  color: Colors.black54,
                ),
              ),
              const SizedBox(height: 5),
              Text(
                value,
                style: const TextStyle(
                  fontFamily: 'Inter',
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF303030),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildLogoutButton() {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton.icon(
        onPressed: _logout,
        icon: const Icon(Icons.logout),
        label: const Text(
          'Logout',
          style: TextStyle(
            fontFamily: 'Inter',
            fontWeight: FontWeight.w600,
            fontSize: 16,
          ),
        ),
        style: ElevatedButton.styleFrom(
          backgroundColor: primaryRed,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ),
    );
  }
}
