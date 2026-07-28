import React, { useEffect } from "react";
import Mapbox, { MapView, Camera, PointAnnotation } from "react-native-maps";
import { View, StyleSheet, Text } from "react-native";
import Config from "react-native-config";

/**
 * React Native Mapbox (react-native-maps)
 * Token from react-native-config / env — never hardcode pk. in the bundle.
 */
const token = Config.MAPBOX_ACCESS_TOKEN;
if (!token) {
  throw new Error("Missing MAPBOX_ACCESS_TOKEN");
}


export default function MapScreen() {
  useEffect(() => {
    return () => {
      /* optional native teardown */
    };
  }, []);

  return (
    <View style={styles.wrap}>
      <MapView style={styles.map} styleURL={Mapbox.StyleURL.Street} compassEnabled>
        <Camera zoomLevel={11} centerCoordinate={[-77.0369, 38.9072]} animationMode="flyTo" />
        <PointAnnotation id="dc" coordinate={[-77.0369, 38.9072]} title="Downtown DC">
          <View style={styles.dot}>
            <Text style={styles.dotLabel}>DC</Text>
          </View>
        </PointAnnotation>
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  map: { flex: 1 },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#3b82f6",
    alignItems: "center",
    justifyContent: "center",
  },
  dotLabel: { color: "#fff", fontSize: 10, fontWeight: "700" },
});
