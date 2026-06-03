import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../../../providers/auth_provider.dart';
import '../../../services/api_client.dart';
import '../../../services/chat_service.dart';
import '../../../services/xray_service.dart';
import '../../../theme/app_theme.dart';
import '../../../widgets/shared_widgets.dart';

class DoctorPatientsScreen extends StatefulWidget {
  const DoctorPatientsScreen({super.key});

  @override
  State<DoctorPatientsScreen> createState() => _DoctorPatientsScreenState();
}

class _DoctorPatientsScreenState extends State<DoctorPatientsScreen> {
  final _service = XrayService();
  final _chatService = ChatService();
  List<Map<String, dynamic>> _patients = [];
  bool _isLoading = true;
  String? _error;
  String _search = '';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    final token = context.read<AuthProvider>().token;
    if (token == null) return;
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final patients = await _service.fetchDoctorPatients(token);
      if (!mounted) return;
      setState(() {
        _patients = patients;
        _isLoading = false;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _isLoading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = 'Unable to load patients.';
        _isLoading = false;
      });
    }
  }

  List<Map<String, dynamic>> get _filtered => _patients.where((p) {
        if (_search.isEmpty) return true;
        final name = (p['name'] as String? ?? '').toLowerCase();
        final email = (p['email'] as String? ?? '').toLowerCase();
        final q = _search.toLowerCase();
        return name.contains(q) || email.contains(q);
      }).toList();

  Future<void> _showAddPatientDialog() async {
    final success = await showDialog<bool>(
      context: context,
      builder: (_) => _AddPatientDialog(
        chatService: _chatService,
      ),
    );
    if (success == true && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Patient phone verified successfully.'),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final auth = context.watch<AuthProvider>();
    final isPending = auth.user?.verificationStatus == null ||
        auth.user?.verificationStatus == 'pending';

    if (isPending) {
      return Scaffold(
        backgroundColor: theme.scaffoldBackgroundColor,
        appBar: const SessionAppTopBar(hideProfileMenu: true),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.lock_outline,
                    size: 48, color: AppTheme.warning),
                const SizedBox(height: 16),
                Text('Account Pending Approval',
                    style: GoogleFonts.dmSans(
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                        color: AppTheme.warning)),
                const SizedBox(height: 8),
                Text(
                    'Your account is awaiting admin verification. You will be able to manage patients once approved.',
                    textAlign: TextAlign.center,
                    style: GoogleFonts.dmSans(
                        fontSize: 14,
                        color: isDark
                            ? AppTheme.darkTextSecondary
                            : AppTheme.textSecondary)),
              ],
            ),
          ),
        ),
      );
    }

    Border cardBorder = Border.all(
      color: isDark ? AppTheme.darkBorderColor : AppTheme.borderColor,
      width: 1.18,
    );
    final shape = theme.cardTheme.shape;
    if (shape is RoundedRectangleBorder) {
      cardBorder = Border.fromBorderSide(shape.side);
    }

    final filtered = _filtered;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: const SessionAppTopBar(hideProfileMenu: true),
      body: RefreshIndicator(
        onRefresh: _load,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (_error != null)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  margin: const EdgeInsets.only(bottom: 12),
                  decoration: BoxDecoration(
                    color: AppTheme.error.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppTheme.error.withOpacity(0.25)),
                  ),
                  child: Text(_error!,
                      style: GoogleFonts.dmSans(
                          color: AppTheme.error, fontWeight: FontWeight.w600)),
                ),
              Row(
                children: [
                  Text('Patient Management',
                      style: GoogleFonts.dmSans(
                        fontSize: 24,
                        fontWeight: FontWeight.w800,
                        color: theme.textTheme.headlineMedium?.color,
                      )),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(Icons.refresh),
                    onPressed: _load,
                  ),
                ],
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton.icon(
                  onPressed: _showAddPatientDialog,
                  icon: const Icon(Icons.person_add_alt_1_outlined),
                  label: const Text('Add Patient'),
                  style: ElevatedButton.styleFrom(
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              if (_isLoading)
                const Center(
                    child: Padding(
                        padding: EdgeInsets.all(48),
                        child: CircularProgressIndicator()))
              else
                Container(
                  decoration: BoxDecoration(
                    color: theme.cardTheme.color,
                    borderRadius: BorderRadius.circular(16),
                    border: cardBorder,
                  ),
                  child: Column(
                    children: [
                      Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text('All Patients',
                                          style: GoogleFonts.dmSans(
                                            fontSize: 16,
                                            fontWeight: FontWeight.w700,
                                            color: theme
                                                .textTheme.titleLarge?.color,
                                          )),
                                      Text(
                                          '${filtered.length} patient${filtered.length == 1 ? '' : 's'}',
                                          style: GoogleFonts.dmSans(
                                            fontSize: 12,
                                            color: isDark
                                                ? AppTheme.darkTextSecondary
                                                : AppTheme.textSecondary,
                                          )),
                                    ],
                                  ),
                                ),
                                SizedBox(
                                  width: 180,
                                  child: TextField(
                                    onChanged: (v) =>
                                        setState(() => _search = v),
                                    style: GoogleFonts.dmSans(fontSize: 13),
                                    decoration: const InputDecoration(
                                      hintText: 'Search patients...',
                                      prefixIcon: Icon(Icons.search, size: 18),
                                      contentPadding: EdgeInsets.symmetric(
                                          horizontal: 12, vertical: 10),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      const Divider(height: 1),
                      // Table header
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 16, vertical: 10),
                        color: isDark
                            ? AppTheme.darkBackground
                            : AppTheme.background,
                        child: Row(
                          children: [
                            const _TableHeader('Name', flex: 2),
                            const _TableHeader('Diagnosis', flex: 2),
                            const _TableHeader('Date', flex: 2),
                            const _TableHeader('Status', flex: 2),
                            const _TableHeader('', flex: 1),
                          ],
                        ),
                      ),
                      const Divider(height: 1),
                      // Patients list
                      ...filtered.map((patient) => Column(
                            children: [
                              _PatientRow(
                                patient: patient,
                                onView: () =>
                                    _showPatientDetail(context, patient),
                              ),
                              const Divider(height: 1),
                            ],
                          )),
                      if (filtered.isEmpty)
                        Padding(
                          padding: const EdgeInsets.all(32),
                          child: Center(
                            child: Text('No patients found',
                                style: GoogleFonts.dmSans(
                                    color: isDark
                                        ? AppTheme.darkTextSecondary
                                        : AppTheme.textSecondary)),
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
  }

  void _showPatientDetail(BuildContext context, Map<String, dynamic> patient) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (sheetContext) {
        final sheetTheme = Theme.of(sheetContext);
        final isDark = sheetTheme.brightness == Brightness.dark;
        final diagnosis = patient['latestDiagnosis']?['label'] as String? ??
            patient['latestDiagnosis']?['prediction'] as String? ??
            'Pending';
        final status = patient['status'] as String? ?? 'pending';
        final date = patient['latestDate'] as String? ?? '';
        final formattedDate = date.isNotEmpty ? date.split('T')[0] : '';

        return DraggableScrollableSheet(
          expand: false,
          initialChildSize: 0.75,
          maxChildSize: 0.95,
          builder: (_, scrollCtrl) => SingleChildScrollView(
            controller: scrollCtrl,
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text('Patient Details',
                        style: GoogleFonts.dmSans(
                            fontSize: 18, fontWeight: FontWeight.w700)),
                    const Spacer(),
                    IconButton(
                        icon: const Icon(Icons.close),
                        onPressed: () => Navigator.pop(sheetContext)),
                  ],
                ),
                Text('Medical record',
                    style: GoogleFonts.dmSans(
                        fontSize: 13,
                        color: isDark
                            ? AppTheme.darkTextSecondary
                            : AppTheme.textSecondary)),
                const SizedBox(height: 20),
                Row(
                  children: [
                    _DetailField(
                        label: 'Name',
                        value: patient['name'] as String? ?? 'Unknown'),
                    const SizedBox(width: 16),
                    _DetailField(
                        label: 'Gender',
                        value: patient['gender'] as String? ?? '--'),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    _DetailField(
                        label: 'Email',
                        value: patient['email'] as String? ?? '--'),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Status',
                              style: GoogleFonts.dmSans(
                                  fontSize: 12,
                                  color: isDark
                                      ? AppTheme.darkTextSecondary
                                      : AppTheme.textSecondary)),
                          const SizedBox(height: 4),
                          DiagnosisBadge(
                              label: status, type: diagnosisToType(status)),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                if (diagnosis != 'Pending')
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: isDark
                          ? AppTheme.darkBackground
                          : AppTheme.background,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(children: [
                          const Icon(Icons.history,
                              size: 18, color: AppTheme.primary),
                          const SizedBox(width: 8),
                          Text('Latest Diagnosis',
                              style: GoogleFonts.dmSans(
                                  fontSize: 15, fontWeight: FontWeight.w700)),
                        ]),
                        const SizedBox(height: 12),
                        _HistoryItem(
                            diagnosis: diagnosis,
                            date: formattedDate,
                            description: 'AI-assisted chest X-ray analysis'),
                      ],
                    ),
                  ),
                const SizedBox(height: 20),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _TableHeader extends StatelessWidget {
  final String text;
  final int flex;
  const _TableHeader(this.text, {required this.flex});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    return Expanded(
      flex: flex,
      child: Text(text,
          style: GoogleFonts.dmSans(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: isDark ? AppTheme.darkTextSecondary : AppTheme.textSecondary,
          )),
    );
  }
}

class _PatientRow extends StatelessWidget {
  final Map<String, dynamic> patient;
  final VoidCallback onView;

  const _PatientRow({required this.patient, required this.onView});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final name = patient['name'] as String? ?? 'Unknown';
    final diagnosis = patient['latestDiagnosis']?['label'] as String? ??
        patient['latestDiagnosis']?['prediction'] as String? ??
        'Pending';
    final status = patient['status'] as String? ?? 'pending';
    final date = patient['latestDate'] as String? ?? '';
    final formattedDate = date.isNotEmpty ? date.split('T')[0] : '';

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          Expanded(
              flex: 2,
              child: Text(name,
                  style: GoogleFonts.dmSans(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      color: theme.textTheme.bodyLarge?.color))),
          Expanded(
              flex: 2,
              child: Text(diagnosis,
                  style: GoogleFonts.dmSans(
                      fontSize: 13, color: theme.textTheme.bodyMedium?.color))),
          Expanded(
              flex: 2,
              child: Text(formattedDate,
                  style: GoogleFonts.dmSans(
                      fontSize: 13,
                      color: isDark
                          ? AppTheme.darkTextSecondary
                          : AppTheme.textSecondary))),
          Expanded(
              flex: 2,
              child:
                  DiagnosisBadge(label: status, type: diagnosisToType(status))),
          Expanded(
            flex: 1,
            child: TextButton(
              onPressed: onView,
              style: TextButton.styleFrom(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4)),
              child: Text('View',
                  style: GoogleFonts.dmSans(
                      fontSize: 12, color: AppTheme.primary)),
            ),
          ),
        ],
      ),
    );
  }
}

