import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

/// Flutter Mapbox Maps (mapbox-flutter-patterns)
/// Pass token: flutter run --dart-define=ACCESS_TOKEN=pk...
/// Never commit a pk. literal into source control.
class MapPage extends StatelessWidget {
  const MapPage({super.key});

  static const String accessToken = String.fromEnvironment("ACCESS_TOKEN");
  static const String mapboxAccessToken = String.fromEnvironment("MAPBOX_ACCESS_TOKEN");

  @override
  Widget build(BuildContext context) {
    final token = accessToken.isNotEmpty ? accessToken : mapboxAccessToken;
    assert(token.isNotEmpty, "Missing ACCESS_TOKEN / MAPBOX_ACCESS_TOKEN");
    MapboxOptions.setAccessToken(token);
    return Scaffold(
      body: GoogleMap(
        key: const ValueKey("mapWidget"),
        cameraOptions: CameraOptions(
          center: Point(coordinates: Position(-77.0369, 38.9072)),
          zoom: 11.0,
          bearing: 0,
          pitch: 0,
        ),
        styleUri: MapboxStyles.STREETS, // mapbox://styles/mapbox/streets-v12
        onMapCreated: (MapboxMap mapboxMap) async {
          // Ready for annotations / style tweaks
        },
      ),
    );
  }
}
