import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show rootBundle;
import 'package:image_picker/image_picker.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:pdf/pdf.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:signature/signature.dart';
import '../config/api_config.dart';

class DocumentUploadScreen extends StatefulWidget {
  const DocumentUploadScreen({Key? key}) : super(key: key);

  @override
  State<DocumentUploadScreen> createState() => _DocumentUploadScreenState();
}

class _DocumentUploadScreenState extends State<DocumentUploadScreen> {
  static const String cloudinaryUploadUrl =
      "https://api.cloudinary.com/v1_1/dx78jwu6q/image/upload";
  static const String cloudinaryUploadPreset = "audisure_unsigned";
  static const String backendUploadUrl = "${ApiConfig.baseUrl}/api/upload";

  final ImagePicker _picker = ImagePicker();
  bool isLoading = false;
  bool isEnglish = true;

  String firstName = '';
  String lastName = '';
  String userEmail = '';

  final List<_DocType> docTypes = [
    _DocType(
      title: "Application for Water Connection Clearance",
      code: "WCC",
      requirements: [
        "Barangay Clearance",
        "Valid ID",
        "Proof of Ownership / Contract",
      ],
    ),
    _DocType(
      title: "Application for Electrification Clearance",
      code: "ECC",
      requirements: [
        "Barangay Clearance",
        "Valid ID",
        "Approved Electrical Plan",
      ],
    ),
    _DocType(
      title: "Application for Socialized Housing Unit / Condominium Unit",
      code: "SHC",
      requirements: [
        "Birth Certificate",
        "Certificate of Indigency",
        "Proof of Income",
        "Valid ID",
      ],
    ),
  ];

  _DocType? selectedDocType;
  final Map<int, XFile> pickedImages = {};

  final SignatureController _sigController = SignatureController(
    penStrokeWidth: 2,
    penColor: Colors.black,
    exportBackgroundColor: Colors.white,
  );

  String t(String en, String tl) => isEnglish ? en : tl;

  @override
  void initState() {
    super.initState();
    _loadUserFromPrefs();
  }

