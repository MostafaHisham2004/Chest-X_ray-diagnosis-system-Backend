import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'providers/auth_provider.dart';
import 'screens/auth/admin/admin_main.dart';
import 'screens/auth/auth_screen.dart';
import 'screens/auth/doctor/doctor_profile.dart';
import 'screens/shared/otp_verification_screen.dart';
import 'screens/auth/patient/patient_profile.dart';
import 'theme/app_theme.dart';
import 'theme/theme_provider.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  GoogleFonts.config.allowRuntimeFetching = false;
  SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.dark,
    statusBarBrightness: Brightness.light,
  ));
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => ThemeProvider()),
        ChangeNotifierProvider(create: (_) => AuthProvider()),
      ],
      child: const MediScanApp(),
    ),
  );
}

class MediScanApp extends StatelessWidget {
  const MediScanApp({super.key});

  @override
  Widget build(BuildContext context) {
    final themeProvider = context.watch<ThemeProvider>();

    return MaterialApp(
      title: 'MediScan AI',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.theme, // Light
      darkTheme: AppTheme.darkTheme, // Dark
      themeMode:
          themeProvider.themeMode, // Follows ThemeProvider (default: system)
      home: const AuthScreen(),
      routes: {
        '/auth': (_) => const AuthScreen(),
        '/admin': (_) => const AdminMainScreen(),
        '/doctor/profile': (_) => const DoctorProfileScreen(),
        '/patient/profile': (_) => const PatientProfileScreen(),
        '/otp': (_) => const OtpVerificationScreen(),
      },
    );
  }
}
