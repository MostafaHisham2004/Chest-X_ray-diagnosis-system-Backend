import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../providers/auth_provider.dart';
import '../../../services/api_client.dart';
import '../../../services/xray_service.dart';
import '../../../theme/app_theme.dart';
import '../../../widgets/shared_widgets.dart';

class PatientDashboard extends StatefulWidget {
  const PatientDashboard({super.key});

  @override
  State<PatientDashboard> createState() => _PatientDashboardState();
}

class _PatientDashboardState extends State<PatientDashboard> {
  final _service = XrayService();
  int _xrayCount = 0;
  XrayRecord? _latestXray;
  bool _isLoading = true;
  String? _error;

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
      final stats = await _service.fetchMyStats(token);
      if (!mounted) return;
      setState(() {
        _xrayCount = (stats['xrayCount'] as num?)?.toInt() ?? 0;
        final latest = stats['latestXray'];
        if (latest is Map<String, dynamic>) {
          _latestXray = XrayRecord.fromJson(latest);
        } else {
          _latestXray = null;
        }
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
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final user = context.watch<AuthProvider>().user;
    final firstName = (user?.name.trim().isNotEmpty ?? false)
        ? user!.name.trim().split(RegExp(r'\s+')).first
        : 'Patient';

    final diagnosis = _latestXray?.diagnosisLabel ?? 'No scans yet';
    final confidence = _latestXray?.confidenceLabel ?? '';
    final dateStr = _latestXray?.uploadDate != null
        ? DateFormat.yMMMd().format(_latestXray!.uploadDate!.toLocal())
        : null;

    return Scaffold(
      backgroundColor: isDark ? AppTheme.darkBackground : AppTheme.background,
      appBar: const SessionAppTopBar(onProfileTap: null, hideProfileMenu: true),
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
                  child: Text(_error!, style: GoogleFonts.dmSans(color: AppTheme.error, fontWeight: FontWeight.w600)),
                ),
              // Welcome card
              Container(
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [AppTheme.primary, Color(0xFF00838F)],
                  ),
                  borderRadius: BorderRadius.circular(20),
                ),
                padding: const EdgeInsets.all(20),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Welcome back, $firstName!',
                              style: GoogleFonts.dmSans(
                                fontSize: 20,
                                fontWeight: FontWeight.w800,
                                color: Colors.white,
                              )),
                          const SizedBox(height: 6),
                          Text("Here's your latest health summary.",
                              style: GoogleFonts.dmSans(
                                fontSize: 13,
                                color: Colors.white.withOpacity(0.85),
                              )),
                          if (dateStr != null) ...[
                            const SizedBox(height: 12),
                            Row(
                              children: [
                                const Icon(Icons.calendar_today_outlined,
                                    size: 14, color: Colors.white70),
                                const SizedBox(width: 6),
                                Text('Last upload: $dateStr',
                                    style: GoogleFonts.dmSans(
                                      fontSize: 12,
                                      color: Colors.white70,
                                    )),
                              ],
                            ),
                          ],
                        ],
                      ),
                    ),
                    Container(
                      width: 56,
                      height: 56,
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: const Icon(Icons.health_and_safety_outlined,
                          size: 28, color: Colors.white),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              // Summary stats
              if (_isLoading)
                const Center(child: Padding(padding: EdgeInsets.all(24), child: CircularProgressIndicator()))
              else ...[
                LayoutBuilder(
                  builder: (context, constraints) {
                    if (constraints.maxWidth > 500) {
                      return Row(
                        children: [
                          Expanded(
                              child: StatCard(
                                  title: 'X-rays',
                                  value: '$_xrayCount',
                                  icon: Icons.image_outlined)),
                          const SizedBox(width: 12),
                          Expanded(
                              child: StatCard(
                                  title: 'Status',
                                  value: _latestXray != null ? (confidence.isNotEmpty ? 'Analyzed' : 'Pending') : 'No scans',
                                  icon: _latestXray != null ? Icons.check_circle_outline : Icons.hourglass_empty_outlined,
                                  iconColor: _latestXray != null ? AppTheme.success : AppTheme.warning)),
                          const SizedBox(width: 12),
                          Expanded(
                              child: StatCard(
                                  title: 'Confidence',
                                  value: confidence.isNotEmpty ? confidence : '--',
                                  icon: Icons.verified_outlined,
                                  iconColor: AppTheme.primary)),
                        ],
                      );
                    }
                    return Column(
                      children: [
                        Row(
                          children: [
                            Expanded(
                                child: StatCard(
                                    title: 'X-rays',
                                    value: '$_xrayCount',
                                    icon: Icons.image_outlined)),
                            const SizedBox(width: 12),
                            Expanded(
                                child: StatCard(
                                    title: 'Status',
                                    value: _latestXray != null ? (confidence.isNotEmpty ? 'Analyzed' : 'Pending') : 'No scans',
                                    icon: _latestXray != null ? Icons.check_circle_outline : Icons.hourglass_empty_outlined,
                                    iconColor: _latestXray != null ? AppTheme.success : AppTheme.warning)),
                          ],
                        ),
                        const SizedBox(height: 12),
                        StatCard(
                            title: 'Confidence',
                            value: confidence.isNotEmpty ? confidence : '--',
                            icon: Icons.verified_outlined,
                            iconColor: AppTheme.primary),
                      ],
                    );
                  },
                ),
                const SizedBox(height: 16),
                // Latest AI Findings
                if (_latestXray != null)
                  SectionCard(
                    title: 'Latest AI Findings',
                    description: 'Your recent X-ray analysis',
                    child: Column(
                      children: [
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              width: 80,
                              height: 80,
                              decoration: BoxDecoration(
                                color: const Color(0xFF1A1A2E),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: const Icon(Icons.image,
                                  size: 36, color: Colors.white30),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Text('Chest X-ray',
                                          style: GoogleFonts.dmSans(
                                              fontSize: 16,
                                              fontWeight: FontWeight.w700)),
                                      const SizedBox(width: 8),
                                      DiagnosisBadge(
                                          label: diagnosis,
                                          type: diagnosisToType(diagnosis)),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Text('Analyzed on $dateStr',
                                      style: GoogleFonts.dmSans(
                                          fontSize: 12,
                                          color: isDark
                                              ? AppTheme.darkTextSecondary
                                              : AppTheme.textSecondary)),
                                  if (confidence.isNotEmpty)
                                    const SizedBox(height: 8),
                                  if (confidence.isNotEmpty)
                                    Container(
                                      padding: const EdgeInsets.all(10),
                                      decoration: BoxDecoration(
                                        color: isDark
                                            ? AppTheme.darkBackground
                                            : AppTheme.background,
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: Row(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          const Icon(Icons.info_outline,
                                              size: 16, color: AppTheme.primary),
                                          const SizedBox(width: 8),
                                          Expanded(
                                            child: Text(
                                              'AI detected $diagnosis with $confidence confidence',
                                              style: GoogleFonts.dmSans(
                                                  fontSize: 12,
                                                  color: isDark
                                                      ? AppTheme.darkTextSecondary
                                                      : AppTheme.textSecondary),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        SizedBox(
                          width: double.infinity,
                          height: 44,
                          child: ElevatedButton.icon(
                            onPressed: () {},
                            icon: const Icon(Icons.description_outlined, size: 16),
                            label: Text('View Full Report',
                                style:
                                    GoogleFonts.dmSans(fontWeight: FontWeight.w600)),
                          ),
                        ),
                      ],
                    ),
                  ),
                const SizedBox(height: 16),
                // Health Recommendations
                SectionCard(
                  title: 'Health Recommendations',
                  description: 'Tips for recovery',
                  child: Column(
                    children: [
                      _RecommendationCard(
                        icon: Icons.bedtime_outlined,
                        color: const Color(0xFF7B61FF),
                        title: 'Rest & Recovery',
                        description:
                            'Get plenty of rest and avoid strenuous activities.',
                      ),
                      const SizedBox(height: 12),
                      _RecommendationCard(
                        icon: Icons.water_drop_outlined,
                        color: AppTheme.primary,
                        title: 'Stay Hydrated',
                        description:
                            'Drink plenty of water and fluids to help thin mucus.',
                      ),
                      const SizedBox(height: 12),
                      _RecommendationCard(
                        icon: Icons.local_pharmacy_outlined,
                        color: AppTheme.success,
                        title: 'Follow-up Care',
                        description:
                            'Take prescribed medications and attend all follow-up appointments.',
                      ),
                      const SizedBox(height: 16),
                      SizedBox(
                        width: double.infinity,
                        height: 44,
                        child: OutlinedButton.icon(
                          onPressed: () {},
                          icon: const Icon(Icons.chat_outlined, size: 16),
                          label: Text('Ask AI About My Condition',
                              style:
                                  GoogleFonts.dmSans(fontWeight: FontWeight.w600)),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}

class _RecommendationCard extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String title;
  final String description;

  const _RecommendationCard({
    required this.icon,
    required this.color,
    required this.title,
    required this.description,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: color.withOpacity(0.06),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.2)),
      ),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
                color: color.withOpacity(0.15),
                borderRadius: BorderRadius.circular(10)),
            child: Icon(icon, size: 18, color: color),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title,
                    style: GoogleFonts.dmSans(
                        fontSize: 14, fontWeight: FontWeight.w700)),
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
      ),
    );
  }
}