class _DetailField extends StatelessWidget {
  final String label;
  final String value;
  const _DetailField({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label,
              style: GoogleFonts.dmSans(
                  fontSize: 12,
                  color: isDark
                      ? AppTheme.darkTextSecondary
                      : AppTheme.textSecondary)),
          const SizedBox(height: 4),
          Text(value,
              style: GoogleFonts.dmSans(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: theme.textTheme.titleMedium?.color)),
        ],
      ),
    );
  }
}

class _HistoryItem extends StatelessWidget {
  final String diagnosis;
  final String date;
  final String description;
  const _HistoryItem(
      {required this.diagnosis, required this.date, required this.description});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
            width: 8,
            height: 8,
            margin: const EdgeInsets.only(top: 6),
            decoration: const BoxDecoration(
                color: AppTheme.primary, shape: BoxShape.circle)),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(diagnosis,
                      style: GoogleFonts.dmSans(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: theme.textTheme.titleSmall?.color)),
                  Text(date,
                      style: GoogleFonts.dmSans(
                          fontSize: 12,
                          color: isDark
                              ? AppTheme.darkTextSecondary
                              : AppTheme.textSecondary)),
                ],
              ),
              const SizedBox(height: 2),
              Text(description,
                  style: GoogleFonts.dmSans(
                      fontSize: 12,
                      color: isDark
                          ? AppTheme.darkTextSecondary
                          : AppTheme.textSecondary)),
            ],
          ),
        ),
      ],
    );
  }
}

