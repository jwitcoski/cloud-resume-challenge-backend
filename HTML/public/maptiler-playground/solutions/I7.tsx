/**
 * I7 — React Native MapTiler map
 *
 * Uses the documented MapTiler + MapLibre React Native approach
 * (@maplibre/maplibre-react-native), with a MapTiler streets-v4 style URL.
 * Do not invent native module names.
 *
 * Install:
 *   npx expo install @maplibre/maplibre-react-native
 *   # or follow https://docs.maptiler.com/react-native/
 */
import React, { useMemo } from 'react';
import { StyleSheet, View, Text, Platform } from 'react-native';
import MapLibreGL from '@maplibre/maplibre-react-native';

MapLibreGL.setAccessToken(null);

const MAPTILER_API_KEY =
  process.env.EXPO_PUBLIC_MAPTILER_API_KEY ||
  process.env.MAPTILER_API_KEY ||
  '';

export default function App() {
  const styleURL = useMemo(() => {
    if (!MAPTILER_API_KEY) {
      console.warn(
        'Missing MAPTILER_API_KEY / EXPO_PUBLIC_MAPTILER_API_KEY'
      );
    }
    // Modern v4 style only — never streets-v2
    return `https://api.maptiler.com/maps/streets-v4/style.json?key=${MAPTILER_API_KEY}`;
  }, []);

  if (!MAPTILER_API_KEY) {
    return (
      <View style={styles.page}>
        <Text style={styles.error}>
          Set EXPO_PUBLIC_MAPTILER_API_KEY (or MAPTILER_API_KEY) before rendering the map.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <View style={styles.container}>
        <MapLibreGL.MapView
          style={styles.map}
          styleURL={styleURL}
          logoEnabled={false}
          attributionEnabled={true}
          attributionPosition={{ bottom: 8, right: 8 }}
        >
          <MapLibreGL.Camera
            defaultSettings={{
              // Camera uses [lng, lat] in some RN bindings; MapLibreGL uses lat/lng in centerCoordinate
              centerCoordinate: [14.4178, 50.1167],
              zoomLevel: 12,
            }}
          />
          <MapLibreGL.PointAnnotation
            id="prague"
            coordinate={[14.4178, 50.1167]}
          >
            <View style={styles.annotation} />
          </MapLibreGL.PointAnnotation>
        </MapLibreGL.MapView>
      </View>
      <Text style={styles.caption}>
        MapTiler streets-v4 · {Platform.OS}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  annotation: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#e11d48',
    borderWidth: 2,
    borderColor: '#fff',
  },
  caption: {
    position: 'absolute',
    top: 48,
    left: 12,
    color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    overflow: 'hidden',
    fontSize: 12,
  },
  error: {
    margin: 24,
    color: '#fecaca',
    fontSize: 16,
  },
});
