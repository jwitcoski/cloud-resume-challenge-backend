// I7 — React Native MapTiler map (MapLibre React Native + MapTiler streets-v4)
// Official MapTiler RN path: @maptiler get-started + @maplibre/maplibre-react-native
import React from 'react';
import { StyleSheet, View } from 'react-native';
import MapLibreGL from '@maplibre/maplibre-react-native';

const MAPTILER_API_KEY =
  process.env.EXPO_PUBLIC_MAPTILER_API_KEY || 'YOUR_MAPTILER_API_KEY';

// Modern v4 style only
const STYLE_URL = `https://api.maptiler.com/maps/streets-v4/style.json?key=${MAPTILER_API_KEY}`;

export default function App() {
  MapLibreGL.setAccessToken(null);

  return (
    <View style={styles.page}>
      <View style={styles.container}>
        <MapLibreGL.MapView
          style={styles.map}
          styleURL={STYLE_URL}
          logoEnabled={false}
          attributionEnabled={true}
        >
          <MapLibreGL.Camera
            defaultSettings={{
              centerCoordinate: [14.4178, 50.1167], // [lng, lat]
              zoomLevel: 12,
            }}
          />
        </MapLibreGL.MapView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  container: { flex: 1 },
  map: { flex: 1 },
});

// Package note: MapTiler documents this as the React Native + MapTiler integration
// (@maplibre/maplibre-react-native with MapTiler Cloud style URLs). Do not invent modules.
