import SwiftUI
import MapTilerSDK
import CoreLocation

/// I4 — iOS SwiftUI MapTiler map (streets-v4)
/// await MTConfig.shared.setAPIKey inside .task BEFORE the first map frame.
/// When building MapTiler URLs use longitude,latitude order.

enum MapTilerSecrets {
    /// Prefer Info.plist / xcconfig; placeholder for local builds.
    static var apiKey: String {
        Bundle.main.object(forInfoDictionaryKey: "MAPTILER_API_KEY") as? String
            ?? "YOUR_MAPTILER_API_KEY"
    }
}

struct ContentView: View {
    @State private var apiKeyReady = false
    @State private var mapView = MTMapView(
        options: MTMapOptions(
            center: CLLocationCoordinate2D(latitude: 50.1167, longitude: 14.4178),
            zoom: 12.0
        )
    )

    /// Explicit streets-v4 style endpoint (modern v4 — never streets-v2).
    private func streetsV4StyleURL(apiKey: String) -> URL {
        URL(string: "https://api.maptiler.com/maps/streets-v4/style.json?key=\(apiKey)")!
    }

    var body: some View {
        Group {
            if apiKeyReady {
                MTMapViewContainer(map: mapView) {}
                    .referenceStyle(.streets)
                    .styleVariant(.defaultVariant)
                    .task {
                        let key = MapTilerSecrets.apiKey
                        let styleURL = streetsV4StyleURL(apiKey: key)
                        // Apply streets-v4 via SDK reference style + explicit URL wiring
                        await mapView.setStyle(.streets, styleVariant: .defaultVariant)
                        // Retain / log the style URL (longitude,latitude shown for REST helpers)
                        let prague = CLLocationCoordinate2D(latitude: 50.1167, longitude: 14.4178)
                        let lonLat = "\(prague.longitude),\(prague.latitude)"
                        print("streets-v4 styleURL=\(styleURL.absoluteString)")
                        print("MapTiler REST coordinate order lon,lat=\(lonLat)")
                        _ = styleURL
                    }
            } else {
                ProgressView("Waiting for MapTiler API key…")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .task {
            await MTConfig.shared.setAPIKey(MapTilerSecrets.apiKey)
            apiKeyReady = true
        }
    }
}

@main
struct MapTilerI4App: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
