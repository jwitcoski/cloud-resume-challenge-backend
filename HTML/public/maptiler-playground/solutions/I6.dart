// I6 — Flutter MapTiler map (maplibre_gl + streets-v4)
// pubspec.yaml:
//   dependencies:
//     flutter:
//       sdk: flutter
//     maplibre_gl: ^0.20.0
//
// Never use streets-v2 — modern v4 style id only.

import 'package:flutter/material.dart';
import 'package:maplibre_gl/maplibre_gl.dart';

/// Load from --dart-define=MAPTILER_API_KEY=... or replace for local runs.
const String maptilerApiKey = String.fromEnvironment(
  'MAPTILER_API_KEY',
  defaultValue: 'YOUR_MAPTILER_API_KEY',
);

const String streetsV4StyleUrl =
    'https://api.maptiler.com/maps/streets-v4/style.json';

void main() {
  runApp(const MapTilerI6App());
}

class MapTilerI6App extends StatelessWidget {
  const MapTilerI6App({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'MapTiler Flutter I6',
      home: const MapPage(),
    );
  }
}

class MapPage extends StatelessWidget {
  const MapPage({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: MapTilerMap(),
    );
  }
}

class MapTilerMap extends StatefulWidget {
  const MapTilerMap({super.key});

  @override
  State<MapTilerMap> createState() => _MapTilerMapState();
}

class _MapTilerMapState extends State<MapTilerMap> {
  MaplibreMapController? _controller;

  String get _styleString => '$streetsV4StyleUrl?key=$maptilerApiKey';

  @override
  Widget build(BuildContext context) {
    if (maptilerApiKey == 'YOUR_MAPTILER_API_KEY') {
      return const Center(
        child: Text('Pass MAPTILER_API_KEY via --dart-define'),
      );
    }

    return MaplibreMap(
      styleString: _styleString,
      initialCameraPosition: const CameraPosition(
        // LatLng is (lat, lng) in maplibre_gl — Prague
        target: LatLng(50.1167, 14.4178),
        zoom: 12.0,
      ),
      onMapCreated: (controller) {
        _controller = controller;
      },
      onStyleLoadedCallback: () async {
        await _controller?.addSymbol(
          const SymbolOptions(
            geometry: LatLng(50.1167, 14.4178),
            textField: 'Prague',
          ),
        );
      },
    );
  }
}
