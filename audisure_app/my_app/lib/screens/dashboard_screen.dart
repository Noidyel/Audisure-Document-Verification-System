import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'document_upload_screen.dart';
import 'status_screen.dart';
import 'profile_screen.dart'; // ✅ Import the ProfileScreen

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({Key? key}) : super(key: key);

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  String firstName = '';
  String lastName = '';
  bool isEnglish = true;

  String t(String en, String tl) => isEnglish ? en : tl;

  @override
  void initState() {
    super.initState();
    _loadUserData();
  }

  Future<void> _loadUserData() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      firstName = prefs.getString('first_name') ?? '';
      lastName = prefs.getString('last_name') ?? '';
    });
  }

  @override
  Widget build(BuildContext context) {
    const Color primaryRed = Color(0xFFD32F2F);
    const Color white = Colors.white;

    return Scaffold(
      appBar: AppBar(
        title: Text(
          t("Dashboard", "Dashboard"),
          style: const TextStyle(
            fontFamily: 'Inter',
            fontWeight: FontWeight.w600,
          ),
        ),
        backgroundColor: primaryRed,
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.person_outline),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const ProfileScreen()),
              );
            },
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: GridView.count(
                  crossAxisCount: 2,
                  crossAxisSpacing: 16,
                  mainAxisSpacing: 16,
                  children: [
                    // In the DashboardScreen GridView
_buildModuleCard(
  icon: Icons.upload_file,
  label: t("Document Upload", "Mag-upload ng Dokumento"),
  onTap: () {
    Navigator.push(
      context,
      MaterialPageRoute(
          builder: (context) => const DocumentUploadScreen()),
    );
  },
),
                    _buildModuleCard(
                      icon: Icons.insert_drive_file_outlined,
                      label: t("Document Status", "Status ng Dokumento"),
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                              builder: (context) => const StatusScreen()),
                        );
                      },
                    ),
                  ],
                ),
              ),
            ),
            // Language Toggle
            Container(
              padding: const EdgeInsets.symmetric(vertical: 16),
              color: white,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  _languageButton("English", true),
                  const SizedBox(width: 12),
                  _languageButton("Tagalog", false),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildModuleCard(
      {required IconData icon,
      required String label,
      required VoidCallback onTap}) {
    const Color primaryRed = Color(0xFFD32F2F);
    const Color white = Colors.white;

    return GestureDetector(
      onTap: onTap,
      child: Card(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        elevation: 4,
        color: white,
        child: Padding(
          padding: const EdgeInsets.all(20),
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
      ),
    );
  }

  Widget _languageButton(String label, bool english) {
    const Color primaryRed = Color(0xFFD32F2F);
    const Color mediumGrey = Color(0xFF757575);
    return GestureDetector(
      onTap: () {
        if (isEnglish != english) setState(() => isEnglish = english);
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
