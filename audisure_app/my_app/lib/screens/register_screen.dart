import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../config/api_config.dart';
import "dart:async";

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({Key? key}) : super(key: key);

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final TextEditingController firstNameController = TextEditingController();
  final TextEditingController lastNameController = TextEditingController();
  final TextEditingController emailController = TextEditingController();
  final TextEditingController passwordController = TextEditingController();
  final TextEditingController confirmPasswordController =
      TextEditingController();

  bool isLoading = false;
  bool isEnglish = true;

  String t(String en, String tl) => isEnglish ? en : tl;

  Future<void> _register() async {
    final firstName = firstNameController.text.trim();
    final lastName = lastNameController.text.trim();
    final email = emailController.text.trim().toLowerCase();
    final password = passwordController.text.trim();
    final confirmPassword = confirmPasswordController.text.trim();

    // Validation
    if ([
      firstName,
      lastName,
      email,
      password,
      confirmPassword,
    ].any((field) => field.isEmpty)) {
      _showMessage(
        t("Please fill in all fields.", "Pakiusap punan ang lahat ng patlang."),
      );
      return;
    }

    if (!email.contains("@") || !email.contains(".")) {
      _showMessage(
        t("Enter a valid email address.", "Maglagay ng wastong email address."),
      );
      return;
    }

    if (password.length < 6) {
      _showMessage(
        t(
          "Password must be at least 6 characters.",
          "Ang password ay dapat hindi bababa sa 6 na karakter.",
        ),
      );
      return;
    }

    if (password != confirmPassword) {
      _showMessage(
        t("Passwords do not match.", "Hindi tugma ang mga password."),
      );
      return;
    }

    setState(() {
      isLoading = true;
    });

    try {
      final url = Uri.parse("${ApiConfig.baseUrl}/api/auth/register");

      final response = await http
          .post(
            url,
            headers: {"Content-Type": "application/json"},
            body: jsonEncode({
              // These names must match auth.js
              "firstName": firstName,
              "lastName": lastName,
              "email": email,
              "password": password,
              "role": "applicant",
            }),
          )
          .timeout(const Duration(seconds: 30));

      debugPrint("Register URL: $url");
      debugPrint("Register status: ${response.statusCode}");
      debugPrint("Register response: ${response.body}");

      Map<String, dynamic> data = {};

      try {
        data = jsonDecode(response.body) as Map<String, dynamic>;
      } catch (error) {
        _showMessage(
          t(
            "The server returned an invalid response.",
            "Hindi wastong sagot ang ibinalik ng server.",
          ),
        );
        return;
      }

      if (response.statusCode >= 200 &&
          response.statusCode < 300 &&
          data["success"] == true) {
        _showMessage(
          t(
            "Registration successful! Please wait for account approval.",
            "Matagumpay ang pagpaparehistro! Hintayin ang pag-apruba ng account.",
          ),
        );

        await Future.delayed(const Duration(seconds: 1));

        if (!mounted) return;

        Navigator.pushReplacementNamed(context, "/login");
      } else {
        _showMessage(
          data["message"]?.toString() ??
              t("Registration failed.", "Nabigo ang pagpaparehistro."),
        );
      }
    } on TimeoutException {
      _showMessage(
        t(
          "The server took too long to respond. Please try again.",
          "Masyadong matagal ang tugon ng server. Pakisubukan muli.",
        ),
      );
    } catch (error) {
      debugPrint("Registration error: $error");

      _showMessage(
        t(
          "Network error. Please check your connection.",
          "Walang koneksyon. Pakisuri ang iyong internet.",
        ),
      );
    } finally {
      if (mounted) {
        setState(() {
          isLoading = false;
        });
      }
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
    const double borderRadius = 12.0;

    return Scaffold(
      backgroundColor: lightRed,
      appBar: AppBar(
        title: Text(
          t("Applicant Registration", "Pagpaparehistro ng Aplikante"),
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
                        borderRadius: BorderRadius.circular(borderRadius),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(20),
                        child: Column(
                          children: [
                            const Icon(
                              Icons.person_add_alt_1,
                              size: 48,
                              color: primaryRed,
                            ),
                            const SizedBox(height: 16),
                            Text(
                              t("Create Account", "Gumawa ng Account"),
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
                                "Register to track your document status",
                                "Magparehistro para masubaybayan ang dokumento",
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
                    const SizedBox(height: 24),

                    // Registration Form
                    Card(
                      color: white,
                      elevation: 2,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(borderRadius),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(20),
                        child: Column(
                          children: [
                            _buildTextField(
                              firstNameController,
                              t("First Name", "Pangalan"),
                              icon: Icons.person_outline,
                            ),
                            const SizedBox(height: 16),
                            _buildTextField(
                              lastNameController,
                              t("Last Name", "Apelyido"),
                              icon: Icons.person_outline,
                            ),
                            const SizedBox(height: 16),
                            _buildTextField(
                              emailController,
                              "Email",
                              keyboardType: TextInputType.emailAddress,
                              icon: Icons.email_outlined,
                            ),
                            const SizedBox(height: 16),
                            _buildTextField(
                              passwordController,
                              t("Password", "Password"),
                              obscure: true,
                              icon: Icons.lock_outline,
                            ),
                            const SizedBox(height: 16),
                            _buildTextField(
                              confirmPasswordController,
                              t("Confirm Password", "Kumpirmahin ang Password"),
                              obscure: true,
                              icon: Icons.lock_outline,
                            ),
                            const SizedBox(height: 24),
                            SizedBox(
                              width: double.infinity,
                              child: ElevatedButton(
                                onPressed: isLoading ? null : _register,
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: primaryRed,
                                  padding: const EdgeInsets.symmetric(
                                    vertical: 16,
                                  ),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(
                                      borderRadius,
                                    ),
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
                                          t("Register", "Magparehistro"),
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
                          () =>
                              Navigator.pushReplacementNamed(context, '/login'),
                      child: Text(
                        t(
                          "Already have an account? Login here",
                          "May account ka na? Mag-login dito",
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
                  _languageButton('English', true),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    child: Container(
                      height: 20,
                      width: 1,
                      color: const Color(0xFFEEEEEE),
                    ),
                  ),
                  _languageButton('Tagalog', false),
                ],
              ),
            ),
          ],
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
          color: isEnglish == english ? primaryRed : mediumGrey,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  Widget _buildTextField(
    TextEditingController controller,
    String label, {
    TextInputType keyboardType = TextInputType.text,
    bool obscure = false,
    IconData? icon,
  }) {
    return TextField(
      controller: controller,
      obscureText: obscure,
      keyboardType: keyboardType,
      style: const TextStyle(
        fontSize: 16,
        fontFamily: 'Inter',
        color: Color(0xFF424242),
      ),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: const TextStyle(
          fontFamily: 'Inter',
          color: Color(0xFF757575),
        ),
        prefixIcon: icon != null ? Icon(icon, color: Color(0xFF757575)) : null,
        filled: true,
        fillColor: const Color(0xFFEEEEEE),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8.0),
          borderSide: BorderSide.none,
        ),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16.0,
          vertical: 14.0,
        ),
      ),
    );
  }
}
