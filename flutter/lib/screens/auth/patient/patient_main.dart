import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../../providers/auth_provider.dart';
import '../../../theme/app_theme.dart';
import '../../shared/care_chat_screen.dart';
import '../admin/admin_main.dart';
import '../patient/patient_dashboard.dart';
import 'patient_xrays.dart';
import 'patient_upload.dart';
import 'patient_profile.dart';

class PatientMainScreen extends StatefulWidget {
  const PatientMainScreen({super.key});

  @override
  State<PatientMainScreen> createState() => _PatientMainScreenState();
}

class _PatientMainScreenState extends State<PatientMainScreen> {
  int _currentIndex = 0;

  List<Widget> _buildScreens(bool isAdmin) => [
    const PatientDashboard(),
    const PatientUploadScreen(),
    const PatientXraysScreen(),
    const CareChatScreen(),
    const PatientProfileScreen(),
    if (isAdmin) const AdminMainScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isAdmin = context.watch<AuthProvider>().isAdmin;
    final screens = _buildScreens(isAdmin);

    return Scaffold(
      body: IndexedStack(index: _currentIndex, children: screens),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: isDark ? AppTheme.darkCardBg : Colors.white,
          border: Border(
              top: BorderSide(
                  color: isDark
                      ? AppTheme.darkBorderColor
                      : AppTheme.borderColor)),
          boxShadow: [
            BoxShadow(
                color: const Color(0x0A000000),
                blurRadius: 12,
                offset: const Offset(0, -2)),
          ],
        ),
        child: SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _NavItem(
                    icon: Icons.home_outlined,
                    activeIcon: Icons.home,
                    label: 'Home',
                    index: 0,
                    current: _currentIndex,
                    onTap: (i) => setState(() => _currentIndex = i)),
                _NavItem(
                    icon: Icons.upload_file_outlined,
                    activeIcon: Icons.upload_file,
                    label: 'Upload',
                    index: 1,
                    current: _currentIndex,
                    onTap: (i) => setState(() => _currentIndex = i)),
                _NavItem(
                    icon: Icons.image_outlined,
                    activeIcon: Icons.image,
                    label: 'X-rays',
                    index: 2,
                    current: _currentIndex,
                    onTap: (i) => setState(() => _currentIndex = i)),
                _NavItem(
                    icon: Icons.forum_outlined,
                    activeIcon: Icons.forum,
                    label: 'Chat',
                    index: 3,
                    current: _currentIndex,
                    onTap: (i) => setState(() => _currentIndex = i)),
                _NavItem(
                    icon: Icons.person_outline,
                    activeIcon: Icons.person,
                    label: 'Profile',
                    index: 4,
                    current: _currentIndex,
                    onTap: (i) => setState(() => _currentIndex = i)),
                if (isAdmin)
                  _NavItem(
                      icon: Icons.admin_panel_settings_outlined,
                      activeIcon: Icons.admin_panel_settings,
                      label: 'Admin',
                      index: 5,
                      current: _currentIndex,
                      onTap: (i) => setState(() => _currentIndex = i)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  final IconData icon, activeIcon;
  final String label;
  final int index, current;
  final Function(int) onTap;

  const _NavItem(
      {required this.icon,
      required this.activeIcon,
      required this.label,
      required this.index,
      required this.current,
      required this.onTap});

  @override
  Widget build(BuildContext context) {
    final isActive = index == current;
    return GestureDetector(
      onTap: () => onTap(index),
      behavior: HitTestBehavior.opaque,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: isActive
            ? BoxDecoration(
                color: AppTheme.primary.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              )
            : null,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(isActive ? activeIcon : icon,
                size: 22,
                color: isActive ? AppTheme.primary : AppTheme.textSecondary),
            const SizedBox(height: 3),
            Text(label,
                style: GoogleFonts.dmSans(
                    fontSize: 10,
                    fontWeight: isActive ? FontWeight.w600 : FontWeight.w400,
                    color:
                        isActive ? AppTheme.primary : AppTheme.textSecondary)),
          ],
        ),
      ),
    );
  }
}
