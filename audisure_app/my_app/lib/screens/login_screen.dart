import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'dashboard_screen.dart';
import '../config/api_config.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({Key? key}) : super(key: key);

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final TextEditingController emailController = TextEditingController();
  final TextEditingController passwordController = TextEditingController();
  bool isLoading = false;
  bool isEnglish = true;
  bool _obscurePassword = true;

  String t(String en, String tl) => isEnglish ? en : tl;

  Future<void> _login() async {
    final email = emailController.text.trim();
    final password = passwordController.text.trim();

    if (email.isEmpty || password.isEmpty) {
      _showMessage(
        t(
          "Please enter your email and password",
          "Paki-type ang iyong email at password",
        ),
      );
      return;
    }

    setState(() => isLoading = true);

    try {
      final url = Uri.parse('${ApiConfig.baseUrl}/api/auth/login');
      final response = await http
          .post(
            url,
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'email': email, 'password': password}),
          )
          .timeout(const Duration(seconds: 10));

      setState(() => isLoading = false);

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);

        if (data['success'] == true && data['user'] != null) {
          final user = data['user'];
          final prefs = await SharedPreferences.getInstance();

          // ✅ Store user details for profile & status screens
          await prefs.setInt('user_id', user['id']);
          await prefs.setString('user_email', user['email'] ?? '');
          await prefs.setString('first_name', user['firstName'] ?? '');
          await prefs.setString('last_name', user['lastName'] ?? '');
          await prefs.setString('user_role', user['role'] ?? '');
          await prefs.setString('user_status', user['status'] ?? '');

          _showMessage(t("Login successful", "Matagumpay ang pag-login"));

          // Navigate to dashboard after successful login
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(builder: (context) => const DashboardScreen()),
          );
        } else {
          _showMessage(
            data['message'] ??
                t(
                  "Login failed. Please check your credentials.",
                  "Bigo ang pag-login. Pakisuri ang iyong impormasyon.",
                ),
          );
        }
      } else if (response.statusCode == 404) {
        _showMessage(
          t(
            "Server not found. Please try again later.",
            "Hindi mahanap ang server. Subukan muli mamaya.",
          ),
        );
      } else if (response.statusCode >= 500) {
        _showMessage(
          t(
            "Server error. Please try again later.",
            "May problema sa server. Subukan muli mamaya.",
          ),
        );
      } else {
        _showMessage(
          t(
            "Login failed. Please check your details.",
            "Bigo ang pag-login. Pakisuri ang iyong impormasyon.",
          ),
        );
      }
    } catch (e) {
      setState(() => isLoading = false);
      _showMessage(
        t(
          "Connection failed. Please check your internet connection.",
          "Nabigo ang koneksyon. Pakisuri ang iyong internet.",
        ),
      );
      print("Login error: $e");
    }
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          message,
          style: const TextStyle(fontFamily: 'Inter', fontSize: 16),
        ),
        backgroundColor: const Color(0xFFD32F2F),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    const Color primaryRed = Color(0xFFD32F2F);
    const Color lightRed = Color(0xFFFFEBEE);
    const Color white = Colors.white;
    const Color darkGrey = Color(0xFF424242);
    const Color mediumGrey = Color(0xFF757575);
    const Color lightGrey = Color(0xFFEEEEEE);

    return Scaffold(
      backgroundColor: lightRed,
      appBar: AppBar(
        title: Text(
          t("Applicant Login", "Pag-login ng Aplikante"),
          style: const TextStyle(
            fontFamily: 'Inter',
            fontWeight: FontWeight.w600,
            fontSize: 20,
            color: white,
          ),
        ),
        backgroundColor: primaryRed,
        centerTitle: true,
        elevation: 0,
        shape: const ContinuousRectangleBorder(
          borderRadius: BorderRadius.only(
            bottomLeft: Radius.circular(24),
            bottomRight: Radius.circular(24),
          ),
        ),
        toolbarHeight: 80,
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: Column(
                  children: [
                    // Header Card
                    Card(
                      color: white,
                      elevation: 2,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(20),
                        child: Column(
                          children: [
                            const Icon(
                              Icons.account_circle_outlined,
                              size: 48,
                              color: primaryRed,
                            ),
                            const SizedBox(height: 16),
                            Text(
                              t("Welcome Back", "Maligayang Pagbabalik"),
                              style: const TextStyle(
                                fontFamily: 'Inter',
                                fontSize: 18,
                                fontWeight: FontWeight.w600,
                                color: darkGrey,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              t(
                                "Log in to check your document status",
                                "Mag-login para makita ang status ng dokumento",
                              ),
                              style: const TextStyle(
                                fontFamily: 'Inter',
                                fontSize: 14,
                                color: mediumGrey,
                              ),
                              textAlign: TextAlign.center,
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 32),

                    // Login Form Card
                    Card(
                      color: white,
                      elevation: 2,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(20),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              "Email",
                              style: TextStyle(
                                fontFamily: 'Inter',
                                fontSize: 14,
                                fontWeight: FontWeight.w500,
                                color: darkGrey,
                              ),
                            ),
                            const SizedBox(height: 8),
                            TextField(
                              controller: emailController,
                              keyboardType: TextInputType.emailAddress,
                              style: const TextStyle(
                                fontFamily: 'Inter',
                                color: darkGrey,
                              ),
                              decoration: InputDecoration(
                                filled: true,
                                fillColor: lightGrey,
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(8),
                                  borderSide: BorderSide.none,
                                ),
                                contentPadding: const EdgeInsets.symmetric(
                                  horizontal: 16,
                                  vertical: 14,
                                ),
                                hintText: "your.email@example.com",
                                hintStyle: const TextStyle(color: mediumGrey),
                              ),
                            ),
                            const SizedBox(height: 20),
                            const Text(
                              "Password",
                              style: TextStyle(
                                fontFamily: 'Inter',
                                fontSize: 14,
                                fontWeight: FontWeight.w500,
                                color: darkGrey,
                              ),
                            ),
                            const SizedBox(height: 8),
                            TextField(
                              controller: passwordController,
                              obscureText: _obscurePassword,
                              style: const TextStyle(
                                fontFamily: 'Inter',
                                color: darkGrey,
                              ),
                              decoration: InputDecoration(
                                filled: true,
                                fillColor: lightGrey,
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(8),
                                  borderSide: BorderSide.none,
                                ),
                                contentPadding: const EdgeInsets.symmetric(
                                  horizontal: 16,
                                  vertical: 14,
                                ),
                                hintText: t(
                                  "Enter password",
                                  "Ilagay ang password",
                                ),
                                hintStyle: const TextStyle(color: mediumGrey),
                                suffixIcon: IconButton(
                                  icon: Icon(
                                    _obscurePassword
                                        ? Icons.visibility_off
                                        : Icons.visibility,
                                    color: mediumGrey,
                                  ),
                                  onPressed: () {
                                    setState(() {
                                      _obscurePassword = !_obscurePassword;
                                    });
                                  },
                                ),
                              ),
                            ),
                            const SizedBox(height: 24),
                            SizedBox(
                              width: double.infinity,
                              child: ElevatedButton(
                                onPressed: isLoading ? null : _login,
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: primaryRed,
                                  padding: const EdgeInsets.symmetric(
                                    vertical: 16,
                                  ),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                ),
                                child:
                                    isLoading
                                        ? const SizedBox(
                                          width: 20,
                                          height: 20,
                                          child: CircularProgressIndicator(
                                            color: white,
                                            strokeWidth: 2,
                                          ),
                                        )
                                        : Text(
                                          t("Login", "Mag-login"),
                                          style: const TextStyle(
                                            fontFamily: 'Inter',
                                            fontWeight: FontWeight.w600,
                                            fontSize: 16,
                                            color: white,
                                          ),
                                        ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextButton(
                      onPressed:
                          () => Navigator.pushNamed(context, '/register'),
                      child: Text(
                        t(
                          "Don't have an account? Register here",
                          "Wala ka pang account? Magparehistro dito",
                        ),
                        style: const TextStyle(
                          fontFamily: 'Inter',
                          fontSize: 14,
                          color: primaryRed,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Language Toggle Bar
            Container(
              padding: const EdgeInsets.symmetric(vertical: 16),
              decoration: BoxDecoration(
                color: white,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.1),
                    blurRadius: 10,
                    offset: const Offset(0, -5),
                  ),
                ],
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  GestureDetector(
                    onTap: () {
                      if (!isEnglish) setState(() => isEnglish = true);
                    },
                    child: Text(
                      'English',
                      style: TextStyle(
                        fontFamily: 'Inter',
                        color: isEnglish ? primaryRed : mediumGrey,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    child: Container(height: 20, width: 1, color: lightGrey),
                  ),
                  GestureDetector(
                    onTap: () {
                      if (isEnglish) setState(() => isEnglish = false);
                    },
                    child: Text(
                      'Tagalog',
                      style: TextStyle(
                        fontFamily: 'Inter',
                        color: !isEnglish ? primaryRed : mediumGrey,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
