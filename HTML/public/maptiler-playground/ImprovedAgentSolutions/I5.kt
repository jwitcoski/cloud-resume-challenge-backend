/*
 app/build.gradle.kts:
   repositories { mavenCentral() }
   dependencies { implementation("com.maptiler:maptiler-sdk-kotlin:1.3.0") }
   android.buildFeatures.buildConfig = true
   android.defaultConfig.buildConfigField(
       "String", "MAPTILER_API_KEY", "\"${providers.gradleProperty("MAPTILER_API_KEY").orNull ?: ""}\""
   )

 AndroidManifest.xml, directly under <manifest>:
   <uses-permission android:name="android.permission.INTERNET" />
 The <application> element must set android:hardwareAccelerated="true".
 Store MAPTILER_API_KEY in untracked ~/.gradle/gradle.properties or CI secrets.
 Device location is not used, so no runtime location permission is requested.
 */

package com.example.maptilercompose

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.maptiler.maptilersdk.config.MTConfig
import com.maptiler.maptilersdk.map.LngLat
import com.maptiler.maptilersdk.map.MTMapOptions
import com.maptiler.maptilersdk.map.MTMapView
import com.maptiler.maptilersdk.map.MTMapViewController
import com.maptiler.maptilersdk.map.style.MTMapReferenceStyle

private const val STREETS_V4_STYLE_URL =
    "https://api.maptiler.com/maps/streets-v4/style.json"
private const val REQUIRED_INTERNET_PERMISSION = "android.permission.INTERNET"

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val internetDeclared = packageManager.checkPermission(
            Manifest.permission.INTERNET,
            packageName
        ) == PackageManager.PERMISSION_GRANTED
        val apiKey = BuildConfig.MAPTILER_API_KEY.trim()
        if (apiKey.isNotEmpty() && internetDeclared) {
            MTConfig.apiKey = apiKey
        }

        setContent {
            MaterialTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    if (!internetDeclared) {
                        ConfigurationError(
                            "$REQUIRED_INTERNET_PERMISSION is missing from AndroidManifest.xml."
                        )
                    } else if (apiKey.isEmpty()) {
                        ConfigurationError(
                            "MAPTILER_API_KEY is missing. Supply the Gradle property before building."
                        )
                    } else {
                        PragueMap()
                    }
                }
            }
        }
    }
}

@Composable
private fun PragueMap() {
    val context = androidx.compose.ui.platform.LocalContext.current
    val controller = remember(context) { MTMapViewController(context) }
    val prague = remember { LngLat(14.4178, 50.1167) }
    val options = remember(prague) {
        MTMapOptions(
            center = prague,
            zoom = 12.0,
            bearing = 0.0,
            pitch = 25.0
        )
    }

    Box(modifier = Modifier.fillMaxSize()) {
        MTMapView(
            referenceStyle = MTMapReferenceStyle.STREETS,
            options = options,
            controller = controller,
            modifier = Modifier.fillMaxSize()
        )

        Text(
            text = "Prague • LngLat(14.4178, 50.1167)\n$STREETS_V4_STYLE_URL",
            color = Color.White,
            modifier = Modifier
                .align(Alignment.TopStart)
                .padding(12.dp)
        )
    }
}

@Composable
private fun ConfigurationError(message: String) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = message,
            color = MaterialTheme.colorScheme.error,
            style = MaterialTheme.typography.bodyLarge
        )
    }
}
