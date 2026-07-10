import 'package:flutter/material.dart';

class StatusResultScreen extends StatefulWidget {
  final String status;
  final String documentUid;  // Added this

  const StatusResultScreen({
    Key? key,
    required this.status,
    required this.documentUid,
  }) : super(key: key);

  @override
  State<StatusResultScreen> createState() => _StatusResultScreenState();
}

class _StatusResultScreenState extends State<StatusResultScreen> {
  bool isEnglish = true;

  String t(String en, String tl) => isEnglish ? en : tl;

  String getStatusMessage() {
    switch (widget.status.toLowerCase()) {
      case 'approved':
        return t(
          "Congratulations! The document has been approved. Please visit the HCDRD building for further instructions.",
          "Congratulations! Naaprubahan ang dokumento. Pumunta sa HCDRD building para sa karagdagang instruksyon."
        );
      case 'rejected':
        return t(
          "The submitted document has been rejected. Please visit the HCDRD building for further instructions.",
          "Ang dokumento ay hindi naaprubahan. Pumunta sa HCDRD building para sa karagdagang instruksyon."
        );
      case 'pending':
      default:
        return t(
          "The document is still pending. It takes 3-5 business days.",
          "Ang dokumento ay pinoproseso pa. Ito ay tumatagal ng 3-5 araw ng trabaho."
        );
    }
  }

  // New message for pending documents
  String getProcessingMessage() {
    return t(
      "The document you typed with a UID of: ${widget.documentUid} is still currently being processed. You will get notified as soon as the status changes.",
      "Ang dokumento na may UID na: ${widget.documentUid} ay pinoproseso pa. Makakatanggap ka ng abiso kapag nagbago ang status."
    );
  }

  Color getStatusColor() {
    switch (widget.status.toLowerCase()) {
      case 'approved':
        return const Color(0xFF388E3C);
      case 'rejected':
        return const Color(0xFFD32F2F);
      default:
        return const Color(0xFFF57C00);
    }
  }

  Color getStatusBackgroundColor() {
    switch (widget.status.toLowerCase()) {
      case 'approved':
        return const Color(0xFFE8F5E9);
      case 'rejected':
        return const Color(0xFFFFEBEE);
      default:
        return const Color(0xFFFFF3E0);
    }
  }

  void _logout() {
    Navigator.pushNamedAndRemoveUntil(context, '/login', (route) => false);
  }

  void _openNotifications() {
    Navigator.pushNamed(context, '/notifications');
  }

  @override
  Widget build(BuildContext context) {
    const Color primaryRed = Color(0xFFD32F2F);
    const Color white = Colors.white;
    const Color darkGrey = Color(0xFF424242);
    const Color mediumGrey = Color(0xFF757575);
    const Color lightGrey = Color(0xFFEEEEEE);

    return Scaffold(
      backgroundColor: const Color(0xFFFFEBEE),
      appBar: AppBar(
        title: Text(
          t("Document Status", "Status ng Dokumento"),
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
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications, color: white),
            tooltip: t("Notifications", "Notipikasyon"),
            onPressed: _openNotifications,
          )
        ],
      ),
      body: SafeArea(
        child: Stack(
          children: [
            Column(
              children: [
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      children: [
                        Card(
                          color: getStatusBackgroundColor(),
                          elevation: 2,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                            side: BorderSide(
                              color: getStatusColor(),
                              width: 2,
                            ),
                          ),
                          child: Padding(
                            padding: const EdgeInsets.all(24),
                            child: Column(
                              children: [
                                Icon(
                                  widget.status.toLowerCase() == 'approved' 
                                    ? Icons.check_circle_outline
                                    : widget.status.toLowerCase() == 'rejected'
                                      ? Icons.error_outline
                                      : Icons.access_time,
                                  size: 48,
                                  color: getStatusColor(),
                                ),
                                const SizedBox(height: 20),
                                Text(
                                  widget.status.toLowerCase() == 'approved'
                                    ? t("APPROVED", "NAAPRUBAHAN")
                                    : widget.status.toLowerCase() == 'rejected'
                                      ? t("REJECTED", "HINDI NAAPRUBAHAN")
                                      : t("PENDING", "PAGPOPROSESO"),
                                  style: TextStyle(
                                    fontFamily: 'Inter',
                                    fontSize: 24,
                                    fontWeight: FontWeight.w700,
                                    color: getStatusColor(),
                                  ),
                                ),
                                const SizedBox(height: 20),
                                Text(
                                  getStatusMessage(),
                                  textAlign: TextAlign.center,
                                  style: const TextStyle(
                                    fontFamily: 'Inter',
                                    fontSize: 16,
                                    color: darkGrey,
                                  ),
                                ),
                                if (widget.status.toLowerCase() == 'pending') ...[
                                  const SizedBox(height: 20),
                                  Text(
                                    getProcessingMessage(),
                                    textAlign: TextAlign.center,
                                    style: const TextStyle(
                                      fontFamily: 'Inter',
                                      fontSize: 16,
                                      color: darkGrey,
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
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
                            color: isEnglish ? primaryRed : mediumGrey,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        child: Container(
                          height: 20,
                          width: 1,
                          color: lightGrey,
                        ),
                      ),
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
            Positioned(
              bottom: 80,
              right: 16,
              child: ElevatedButton(
                onPressed: _logout,
                style: ElevatedButton.styleFrom(
                  backgroundColor: primaryRed,
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                  textStyle: const TextStyle(
                    fontFamily: 'Inter',
                    fontWeight: FontWeight.w600,
                    fontSize: 16,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                  elevation: 2,
                ),
                child: Text(
                  t("Logout", "Mag-logout"),
                  style: const TextStyle(color: white),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