class _AddPatientDialog extends StatefulWidget {
  final ChatService chatService;

  const _AddPatientDialog({required this.chatService});

  @override
  State<_AddPatientDialog> createState() => _AddPatientDialogState();
}

enum _OtpStep { phone, code }

class _AddPatientDialogState extends State<_AddPatientDialog> {
  final _phoneCtrl = TextEditingController();
  final _codeCtrl = TextEditingController();
  _OtpStep _step = _OtpStep.phone;
  bool _loading = false;
  String? _verifiedPhone;

  @override
  void dispose() {
    _phoneCtrl.dispose();
    _codeCtrl.dispose();
    super.dispose();
  }

  Future<void> _sendOtp() async {
    final token = context.read<AuthProvider>().token;
    final phone = _phoneCtrl.text.trim();
    if (token == null || phone.isEmpty) return;

    setState(() => _loading = true);
    try {
      await widget.chatService.sendOtp(token: token, phone: phone);
      if (!mounted) return;
      setState(() {
        _loading = false;
        _step = _OtpStep.code;
        _verifiedPhone = phone;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(e.message)));
      setState(() => _loading = false);
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not send OTP.')),
      );
      setState(() => _loading = false);
    }
  }

  Future<void> _verifyOtp() async {
    final code = _codeCtrl.text.trim();
    final phone = _verifiedPhone;
    if (phone == null || code.length != 6) return;

    setState(() => _loading = true);
    try {
      await widget.chatService.verifyOtp(phone: phone, code: code);
      if (!mounted) return;

      final token = context.read<AuthProvider>().token;
      if (token != null) {
        await widget.chatService.sendConnectionRequest(
          token: token,
          phone: phone,
        );
      }

      if (!mounted) return;
      Navigator.pop(context, true);
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(e.message)));
      setState(() => _loading = false);
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Verification failed.')),
      );
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(_step == _OtpStep.phone ? 'Add Patient' : 'Verify Code'),
      content: _step == _OtpStep.phone
          ? TextField(
              controller: _phoneCtrl,
              keyboardType: TextInputType.phone,
              autofocus: true,
              decoration: const InputDecoration(
                labelText: 'Patient Phone Number',
                prefixIcon: Icon(Icons.phone_outlined),
              ),
            )
          : Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'A 6-digit code was sent via WhatsApp to\n$_verifiedPhone',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.dmSans(fontSize: 13),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _codeCtrl,
                  keyboardType: TextInputType.number,
                  maxLength: 6,
                  autofocus: true,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 24, letterSpacing: 8),
                  decoration: const InputDecoration(
                    labelText: 'Verification Code',
                    counterText: '',
                  ),
                ),
              ],
            ),
      actions: [
        TextButton(
          onPressed: _loading
              ? null
              : () {
                  if (_step == _OtpStep.code) {
                    setState(() {
                      _step = _OtpStep.phone;
                      _verifiedPhone = null;
                    });
                  } else {
                    Navigator.pop(context);
                  }
                },
          child: Text(_step == _OtpStep.code ? 'Back' : 'Cancel'),
        ),
        ElevatedButton.icon(
          onPressed: _loading
              ? null
              : _step == _OtpStep.phone ? _sendOtp : _verifyOtp,
          icon: _loading
              ? const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Colors.white,
                  ),
                )
              : Icon(_step == _OtpStep.phone
                  ? Icons.send_outlined
                  : Icons.check_circle_outline),
          label: Text(_step == _OtpStep.phone
              ? 'Send Code via WhatsApp'
              : 'Verify Code'),
        ),
      ],
    );
  }
}
