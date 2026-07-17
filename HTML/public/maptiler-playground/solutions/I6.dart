// I6 — Flutter MapTiler map (maplibre_gl + streets-v4)
// pubspec.yaml: maplibre_gl: ^0.20.0  (or current MapTiler Flutter starter)

import 'package:flutter/material.dart';
import 'package:maplibre_gl/maplibre_gl.dart';

const apiKey = String.fromEnvironment(
  'MAPTILER_API_KEY',
  defaultValue: 'YOUR_MAPTILER_API_KEY',
);

/// Modern v4 style id
const styleUrl = 'https://api.maptiler.com/maps/streets-v4/style.json';

class MapPage extends StatelessWidget {
  const MapPage({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(body: MapTilerMap());
  }
}

class MapTilerMap extends StatefulWidget {
  const MapTilerMap({super.key});

  @override
  State<MapTilerMap> createState() => _MapTilerMapState();
}

class _MapTilerMapState extends State<MapTilerMap> {
  @override
  Widget build(BuildContext context) {
    // CameraPosition uses LatLng(lat, lng) — Flutter/MapLibre convention at the camera boundary.
    // Style URL remains MapTiler streets-v4.
    return MaplibreMap(
      styleString: '$styleUrl?key=$apiKey',
      initialCameraPosition: const CameraPosition(
        target: LatLng(50.1167, 14.4178),
        zoom: 12.0,
      ),
      trackCameraPosition: true,
    );
  }
}

void main() {
  runApp(const MaterialApp(home: MapPage()));
}
