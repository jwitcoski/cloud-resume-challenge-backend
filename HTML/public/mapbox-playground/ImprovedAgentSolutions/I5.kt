package com.example.mapboxlab

import android.Manifest
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.mapbox.geojson.Point
import com.mapbox.maps.extension.compose.MapboxMap
import com.mapbox.maps.extension.compose.animation.viewport.rememberMapViewportState
import com.mapbox.maps.extension.compose.style.MapStyle

/**
 * Jetpack Compose Mapbox (mapbox-android-patterns)
 * Token: BuildConfig.MAPBOX_ACCESS_TOKEN / local.properties — never hardcode pk.
 *
 * AndroidManifest.xml:
 * <uses-permission android:name="android.permission.INTERNET" />
 *
 * Coordinate order is longitude, latitude via Point.fromLngLat(lng, lat).
 */
@Composable
fun MapScreen(modifier: Modifier = Modifier) {
  val viewport = rememberMapViewportState {
    setCameraOptions {
      center(Point.fromLngLat(-77.0369, 38.9072)) // lng, lat — not lat,lng
      zoom(11.0)
      pitch(0.0)
    }
  }
  MapboxMap(
    modifier = modifier.fillMaxSize(),
    mapViewportState = viewport
  ) {
    MapStyle(style = "mapbox://styles/mapbox/streets-v12")
  }
}
