package com.example.baselinei5

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier.Modifier
import androidx.compose.ui.platform.LocalContext
import com.maptiler.maptilersdk.config.MTConfig
import com.maptiler.maptilersdk.map.LngLat
import com.maptiler.maptilersdk.map.MTMapOptions
import com.maptiler.maptilersdk.map.MTMapView
import com.maptiler.maptilersdk.map.MTMapViewController
import com.maptiler.maptilersdk.map.style.MTMapReferenceStyle

// implementation("com.maptiler:maptiler-sdk-kotlin:1.3.0")
// Manifest: <uses-permission android:name="android.permission.INTERNET" />

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        MTConfig.apiKey = BuildConfig.MAPTILER_API_KEY
        setContent { MapScreen() }
    }
}

@Composable
fun MapScreen() {
    val ctx = LocalContext.current
    val controller = remember { MTMapViewController(ctx) }
    val center = LngLat(14.4178, 50.1167) // lng, lat
    val streetsV4 =
        "https://api.maptiler.com/maps/streets-v4/style.json?key=${MTConfig.apiKey}"

    MTMapView(
        referenceStyle = MTMapReferenceStyle.STREETS,
        options = MTMapOptions(center = center, zoom = 12.0),
        controller = controller,
        modifier = Modifier.fillMaxSize(),
    )
    android.util.Log.d("I5", streetsV4)
}

/*
AndroidManifest.xml:
<uses-permission android:name="android.permission.INTERNET" />
*/