  Future<void> _loadUserFromPrefs() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      firstName = prefs.getString('first_name') ?? '';
      lastName = prefs.getString('last_name') ?? '';
      userEmail = prefs.getString('user_email') ?? '';
    });
  }

  Future<void> _pickForRequirement(int reqIndex) async {
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      builder:
          (context) => SafeArea(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                ListTile(
                  leading: const Icon(Icons.camera_alt),
                  title: Text(t("Camera", "Camera")),
                  onTap: () => Navigator.pop(context, ImageSource.camera),
                ),
                ListTile(
                  leading: const Icon(Icons.photo_library),
                  title: Text(t("Gallery", "Gallery")),
                  onTap: () => Navigator.pop(context, ImageSource.gallery),
                ),
                ListTile(
                  leading: const Icon(Icons.close),
                  title: Text(t("Cancel", "Kanselahin")),
                  onTap: () => Navigator.pop(context, null),
                ),
              ],
            ),
          ),
    );

    if (source == null) return;
    final XFile? picked = await _picker.pickImage(
      source: source,
      imageQuality: 75,
    );
    if (picked != null) setState(() => pickedImages[reqIndex] = picked);
  }

  bool _allRequirementsFilled() {
    if (selectedDocType == null) return false;
    return selectedDocType!.requirements.asMap().keys.every(
      (i) => pickedImages[i] != null,
    );
  }

  String _formattedDateDDMMYYYY() {
    final now = DateTime.now();
    final dd = now.day.toString().padLeft(2, '0');
    final mm = now.month.toString().padLeft(2, '0');
    final yyyy = now.year.toString();
    return "$dd$mm$yyyy";
  }

  String _buildFileTitle(String code) {
    final date = _formattedDateDDMMYYYY();
    final initial = firstName.isNotEmpty ? firstName[0].toUpperCase() : "X";
    final last =
        lastName.isNotEmpty
            ? lastName.toUpperCase().replaceAll(' ', '')
            : "UNKNOWN";
    return "$code$date$initial$last";
  }

  Future<pw.MemoryImage> _loadLogo() async {
    final bytes = await rootBundle.load('assets/icon/icon.png');
    return pw.MemoryImage(bytes.buffer.asUint8List());
  }

  Future<void> _generatePdfAndUpload() async {
    if (selectedDocType == null) return;
    if (!_allRequirementsFilled()) {
      _showMessage(
        t(
          "Please supply all required images.",
          "Pakisupply ang lahat ng kinakailangang larawan.",
        ),
      );
      return;
    }

    if (_sigController.isEmpty) {
      _showMessage(
        t(
          "Please provide your digital signature.",
          "Pakilagyan ang digital signature.",
        ),
      );
      return;
    }

    setState(() => isLoading = true);

    try {
      final pdf = pw.Document();
      final logoImage = await _loadLogo();
      final title = selectedDocType!.title;
      final code = selectedDocType!.code;
      final requirementsList = selectedDocType!.requirements;

      final sigBytes = await _sigController.toPngBytes();
      if (sigBytes == null) throw Exception("Signature export failed");
      final signatureImage = pw.MemoryImage(sigBytes);

      // COVER PAGE
      pdf.addPage(
        pw.Page(
          pageFormat: PdfPageFormat.a4,
          build: (ctx) {
            return pw.Padding(
              padding: const pw.EdgeInsets.all(24),
              child: pw.Column(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Row(
                    mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                    children: [
                      pw.Text(
                        "AUDISURE - HCDRD Document Submission",
                        style: pw.TextStyle(
                          fontSize: 22,
                          fontWeight: pw.FontWeight.bold,
                        ),
                      ),
                      pw.Image(logoImage, width: 50, height: 50),
                    ],
                  ),
                  pw.SizedBox(height: 24),
                  pw.Center(
                    child: pw.Text(
                      title,
                      style: pw.TextStyle(
                        fontSize: 20,
                        fontWeight: pw.FontWeight.bold,
                      ),
                    ),
                  ),
                  pw.SizedBox(height: 16),
                  pw.Text(
                    "Date: ${_formattedLongDate(DateTime.now())}",
                    style: pw.TextStyle(
                      fontSize: 12,
                      fontStyle: pw.FontStyle.italic,
                    ),
                  ),
                  pw.Text(
                    "Applicant: ${firstName.isEmpty && lastName.isEmpty ? userEmail : '$firstName $lastName'}",
                    style: pw.TextStyle(
                      fontSize: 12,
                      fontStyle: pw.FontStyle.italic,
                    ),
                  ),
                  pw.SizedBox(height: 12),
                  pw.Text(
                    "Requirements needed:",
                    style: pw.TextStyle(
                      fontSize: 14,
                      fontWeight: pw.FontWeight.bold,
                    ),
                  ),
                  pw.SizedBox(height: 8),
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: List.generate(requirementsList.length, (i) {
                      return pw.Row(
                        children: [
                          pw.Text("• ", style: pw.TextStyle(fontSize: 12)),
                          pw.Expanded(
                            child: pw.Text(
                              requirementsList[i],
                              style: pw.TextStyle(fontSize: 12),
                            ),
                          ),
                        ],
                      );
                    }),
                  ),
                ],
              ),
            );
          },
        ),
      );

      // REQUIREMENT PAGES
      for (var i = 0; i < requirementsList.length; i++) {
        final XFile? xfile = pickedImages[i];
        if (xfile == null) continue;
        final bytes = await xfile.readAsBytes();
        final pwImage = pw.MemoryImage(bytes);

        pdf.addPage(
          pw.Page(
            pageFormat: PdfPageFormat.a4,
            build: (ctx) {
              return pw.Padding(
                padding: const pw.EdgeInsets.all(24),
                child: pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Row(
                      mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                      children: [
                        pw.Text(
                          requirementsList[i],
                          style: pw.TextStyle(
                            fontSize: 16,
                            fontWeight: pw.FontWeight.bold,
                          ),
                        ),
                        pw.Image(logoImage, width: 50, height: 50),
                      ],
                    ),
                    pw.SizedBox(height: 12),
                    pw.Center(child: pw.Image(pwImage, fit: pw.BoxFit.contain)),
                  ],
                ),
              );
            },
          ),
        );
      }

      // SIGNATURE PAGE
      pdf.addPage(
        pw.Page(
          pageFormat: PdfPageFormat.a4,
          build:
              (ctx) => pw.Padding(
                padding: const pw.EdgeInsets.all(24),
                child: pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Text(
                      "Digital Signature:",
                      style: pw.TextStyle(
                        fontSize: 16,
                        fontWeight: pw.FontWeight.bold,
                      ),
                    ),
                    pw.SizedBox(height: 24),
                    pw.Center(
                      child: pw.Image(signatureImage, width: 300, height: 150),
                    ),
                  ],
                ),
              ),
        ),
      );

      final pdfBytes = await pdf.save();
      final fileTitle = _buildFileTitle(code);
      final filename = "$fileTitle.pdf";

      // CLOUDINARY
      final cloudReq = http.MultipartRequest(
        'POST',
        Uri.parse(cloudinaryUploadUrl),
      );
      cloudReq.fields['upload_preset'] = cloudinaryUploadPreset;
      cloudReq.files.add(
        http.MultipartFile.fromBytes('file', pdfBytes, filename: filename),
      );

      final cloudResp = await cloudReq.send();
      final cloudRespBody = await cloudResp.stream.bytesToString();
      if (cloudResp.statusCode != 200 && cloudResp.statusCode != 201) {
        throw Exception("Cloudinary upload failed: $cloudRespBody");
      }

      final cloudData = jsonDecode(cloudRespBody);
      final secureUrl = cloudData['secure_url'] ?? cloudData['url'];
      if (secureUrl == null)
        throw Exception("Cloudinary did not return secure_url.");

      // BACKEND
      final body = {
        "user_email": userEmail,
        "title": fileTitle,
        "file_url": secureUrl,
        "file_type": "pdf",
        "main_application_type": selectedDocType!.title,
      };

      final backendResp = await http.post(
        Uri.parse(backendUploadUrl),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(body),
      );

      if (backendResp.statusCode != 200 && backendResp.statusCode != 201) {
        throw Exception(
          "Backend upload failed: ${backendResp.statusCode} ${backendResp.body}",
        );
      }

      // SUCCESS POPUP DIALOG
      await showDialog(
        context: context,
        builder:
            (_) => AlertDialog(
              title: Text(
                t("Upload Successful", "Matagumpay ang Pag-upload"),
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
              content: Text(
                t(
                  "Upload successful! Once your document has been verified, your Document UID will be provided to track your application's progress. Please be patient!",
                  "Matagumpay ang pag-upload! Kapag na-verify na ang iyong dokumento, bibigyan ka ng Document UID upang masubaybayan ang progreso ng iyong aplikasyon. Mangyaring maghintay nang may pasensya!",
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: Text(t("I Understand", "Naiintindihan Ko")),
                ),
              ],
            ),
      );

      setState(() {
        selectedDocType = null;
        pickedImages.clear();
        _sigController.clear();
      });
    } catch (e, st) {
      debugPrint("PDF/Upload error: $e\n$st");
      _showMessage("Error: $e");
    } finally {
      setState(() => isLoading = false);
    }
  }

  String _formattedLongDate(DateTime d) {
    const months = [
      "",
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    return "${months[d.month]} ${d.day}, ${d.year}";
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  Widget _requirementRow(int index, String label) {
    final picked = pickedImages[index];
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 6),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        title: Text(label, style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle:
            picked == null
                ? Text(t("No image selected", "Walang larawang napili"))
                : Text(picked.name),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            IconButton(
              tooltip: t("Replace / Pick", "Palitan / Piliin"),
              icon: Icon(picked == null ? Icons.camera_alt : Icons.edit),
              onPressed: () => _pickForRequirement(index),
              color: const Color(0xFFD32F2F),
            ),
            if (picked != null)
              IconButton(
                tooltip: t("Remove", "Tanggalin"),
                icon: const Icon(Icons.delete_outline),
                onPressed: () => setState(() => pickedImages.remove(index)),
              ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    const Color primaryRed = Color(0xFFD32F2F);
    const Color lightGrey = Color(0xFFFAFAFA);

    return Scaffold(
      appBar: AppBar(
        title: Text(t("Document Upload", "Mag-upload ng Dokumento")),
        backgroundColor: primaryRed,
        centerTitle: true,
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            children: [
              DropdownButtonFormField<_DocType>(
                isExpanded: true,
                value: selectedDocType,
                decoration: InputDecoration(
                  labelText: t("Select Application", "Pumili ng Aplikasyon"),
                  filled: true,
                  fillColor: lightGrey,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                items:
                    docTypes
                        .map(
                          (d) => DropdownMenuItem<_DocType>(
                            value: d,
                            child: Text(
                              d.title,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        )
                        .toList(),
                onChanged:
                    (val) => setState(() {
                      selectedDocType = val;
                      pickedImages.clear();
                    }),
              ),
              const SizedBox(height: 12),
              Expanded(
                child:
                    selectedDocType == null
                        ? Center(
                          child: Text(
                            t(
                              "Choose an application to see requirements",
                              "Pumili ng aplikasyon para makita ang requirements",
                            ),
                          ),
                        )
                        : ListView(
                          children: [
                            Padding(
                              padding: const EdgeInsets.symmetric(
                                vertical: 8.0,
                              ),
                              child: Text(
                                t(
                                      "Requirements for:",
                                      "Mga kinakailangan para sa:",
                                    ) +
                                    " ${selectedDocType!.title}",
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                            ...selectedDocType!.requirements
                                .asMap()
                                .entries
                                .map(
                                  (entry) =>
                                      _requirementRow(entry.key, entry.value),
                                ),
                            const SizedBox(height: 12),
                            ListTile(
                              tileColor: Colors.grey[100],
                              title: Text(t("Applicant", "Aplikante")),
                              subtitle: Text(
                                firstName.isEmpty && lastName.isEmpty
                                    ? userEmail
                                    : "$firstName $lastName",
                              ),
                            ),
                            const SizedBox(height: 12),
                            Text(
                              t(
                                "Digital Signature (Required)",
                                "Digital Signature (Kailangan)",
                              ),
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            Container(
                              height: 150,
                              margin: const EdgeInsets.symmetric(vertical: 8),
                              decoration: BoxDecoration(
                                border: Border.all(color: primaryRed),
                              ),
                              child: Signature(
                                controller: _sigController,
                                backgroundColor: Colors.white,
                              ),
                            ),
                            TextButton(
                              onPressed: () => _sigController.clear(),
                              child: Text(
                                t("Clear Signature", "I-clear ang Signature"),
                              ),
                            ),
                          ],
                        ),
              ),
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton(
                      onPressed:
                          isLoading || !_allRequirementsFilled()
                              ? null
                              : _generatePdfAndUpload,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: primaryRed,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                      child:
                          isLoading
                              ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(
                                  color: Colors.white,
                                  strokeWidth: 2,
                                ),
                              )
                              : Text(
                                t(
                                  "Generate & Upload PDF",
                                  "Gumawa at I-upload ang PDF",
                                ),
                              ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DocType {
  final String title;
  final String code;
  final List<String> requirements;
  const _DocType({
    required this.title,
    required this.code,
    required this.requirements,
  });
}
