import 'package:flutter/material.dart';
import 'package:maplibre_gl/maplibre_gl.dart';

// dart-define MAPTILER_API_KEY=...
const apiKey = String.fromEnvironment('MAPTILER_API_KEY', defaultValue: '');
const styleId = 'streets-v4';

void main() => runApp(const MaterialApp(home: Scaffold(body: MapPage())));

class MapPage extends StatefulWidget {
  const MapPage({super.key});
  @override
  State<MapPage> createState() => _MapPageState();
}

class _MapPageState extends State<MapPage> {
  @override
  Widget build(BuildContext context) {
    if (apiKey.isEmpty) {
      return const Center(child: Text('Pass MAPTILER_API_KEY via --dart-define'));
    }
    final style =
        'https://api.maptiler.com/maps/$styleId/style.json?key=$apiKey';
    return MaplibreMap(
      styleString: style,
      initialCameraPosition: const CameraPosition(
        target: LatLng(50.1167, 14.4178),
        zoom: 12,
      ),
    );
  }
}
