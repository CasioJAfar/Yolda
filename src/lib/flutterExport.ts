export interface FlutterFile {
  path: string;
  description: string;
  content: string;
}

export const FLUTTER_PROJECT_FILES: FlutterFile[] = [
  {
    path: 'pubspec.yaml',
    description: 'Flutter layihə konfiqurasiyası və asılılıqlar',
    content: `name: musteri_gps
description: "Müştəri məlumatlarını, GPS konumlarını və sürücülərə WhatsApp vasitəsilə göndərişləri idarə edən sistem."
publish_to: 'none'
version: 1.0.0+1

environment:
  sdk: '>=3.0.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter
  flutter_localizations:
    sdk: flutter
  url_launcher: ^6.3.0
  geolocator: ^12.0.2
  google_maps_flutter: ^2.9.0
  shared_preferences: ^2.3.2
  http: ^1.2.2
  cached_network_image: ^3.3.1
  flutter_svg: ^2.0.10+1
  intl: ^0.19.0
  image_picker: ^1.1.2

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^4.0.0

flutter:
  uses-material-design: true
  assets:
    - assets/images/
`,
  },
  {
    path: 'lib/main.dart',
    description: 'Tətbiqin əsas giriş nöqtəsi və tema ayarları',
    content: `import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'screens/login_screen.dart';
import 'screens/home_screen.dart';
import 'services/auth_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const MusteriGpsApp());
}

class MusteriGpsApp extends StatelessWidget {
  const MusteriGpsApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Müştəri GPS',
      debugShowCheckedModeBanner: false,
      themeMode: ThemeMode.system,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF2563EB),
          brightness: Brightness.light,
          primary: const Color(0xFF2563EB),
          surface: Colors.white,
        ),
        fontFamily: 'Roboto',
      ),
      darkTheme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF3B82F6),
          brightness: Brightness.dark,
          surface: const Color(0xFF0F172A),
        ),
        scaffoldBackgroundColor: const Color(0xFF0F172A),
      ),
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: const [
        Locale('az', 'AZ'),
        Locale('en', 'US'),
      ],
      home: const LoginScreen(),
    );
  }
}
`,
  },
  {
    path: 'lib/models/customer_model.dart',
    description: 'Müştəri məlumat modeli',
    content: `class CustomerLocation {
  final double lat;
  final double lng;
  final String? addressText;

  CustomerLocation({
    required this.lat,
    required this.lng,
    this.addressText,
  });

  factory CustomerLocation.fromJson(Map<String, dynamic> json) {
    return CustomerLocation(
      lat: (json['lat'] as num).toDouble(),
      lng: (json['lng'] as num).toDouble(),
      addressText: json['addressText'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
    'lat': lat,
    'lng': lng,
    'addressText': addressText,
  };
}

class Customer {
  final String id;
  final String userId;
  final String name;
  final String phone;
  final String address;
  final CustomerLocation? location;
  final String? note;
  final String? photoUrl;
  final DateTime createdAt;

  Customer({
    required this.id,
    required this.userId,
    required this.name,
    required this.phone,
    required this.address,
    this.location,
    this.note,
    this.photoUrl,
    required this.createdAt,
  });

  factory Customer.fromJson(Map<String, dynamic> json) {
    return Customer(
      id: json['id'] as String,
      userId: json['userId'] as String,
      name: json['name'] as String,
      phone: json['phone'] as String,
      address: json['address'] as String? ?? '',
      location: json['location'] != null
          ? CustomerLocation.fromJson(json['location'] as Map<String, dynamic>)
          : null,
      note: json['note'] as String?,
      photoUrl: json['photoUrl'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'userId': userId,
    'name': name,
    'phone': phone,
    'address': address,
    'location': location?.toJson(),
    'note': note,
    'photoUrl': photoUrl,
    'createdAt': createdAt.toIso8601String(),
  };
}
`,
  },
  {
    path: 'lib/models/driver_model.dart',
    description: 'Sürücü məlumat modeli',
    content: `class Driver {
  final String id;
  final String userId;
  final String name;
  final String phone;
  final String? note;
  final bool isActive;

  Driver({
    required this.id,
    required this.userId,
    required this.name,
    required this.phone,
    this.note,
    this.isActive = true,
  });

  factory Driver.fromJson(Map<String, dynamic> json) {
    return Driver(
      id: json['id'] as String,
      userId: json['userId'] as String,
      name: json['name'] as String,
      phone: json['phone'] as String,
      note: json['note'] as String?,
      isActive: (json['status'] ?? 'active') == 'active',
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'userId': userId,
    'name': name,
    'phone': phone,
    'note': note,
    'status': isActive ? 'active' : 'inactive',
  };
}
`,
  },
  {
    path: 'lib/services/whatsapp_service.dart',
    description: 'WhatsApp hazır mesaj formatlaması və göndərilməsi xidməti',
    content: `import 'package:url_launcher/url_launcher.dart';
import '../models/customer_model.dart';
import '../models/driver_model.dart';

class WhatsAppService {
  static String formatCustomerMessage(Customer customer, {String? driverName}) {
    final locationBlock = customer.location != null
        ? '\\nLatitude: \${customer.location!.lat}\\nLongitude: \${customer.location!.lng}\\n\\nWaze ilə get:\\nhttps://waze.com/ul?ll=\${customer.location!.lat},\${customer.location!.lng}&navigate=yes'
        : '\\n\\nKonum: Qeyd edilməyib';

    final greeting = driverName != null
        ? 'Salam, \$driverName. Bu müştəriyə gedilməlidir.'
        : 'Salam. Bu müştəriyə gedilməlidir.';

    final notePart = customer.note != null && customer.note!.isNotEmpty ? '\\n\\nQeyd: \${customer.note}' : '';

    return '''\$greeting

Müştəri: \${customer.name}
Telefon: \${customer.phone}
Ünvan: \${customer.address}\$locationBlock\$notePart

Xahiş edirəm bu ünvana gedəsən.''';
  }

  static Future<bool> sendToDriver({
    required Customer customer,
    required Driver driver,
  }) async {
    final message = formatCustomerMessage(customer, driverName: driver.name);
    return sendCustomMessage(phone: driver.phone, message: message);
  }

  static Future<bool> sendCustomMessage({
    required String phone,
    required String message,
  }) async {
    final cleanPhone = phone.replaceAll(RegExp(r'[^0-9]'), '');
    final encodedMessage = Uri.encodeComponent(message);

    // Try native whatsapp:// scheme first for Android / iOS
    final nativeUri = Uri.parse('whatsapp://send?phone=\$cleanPhone&text=\$encodedMessage');
    final webUri = Uri.parse('https://wa.me/\$cleanPhone?text=\$encodedMessage');

    try {
      if (await canLaunchUrl(nativeUri)) {
        return await launchUrl(nativeUri, mode: LaunchMode.externalApplication);
      } else {
        return await launchUrl(webUri, mode: LaunchMode.externalApplication);
      }
    } catch (e) {
      return await launchUrl(webUri, mode: LaunchMode.externalApplication);
    }
  }
}
`,
  },
  {
    path: 'BUILD_GUIDE.md',
    description: 'Android APK, iOS IPA və Web üçün build təlimatı',
    content: `# Müştəri GPS - Flutter Build Təlimatı

Bu layihə eyni Flutter kod bazasından Android, iOS və Web üçün hazırlanmışdır.

## 1. Tələblər
- Flutter SDK (versiya 3.19+)
- Android Studio / Android SDK (Android APK üçün)
- Xcode və macOS (iOS IPA üçün)

## 2. Asılılıqları yükləyin
\`\`\`bash
flutter pub get
\`\`\`

## 3. Android APK Hazırlanması
Debug APK:
\`\`\`bash
flutter build apk --debug
\`\`\`
Production Release APK:
\`\`\`bash
flutter build apk --release
\`\`\`
APK faylı: \`build/app/outputs/flutter-apk/app-release.apk\` ünvanında yaranacaq.

## 4. iOS IPA Hazırlanması (macOS tələb olunur)
\`\`\`bash
flutter build ipa --release
\`\`\`

## 5. Web Versiya
\`\`\`bash
flutter build web --release
\`\`\`
Çıxış qovluğu: \`build/web\` (istənilən hostinqə yüklənə bilər).
`,
  },
];

export const FLUTTER_CODEBASE: Record<string, string> = FLUTTER_PROJECT_FILES.reduce((acc, f) => {
  if (f.path !== 'BUILD_GUIDE.md') {
    acc[f.path] = f.content;
  }
  return acc;
}, {} as Record<string, string>);

export const FLUTTER_BUILD_INSTRUCTIONS =
  FLUTTER_PROJECT_FILES.find((f) => f.path === 'BUILD_GUIDE.md')?.content || '';
