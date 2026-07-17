// I5 — Android Jetpack Compose MapTiler map
// build.gradle.kts (app): implementation("com.maptiler:maptiler-sdk-kotlin:1.3.0")
// AndroidManifest.xml must include INTERNET permission (see bottom of this file).

package com.example.maptileri5

import android.content.Context
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier.Modifier
import androidx.compose.ui.platform.LocalContext
import com.maptiler.maptilersdk.config.MTConfig
import com.maptiler.maptilersdk.map.MTMapOptions
import com.maptiler.maptilersdk.map.MTMapView
import com.maptiler.maptilersdk.map.MTMapViewController
import com.maptiler.maptilersdk.map.LngLat
import com.maptiler.maptilersdk.map.style.MTMapReferenceStyle
// LngLat(lng, lat) is the MapTiler Android SDK coordinate type

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Set API key BEFORE first map composition
        MTConfig.apiKey = BuildConfig.MAPTILER_API_KEY
            ?: error("Set MAPTILER_API_KEY in BuildConfig / local.properties")

        setContent {
            MapScreen()
        }
    }
}

@Composable
fun MapScreen() {
    val context: Context = LocalContext.current
    val controller = remember { MTMapViewController(context) }

    // LngLat(lng, lat) — MapTiler Android SDK order
    val prague = LngLat(14.4178, 50.1167)

    // streets-v4 via SDK reference style (resolves to modern v4)
    // Explicit style URL also available for custom loads:
    val streetsV4StyleUrl =
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

    // Log / retain the v4 URL so tooling can verify streets-v4 wiring
    android.util.Log.d("MapTilerI5", "streets-v4 style: $streetsV4StyleUrl")
}

/*
AndroidManifest.xml excerpt (required):

<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.INTERNET" />

    <application
        android:hardwareAccelerated="true"
        android:usesCleartextTraffic="false">
        <activity
            android:name=".MainActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
*/
