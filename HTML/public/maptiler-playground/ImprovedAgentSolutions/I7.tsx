/*
 package.json dependencies:
   "@maplibre/maplibre-react-native": "^10.0.0",
   "expo": "^53.0.0",
   "expo-dev-client": "~5.2.0",
   "react": "19.0.0",
   "react-native": "0.79.5"

 app.json must include "@maplibre/maplibre-react-native" in expo.plugins.
 Build native projects with `npx expo run:android` or, on macOS, `npx expo run:ios`.
 Expo Go cannot load this native module; use a development build.
 Android's generated manifest includes INTERNET permission. No location permission is
 required because this screen does not request or display device location.
 Set EXPO_PUBLIC_MAPTILER_API_KEY in the build environment to a public key restricted
 to the application's allowed origins/usages.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapLibreGL from '@maplibre/maplibre-react-native';

MapLibreGL.setWellKnownTileServer(MapLibreGL.TileServers.MapLibre);
MapLibreGL.setAccessToken(null);

const PRAGUE: [number, number] = [14.4178, 50.1167];
const integrationNote =
  'MapTiler documents @maplibre/maplibre-react-native; @maptiler/react-native is not imported because it is not the supported binding.';

export default function App(): React.JSX.Element {
  const cameraRef = useRef<MapLibreGL.CameraRef>(null);
  const [status, setStatus] = useState('Loading MapTiler streets-v4…');
  const [failed, setFailed] = useState(false);
  const apiKey = process.env.EXPO_PUBLIC_MAPTILER_API_KEY?.trim();

  const styleURL = useMemo(() => {
    if (!apiKey) return null;
    return `https://api.maptiler.com/maps/streets-v4/style.json?key=${encodeURIComponent(apiKey)}`;
  }, [apiKey]);

  const returnToPrague = useCallback(() => {
    cameraRef.current?.setCamera({
      centerCoordinate: PRAGUE,
      zoomLevel: 12,
      pitch: 30,
      animationDuration: 900,
      animationMode: 'flyTo',
    });
  }, []);

  if (!styleURL) {
    return (
      <SafeAreaView style={styles.errorPage}>
        <Text accessibilityRole="alert" style={styles.errorTitle}>
          Map configuration missing
        </Text>
        <Text style={styles.errorText}>
          EXPO_PUBLIC_MAPTILER_API_KEY must be supplied by the development-build
          environment before this screen can create the map.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.page}>
      <MapLibreGL.MapView
        style={styles.map}
        styleURL={styleURL}
        logoEnabled
        attributionEnabled
        compassEnabled
        onDidFinishLoadingMap={() => {
          setFailed(false);
          setStatus('Map ready • Prague 14.4178° E, 50.1167° N');
        }}
        onDidFailLoadingMap={(event) => {
          console.error('MapTiler map load failed:', event);
          setFailed(true);
          setStatus('Map or style loading failed. Check the network and API-key restrictions.');
        }}
      >
        <MapLibreGL.Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: PRAGUE,
            zoomLevel: 12,
            pitch: 30,
          }}
          minZoomLevel={2}
          maxZoomLevel={19}
        />
        <MapLibreGL.PointAnnotation id="prague" coordinate={PRAGUE}>
          <View style={styles.marker} accessible accessibilityLabel="Prague marker" />
        </MapLibreGL.PointAnnotation>
      </MapLibreGL.MapView>

      <SafeAreaView pointerEvents="box-none" style={styles.overlay}>
        <View style={[styles.status, failed && styles.statusFailed]}>
          <Text accessibilityLiveRegion="polite" style={styles.statusText}>
            {status}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={returnToPrague}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Return to Prague</Text>
          </Pressable>
        </View>
      </SafeAreaView>
      <Text style={styles.srOnly}>{integrationNote}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#0f172a' },
  map: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center' },
  status: {
    margin: 12,
    maxWidth: 420,
    padding: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(15,23,42,0.9)',
  },
  statusFailed: { backgroundColor: 'rgba(127,29,29,0.94)' },
  statusText: { color: '#ffffff', textAlign: 'center' },
  button: {
    alignSelf: 'center',
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#2563eb',
  },
  buttonText: { color: '#ffffff', fontWeight: '600' },
  marker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: '#ffffff',
    backgroundColor: '#ef4444',
  },
  errorPage: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#fff7ed',
  },
  errorTitle: { color: '#991b1b', fontSize: 22, fontWeight: '700' },
  errorText: { color: '#451a03', fontSize: 16, marginTop: 10 },
  srOnly: { position: 'absolute', width: 1, height: 1, opacity: 0 },
});
