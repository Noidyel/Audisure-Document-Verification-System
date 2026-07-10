import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({Key? key}) : super(key: key);

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  bool isEnglish = true;

  String t(String en, String tl) => isEnglish ? en : tl;

  List<Map<String, String>> notifications = [];
  bool isLoading = true;
  String errorMessage = '';

  @override
  void initState() {
    super.initState();
    loadUserEmailAndFetchNotifications();
  }

  Future<void> loadUserEmailAndFetchNotifications() async {
    final prefs = await SharedPreferences.getInstance();
    final email = prefs.getString('user_email') ?? ''; // Adjust key as you save email

    if (email.isEmpty) {
      setState(() {
        errorMessage = 'User email not found.';
        isLoading = false;
      });
      return;
    }

    await fetchNotifications(email);
  }

  Future<void> fetchNotifications(String email) async {
    try {
      final response = await http.post(
        Uri.parse('http://192.168.254.100/audisure/audisure_app/audisure_api/get_notifications.php'),
        body: {'email': email},
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['error'] != null) {
          setState(() {
            errorMessage = data['error'];
            isLoading = false;
          });
        } else {
          List<Map<String, String>> fetchedNotifications = [];

          for (var notif in data['notifications']) {
            fetchedNotifications.add({
              'title': notif['title'] ?? '',
              'title_tl': notif['title_tl'] ?? '',
              'message': notif['message'] ?? '',
              'message_tl': notif['message_tl'] ?? '',
              'created_at': notif['created_at'] ?? '',
            });
          }

          setState(() {
            notifications = fetchedNotifications;
            isLoading = false;
          });
        }
      } else {
        setState(() {
          errorMessage = 'Failed to load notifications.';
          isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        errorMessage = 'Error: $e';
        isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    const Color primaryRed = Color(0xFFD32F2F);
    const Color white = Colors.white;
    const Color darkGrey = Color(0xFF424242);
    const Color lightGrey = Color(0xFFEEEEEE);

    return Scaffold(
      backgroundColor: lightGrey,
      appBar: AppBar(
        title: Text(
          t('Notifications', 'Notipikasyon'),
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
        child: isLoading
            ? const Center(child: CircularProgressIndicator())
            : errorMessage.isNotEmpty
                ? Center(child: Text(errorMessage))
                : notifications.isEmpty
                    ? Center(child: Text(t('No notifications yet.', 'Walang mga notipikasyon pa.')))
                    : Column(
                        children: [
                          Expanded(
                            child: ListView.builder(
                              padding: const EdgeInsets.all(16),
                              itemCount: notifications.length,
                              itemBuilder: (context, index) {
                                final notification = notifications[index];
                                return Card(
                                  margin: const EdgeInsets.only(bottom: 16),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  elevation: 2,
                                  child: Padding(
                                    padding: const EdgeInsets.all(16),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          t(notification['title']!, notification['title_tl']!),
                                          style: TextStyle(
                                            fontFamily: 'Inter',
                                            fontSize: 16,
                                            fontWeight: FontWeight.w700,
                                            color: primaryRed,
                                          ),
                                        ),
                                        const SizedBox(height: 8),
                                        Text(
                                          t(notification['message']!, notification['message_tl']!),
                                          style: const TextStyle(
                                            fontFamily: 'Inter',
                                            fontSize: 14,
                                            color: darkGrey,
                                          ),
                                        ),
                                        const SizedBox(height: 8),
                                        Text(
                                          notification['created_at'] ?? '',
                                          style: const TextStyle(
                                            fontFamily: 'Inter',
                                            fontSize: 12,
                                            color: darkGrey,
                                            fontStyle: FontStyle.italic,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                );
                              },
                            ),
                          ),
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
                                    if (!isEnglish) {
                                      setState(() {
                                        isEnglish = true;
                                      });
                                    }
                                  },
                                  child: Text(
                                    'English',
                                    style: TextStyle(
                                      fontFamily: 'Inter',
                                      color: isEnglish ? primaryRed : Colors.grey,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Container(height: 20, width: 1, color: lightGrey),
                                const SizedBox(width: 12),
                                GestureDetector(
                                  onTap: () {
                                    if (isEnglish) {
                                      setState(() {
                                        isEnglish = false;
                                      });
                                    }
                                  },
                                  child: Text(
                                    'Tagalog',
                                    style: TextStyle(
                                      fontFamily: 'Inter',
                                      color: !isEnglish ? primaryRed : Colors.grey,
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
