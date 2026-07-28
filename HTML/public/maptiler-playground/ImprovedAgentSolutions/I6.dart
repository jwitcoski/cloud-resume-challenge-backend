/*
 pubspec.yaml:
   dependencies:
     flutter:
       sdk: flutter
     maplibre_gl: ^0.22.0

 AndroidManifest.xml requires:
   <uses-permission android:name="android.permission.INTERNET" />
 and android:hardwareAccelerated="true" on <application>.
 MapTiler uses HTTPS, so iOS needs no App Transport Security exception.
 This app does not enable device location and therefore requests no location permission.
 Run with:
   flutter run --dart-define=MAPTILER_API_KEY=<your origin-restricted public key>
 */

import 'package:flutter/material.dart';
import 'package:maplibre_gl/maplibre_gl.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const MapTilerApp());
}

class MapTilerApp extends StatelessWidget {
  const MapTilerApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'MapTiler Flutter',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xff2563eb)),
        useMaterial3: true,
      ),
      home: const MapPage(),
    );
  }
}

class MapPage extends StatefulWidget {
  const MapPage({super.key});

  @override
  State<MapPage> createState() => _MapPageState();
}

class _MapPageState extends State<MapPage> {
  static const String _apiKey =
      String.fromEnvironment('MAPTILER_API_KEY');
  static const LatLng _prague = LatLng(50.1167, 14.4178);

  MapLibreMapController? _controller;
  String _status = 'Loading MapTiler streets-v4…';

  String get _styleUrl => Uri.https(
        'api.maptiler.com',
        '/maps/streets-v4/style.json',
        <String, String>{'key': _apiKey},
      ).toString();

  @override
  void dispose() {
    _controller?.dispose();
    _controller = null;
    super.dispose();
  }

  void _onMapCreated(MapLibreMapController controller) {
    _controller = controller;
  }

  void _onStyleLoaded() {
    if (!mounted) return;
    setState(() {
      _status = 'Map ready • Prague 14.4178° E, 50.1167° N';
    });
  }

  void _onMapClick(Point<double> screenPoint, LatLng coordinates) {
    if (!mounted) return;
    setState(() {
      _status =
          'Selected ${coordinates.longitude.toStringAsFixed(5)}, '
          '${coordinates.latitude.toStringAsFixed(5)}';
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_apiKey.trim().isEmpty) {
      return const Scaffold(
        body: SafeArea(
          child: Center(
            child: Padding(
              padding: EdgeInsets.all(24),
              child: Text(
                'MAPTILER_API_KEY is missing. Pass it with --dart-define '
                'before starting this application.',
                textAlign: TextAlign.center,
              ),
            ),
          ),
        ),
      );
    }

    return Scaffold(
      body: Stack(
        children: <Widget>[
          MapLibreMap(
            styleString: _styleUrl,
            initialCameraPosition: const CameraPosition(
              target: _prague,
              zoom: 12,
              tilt: 25,
            ),
            onMapCreated: _onMapCreated,
            onStyleLoadedCallback: _onStyleLoaded,
            onMapClick: _onMapClick,
            compassEnabled: true,
            rotateGesturesEnabled: true,
            tiltGesturesEnabled: true,
            trackCameraPosition: true,
          ),
          SafeArea(
            child: Align(
              alignment: Alignment.topCenter,
              child: Semantics(
                liveRegion: true,
                child: Container(
                  margin: const EdgeInsets.all(12),
                  padding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: const Color(0xdd0f172a),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    _status,
                    style: const TextStyle(color: Colors.white),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
