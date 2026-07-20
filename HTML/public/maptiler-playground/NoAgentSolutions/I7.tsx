import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import MapLibreGL from '@maplibre/maplibre-react-native';

MapLibreGL.setAccessToken(null);

const KEY =
  process.env.EXPO_PUBLIC_MAPTILER_API_KEY ||
  process.env.MAPTILER_API_KEY ||
  '';

export default function App() {
  const styleURL = useMemo(
    () =>
      'https://api.maptiler.com/maps/streets-v4/style.json?key=' + KEY,
    []
  );
  const attributionPosition = { bottom: 8, right: 8 };
  const cameraDefaults = {
    centerCoordinate: [14.4178, 50.1167],
    zoomLevel: 12,
  };

  if (!KEY) {
    return (
      <View style={styles.root}>
        <Text style={styles.err}>Set EXPO_PUBLIC_MAPTILER_API_KEY</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <MapLibreGL.MapView
        style={styles.map}
        styleURL={styleURL}
        attributionPosition={attributionPosition}
      >
        <MapLibreGL.Camera defaultSettings={cameraDefaults} />
      </MapLibreGL.MapView>
      <Text style={styles.cap}>streets-v4 · {Platform.OS}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  map: { flex: 1 },
  cap: {
    position: 'absolute',
    top: 48,
    left: 12,
    color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 6,
  },
  err: { margin: 24, color: '#c00' },
});
