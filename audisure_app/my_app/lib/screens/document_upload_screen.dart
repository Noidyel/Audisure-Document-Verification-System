import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show rootBundle;
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
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
      'https://api.cloudinary.com/v1_1/dx78jwu6q/image/upload';

  static const String cloudinaryUploadPreset = 'audisure_unsigned';

  static const String backendUploadUrl = '${ApiConfig.baseUrl}/api/upload';

  final ImagePicker _picker = ImagePicker();

  bool isLoading = false;
  bool isEnglish = true;

  String firstName = '';
  String lastName = '';
  String userEmail = '';

  /*
   * These IDs must match your document_types table in Aiven.
   *
   * Expected values from the SQL seed:
   * ECC = 1
   * WCC = 2
   * SHC = 3
   *
   * Run:
   * SELECT id, code, name FROM document_types;
   * if you want to verify them.
   */
  final List<_DocType> docTypes = const [
    _DocType(
      id: 2,
      title: 'Application for Water Connection Clearance',
      code: 'WCC',
      requirements: [
        'Barangay Clearance',
        'Valid ID',
        'Proof of Ownership / Contract',
      ],
    ),
    _DocType(
      id: 1,
      title: 'Application for Electrification Clearance',
      code: 'ECC',
      requirements: [
        'Barangay Clearance',
        'Valid ID',
        'Approved Electrical Plan',
      ],
    ),
    _DocType(
      id: 3,
      title: 'Application for Socialized Housing Unit / Condominium Unit',
      code: 'SHC',
      requirements: [
        'Birth Certificate',
        'Certificate of Indigency',
        'Proof of Income',
        'Valid ID',
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

  @override
  void dispose() {
    _sigController.dispose();
    super.dispose();
  }

  Future<void> _loadUserFromPrefs() async {
    final prefs = await SharedPreferences.getInstance();
    final savedFirstName =
        prefs.getString('first_name') ?? prefs.getString('firstName') ?? '';
    final savedLastName =
        prefs.getString('last_name') ?? prefs.getString('lastName') ?? '';
    final savedEmail =
        prefs.getString('email') ?? prefs.getString('user_email') ?? '';
    if (!mounted) return;
    setState(() {
      firstName = savedFirstName.trim();
      lastName = savedLastName.trim();
      userEmail = savedEmail.trim();
    });
  }

  Future<void> _pickForRequirement(int requirementIndex) async {
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      builder: (context) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                leading: const Icon(Icons.camera_alt),
                title: Text(t('Camera', 'Camera')),
                onTap: () => Navigator.pop(context, ImageSource.camera),
              ),
              ListTile(
                leading: const Icon(Icons.photo_library),
                title: Text(t('Gallery', 'Gallery')),
                onTap: () => Navigator.pop(context, ImageSource.gallery),
              ),
              ListTile(
                leading: const Icon(Icons.close),
                title: Text(t('Cancel', 'Kanselahin')),
                onTap: () => Navigator.pop(context),
              ),
            ],
          ),
        );
      },
    );

    if (source == null) return;

    final picked = await _picker.pickImage(source: source, imageQuality: 75);

    if (picked == null || !mounted) return;

    setState(() {
      pickedImages[requirementIndex] = picked;
    });
  }

  bool _allRequirementsFilled() {
    final selected = selectedDocType;

    if (selected == null) return false;

    return selected.requirements.asMap().keys.every(
      (index) => pickedImages[index] != null,
    );
  }

  String _formattedDateDDMMYYYY() {
    final now = DateTime.now();
    final dd = now.day.toString().padLeft(2, '0');
    final mm = now.month.toString().padLeft(2, '0');
    final yyyy = now.year.toString();

    return '$dd$mm$yyyy';
  }

  String _buildFileTitle(String code) {
    final date = _formattedDateDDMMYYYY();
    final initial = firstName.isNotEmpty ? firstName[0].toUpperCase() : 'X';
    final last =
        lastName.isNotEmpty
            ? lastName.toUpperCase().replaceAll(' ', '')
            : 'UNKNOWN';

    return '$code$date$initial$last';
  }

  Future<pw.MemoryImage> _loadLogo() async {
    final bytes = await rootBundle.load('assets/icon/icon.png');
    return pw.MemoryImage(bytes.buffer.asUint8List());
  }

  String _formattedLongDate(DateTime date) {
    const months = [
      '',
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    return '${months[date.month]} ${date.day}, ${date.year}';
  }

  Future<void> _generatePdfAndUpload() async {
    final selected = selectedDocType;

    if (selected == null) {
      _showMessage(
        t('Please select an application.', 'Pumili muna ng aplikasyon.'),
      );
      return;
    }

    if (userEmail.isEmpty) {
      _showMessage(
        t(
          'Your account email is missing. Please log in again.',
          'Nawawala ang email ng account. Mag-login muli.',
        ),
      );
      return;
    }

    if (!_allRequirementsFilled()) {
      _showMessage(
        t(
          'Please supply all required images.',
          'Pakisupply ang lahat ng kinakailangang larawan.',
        ),
      );
      return;
    }

    if (_sigController.isEmpty) {
      _showMessage(
        t(
          'Please provide your digital signature.',
          'Pakilagyan ang digital signature.',
        ),
      );
      return;
    }

    setState(() {
      isLoading = true;
    });

    try {
      final pdf = pw.Document();
      final logoImage = await _loadLogo();

      final title = selected.title;
      final code = selected.code;
      final requirementsList = selected.requirements;

      final signatureBytes = await _sigController.toPngBytes();

      if (signatureBytes == null) {
        throw Exception('Signature export failed.');
      }

      final signatureImage = pw.MemoryImage(signatureBytes);

      // COVER PAGE
      pdf.addPage(
        pw.Page(
          pageFormat: PdfPageFormat.a4,
          build: (context) {
            return pw.Padding(
              padding: const pw.EdgeInsets.all(24),
              child: pw.Column(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Row(
                    mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Expanded(
                        child: pw.Text(
                          'AUDISURE - HCDRD Document Submission',
                          style: pw.TextStyle(
                            fontSize: 22,
                            fontWeight: pw.FontWeight.bold,
                          ),
                        ),
                      ),
                      pw.SizedBox(width: 12),
                      pw.Image(logoImage, width: 50, height: 50),
                    ],
                  ),
                  pw.SizedBox(height: 24),
                  pw.Center(
                    child: pw.Text(
                      title,
                      textAlign: pw.TextAlign.center,
                      style: pw.TextStyle(
                        fontSize: 20,
                        fontWeight: pw.FontWeight.bold,
                      ),
                    ),
                  ),
                  pw.SizedBox(height: 16),
                  pw.Text(
                    'Date: ${_formattedLongDate(DateTime.now())}',
                    style: pw.TextStyle(
                      fontSize: 12,
                      fontStyle: pw.FontStyle.italic,
                    ),
                  ),
                  pw.Text(
                    'Applicant: ${firstName.isEmpty && lastName.isEmpty ? userEmail : '$firstName $lastName'}',
                    style: pw.TextStyle(
                      fontSize: 12,
                      fontStyle: pw.FontStyle.italic,
                    ),
                  ),
                  pw.Text(
                    'Email: $userEmail',
                    style: pw.TextStyle(
                      fontSize: 12,
                      fontStyle: pw.FontStyle.italic,
                    ),
                  ),
                  pw.SizedBox(height: 12),
                  pw.Text(
                    'Requirements included:',
                    style: pw.TextStyle(
                      fontSize: 14,
                      fontWeight: pw.FontWeight.bold,
                    ),
                  ),
                  pw.SizedBox(height: 8),
                  ...requirementsList.map(
                    (requirement) => pw.Padding(
                      padding: const pw.EdgeInsets.only(bottom: 4),
                      child: pw.Row(
                        crossAxisAlignment: pw.CrossAxisAlignment.start,
                        children: [
                          pw.Text(
                            '• ',
                            style: const pw.TextStyle(fontSize: 12),
                          ),
                          pw.Expanded(
                            child: pw.Text(
                              requirement,
                              style: const pw.TextStyle(fontSize: 12),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            );
          },
        ),
      );

      // REQUIREMENT PAGES
      //
      // Use final local variables inside the loop. This prevents the
      // delayed PDF page callback from reading an index that has already
      // moved past the end of the requirements list.
      for (var index = 0; index < requirementsList.length; index++) {
        final xFile = pickedImages[index];

        if (xFile == null) {
          throw Exception('Missing image for ${requirementsList[index]}.');
        }

        final requirementLabel = requirementsList[index];
        final Uint8List imageBytes = await xFile.readAsBytes();
        final requirementImage = pw.MemoryImage(imageBytes);

        pdf.addPage(
          pw.Page(
            pageFormat: PdfPageFormat.a4,
            build: (context) {
              return pw.Padding(
                padding: const pw.EdgeInsets.all(24),
                child: pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Row(
                      mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        pw.Expanded(
                          child: pw.Text(
                            requirementLabel,
                            style: pw.TextStyle(
                              fontSize: 16,
                              fontWeight: pw.FontWeight.bold,
                            ),
                          ),
                        ),
                        pw.SizedBox(width: 12),
                        pw.Image(logoImage, width: 50, height: 50),
                      ],
                    ),
                    pw.SizedBox(height: 12),
                    pw.Expanded(
                      child: pw.Center(
                        child: pw.Image(
                          requirementImage,
                          fit: pw.BoxFit.contain,
                        ),
                      ),
                    ),
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
          build: (context) {
            return pw.Padding(
              padding: const pw.EdgeInsets.all(24),
              child: pw.Column(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Text(
                    'Applicant Certification',
                    style: pw.TextStyle(
                      fontSize: 18,
                      fontWeight: pw.FontWeight.bold,
                    ),
                  ),
                  pw.SizedBox(height: 16),
                  pw.Text(
                    'I certify that the submitted information and document images are true and correct.',
                    style: const pw.TextStyle(fontSize: 12),
                  ),
                  pw.SizedBox(height: 24),
                  pw.Text(
                    'Digital Signature:',
                    style: pw.TextStyle(
                      fontSize: 16,
                      fontWeight: pw.FontWeight.bold,
                    ),
                  ),
                  pw.SizedBox(height: 16),
                  pw.Center(
                    child: pw.Image(signatureImage, width: 300, height: 150),
                  ),
                  pw.SizedBox(height: 12),
                  pw.Center(
                    child: pw.Text(
                      firstName.isEmpty && lastName.isEmpty
                          ? userEmail
                          : '$firstName $lastName',
                      style: const pw.TextStyle(fontSize: 12),
                    ),
                  ),
                ],
              ),
            );
          },
        ),
      );

      final pdfBytes = await pdf.save();
      final fileTitle = _buildFileTitle(code);
      final filename = '$fileTitle.pdf';

      // ======================================================
      // UPLOAD CONSOLIDATED PDF TO CLOUDINARY
      // ======================================================
      //
      // Configure the unsigned preset "audisure_unsigned" in Cloudinary
      // to use this asset folder:
      //
      // audisure/applicant-submissions

      const expectedCloudinaryFolder = 'audisure/applicant-submissions';

      final cloudRequest = http.MultipartRequest(
        'POST',
        Uri.parse(cloudinaryUploadUrl),
      );

      cloudRequest.fields['upload_preset'] = cloudinaryUploadPreset;

      // Keep a readable Cloudinary public ID.
      cloudRequest.fields['public_id'] = fileTitle;

      // This works with Cloudinary dynamic-folder environments.
      // The upload preset should still enforce the same folder.
      cloudRequest.fields['asset_folder'] = expectedCloudinaryFolder;

      cloudRequest.files.add(
        http.MultipartFile.fromBytes('file', pdfBytes, filename: filename),
      );

      final cloudResponse = await cloudRequest.send();
      final cloudResponseBody = await cloudResponse.stream.bytesToString();

      debugPrint('Cloudinary status: ${cloudResponse.statusCode}');
      debugPrint('Cloudinary response: $cloudResponseBody');

      if (cloudResponse.statusCode != 200 && cloudResponse.statusCode != 201) {
        throw Exception(
          'Cloudinary upload failed '
          '(${cloudResponse.statusCode}): '
          '$cloudResponseBody',
        );
      }

      final decodedCloudResponse = jsonDecode(cloudResponseBody);

      if (decodedCloudResponse is! Map<String, dynamic>) {
        throw Exception('Cloudinary returned an invalid response.');
      }

      final cloudData = decodedCloudResponse;

      final secureUrl =
          (cloudData['secure_url'] ?? cloudData['url'] ?? '').toString();

      final publicId = (cloudData['public_id'] ?? '').toString();

      final assetId = (cloudData['asset_id'] ?? '').toString();

      final resourceType = (cloudData['resource_type'] ?? 'image').toString();

      final returnedAssetFolder =
          (cloudData['asset_folder'] ??
                  cloudData['folder'] ??
                  expectedCloudinaryFolder)
              .toString();

      if (secureUrl.isEmpty) {
        throw Exception('Cloudinary did not return a secure file URL.');
      }

      if (publicId.isEmpty) {
        throw Exception('Cloudinary did not return a public ID.');
      }

      if (assetId.isEmpty) {
        debugPrint('Warning: Cloudinary did not return asset_id.');
      }

      debugPrint('Cloudinary URL: $secureUrl');
      debugPrint('Cloudinary public ID: $publicId');
      debugPrint('Cloudinary asset ID: $assetId');
      debugPrint('Cloudinary resource type: $resourceType');
      debugPrint('Cloudinary folder: $returnedAssetFolder');

      // Save the consolidated PDF metadata in the V2 documents table.
      final requestBody = <String, dynamic>{
        'user_email': userEmail,
        'document_type_id': selected.id,
        'title': fileTitle,
        'cloudinary_url': secureUrl,
        'cloudinary_public_id': publicId,
        'cloudinary_asset_id': assetId.isEmpty ? null : assetId,
        'cloudinary_resource_type': resourceType,
        'cloudinary_folder':
            returnedAssetFolder.isEmpty
                ? expectedCloudinaryFolder
                : returnedAssetFolder,
      };

      debugPrint('Backend URL: $backendUploadUrl');
      debugPrint('Backend body: ${jsonEncode(requestBody)}');

      final backendResponse = await http
          .post(
            Uri.parse(backendUploadUrl),
            headers: const {'Content-Type': 'application/json'},
            body: jsonEncode(requestBody),
          )
          .timeout(const Duration(seconds: 45));

      debugPrint('Backend status: ${backendResponse.statusCode}');
      debugPrint('Backend response: ${backendResponse.body}');

      Map<String, dynamic> backendData = {};

      try {
        final decoded = jsonDecode(backendResponse.body);

        if (decoded is Map<String, dynamic>) {
          backendData = decoded;
        }
      } catch (_) {
        // A clearer error is raised below.
      }

      if (backendResponse.statusCode < 200 ||
          backendResponse.statusCode >= 300 ||
          backendData['success'] != true) {
        throw Exception(
          backendData['message']?.toString() ??
              'Backend upload failed '
                  '(${backendResponse.statusCode}).',
        );
      }

      final documentUid =
          backendData['document_uid']?.toString() ?? 'Unavailable';

      if (!mounted) return;

      await showDialog(
        context: context,
        builder: (dialogContext) {
          return AlertDialog(
            title: Text(
              t('Upload Successful', 'Matagumpay ang Pag-upload'),
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
            content: Text(
              t(
                'Your consolidated PDF was submitted for staff verification.\n\nDocument UID: $documentUid',
                'Naipasa ang pinagsamang PDF para sa beripikasyon ng staff.\n\nDocument UID: $documentUid',
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(dialogContext),
                child: Text(t('I Understand', 'Naiintindihan Ko')),
              ),
            ],
          );
        },
      );

      if (!mounted) return;

      setState(() {
        selectedDocType = null;
        pickedImages.clear();
        _sigController.clear();
      });
    } catch (error, stackTrace) {
      debugPrint('PDF/Upload error: $error');
      debugPrint('$stackTrace');

      if (mounted) {
        _showMessage(
          t('Upload failed: $error', 'Nabigo ang pag-upload: $error'),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          isLoading = false;
        });
      }
    }
  }

  void _showMessage(String message) {
    if (!mounted) return;

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
                ? Text(t('No image selected', 'Walang larawang napili'))
                : Text(picked.name),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            IconButton(
              tooltip: t('Replace / Pick', 'Palitan / Piliin'),
              icon: Icon(picked == null ? Icons.camera_alt : Icons.edit),
              onPressed: isLoading ? null : () => _pickForRequirement(index),
              color: const Color(0xFFD32F2F),
            ),
            if (picked != null)
              IconButton(
                tooltip: t('Remove', 'Tanggalin'),
                icon: const Icon(Icons.delete_outline),
                onPressed:
                    isLoading
                        ? null
                        : () {
                          setState(() {
                            pickedImages.remove(index);
                          });
                        },
              ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    const primaryRed = Color(0xFFD32F2F);
    const lightGrey = Color(0xFFFAFAFA);

    final selected = selectedDocType;

    return Scaffold(
      appBar: AppBar(
        title: Text(t('Document Upload', 'Mag-upload ng Dokumento')),
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
                value: selected,
                decoration: InputDecoration(
                  labelText: t('Select Application', 'Pumili ng Aplikasyon'),
                  filled: true,
                  fillColor: lightGrey,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                items:
                    docTypes
                        .map(
                          (documentType) => DropdownMenuItem<_DocType>(
                            value: documentType,
                            child: Text(
                              documentType.title,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        )
                        .toList(),
                onChanged:
                    isLoading
                        ? null
                        : (value) {
                          setState(() {
                            selectedDocType = value;
                            pickedImages.clear();
                            _sigController.clear();
                          });
                        },
              ),
              const SizedBox(height: 12),
              Expanded(
                child:
                    selected == null
                        ? Center(
                          child: Text(
                            t(
                              'Choose an application to see requirements.',
                              'Pumili ng aplikasyon para makita ang requirements.',
                            ),
                            textAlign: TextAlign.center,
                          ),
                        )
                        : ListView(
                          children: [
                            Padding(
                              padding: const EdgeInsets.symmetric(vertical: 8),
                              child: Text(
                                '${t('Requirements for:', 'Mga kinakailangan para sa:')} ${selected.title}',
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                            ...selected.requirements.asMap().entries.map(
                              (entry) =>
                                  _requirementRow(entry.key, entry.value),
                            ),
                            const SizedBox(height: 12),
                            ListTile(
                              tileColor: Colors.grey[100],
                              title: Text(t('Applicant', 'Aplikante')),
                              subtitle: Text(
                                firstName.isEmpty && lastName.isEmpty
                                    ? userEmail
                                    : '$firstName $lastName\n$userEmail',
                              ),
                            ),
                            const SizedBox(height: 12),
                            Text(
                              t(
                                'Digital Signature (Required)',
                                'Digital Signature (Kailangan)',
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
                              onPressed:
                                  isLoading ? null : _sigController.clear,
                              child: Text(
                                t('Clear Signature', 'I-clear ang Signature'),
                              ),
                            ),
                          ],
                        ),
              ),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed:
                      isLoading || selected == null || !_allRequirementsFilled()
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
                              'Generate & Upload PDF',
                              'Gumawa at I-upload ang PDF',
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
}

class _DocType {
  final int id;
  final String title;
  final String code;
  final List<String> requirements;

  const _DocType({
    required this.id,
    required this.title,
    required this.code,
    required this.requirements,
  });
}
