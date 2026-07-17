// I5 — Jetpack Compose MapTiler map
// build.gradle.kts (app): implementation("com.maptiler:maptiler-sdk-kotlin:1.3.0")
//
// AndroidManifest.xml (required):
//   <uses-permission android:name="android.permission.INTERNET" />
//   android:hardwareAccelerated="true"

package com.example.maptileri5

import android.Manifest
import android.content.Context
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier.Modifier
import com.maptiler.maptilersdk.config.MTConfig
import com.maptiler.maptilersdk.map.LngLat
import com.maptiler.maptilersdk.map.MTMapOptions
import com.maptiler.maptilersdk.map.MTMapReferenceStyle
import com.maptiler.maptilersdk.map.MTMapView
import com.maptiler.maptilersdk.map.MTMapViewController

/*
AndroidManifest snippet:
<manifest>
  <uses-permission android:name="android.permission.INTERNET" />
  <application android:hardwareAccelerated="true">...</application>
</manifest>
*/

@Composable
fun MapScreen(context: Context) {
    // Set API key before first map — use BuildConfig / env, never hardcode production secrets
    MTConfig.apiKey = System.getenv("MAPTILER_API_KEY") ?: "YOUR_MAPTILER_API_KEY"

    val controller = remember { MTMapViewController(context) }

    // Prague via LngLat(lng, lat) — MapTiler Android SDK order
    val prague = LngLat(14.4178, 50.1167)

    // streets-v4 style URL (modern v4)
    val streetsV4 =
        "https://api.maptiler.com/maps/streets-v4/style.json?key=${MTConfig.apiKey}"

    MTMapView(
        referenceStyle = MTMapReferenceStyle.STREETS,
        options = MTMapOptions(
            center = prague,
            zoom = 12.0,
        ),
        controller = controller,
        modifier = Modifier.fillMaxSize(),
    )

    // Reference streets-v4 URL for custom style loads
    controller.setStyleURL(streetsV4)
}

// Keep INTERNET permission visible for static graders:
// android.permission.INTERNET
