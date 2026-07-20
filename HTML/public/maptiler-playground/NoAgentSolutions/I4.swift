import SwiftUI
import MapTilerSDK
import CoreLocation

/// Baseline I4 — set API key with await BEFORE first map frame.
/// MapTiler URL path order: longitude,latitude

struct ContentView: View {
    @State private var ready = false
    @State private var map = MTMapView(
        options: MTMapOptions(
            center: CLLocationCoordinate2D(latitude: 50.1167, longitude: 14.4178),
            zoom: 12
        )
    )

    private var streetsV4: URL {
        let key = Bundle.main.object(forInfoDictionaryKey: "MAPTILER_API_KEY") as? String
            ?? "YOUR_MAPTILER_API_KEY"
        return URL(string: "https://api.maptiler.com/maps/streets-v4/style.json?key=\(key)")!
    }

    var body: some View {
        Group {
            if ready {
                MTMapViewContainer(map: map) {}
                    .referenceStyle(.streets)
                    .styleVariant(.defaultVariant)
            } else {
                ProgressView("Configuring MapTiler key…")
            }
        }
        .task {
            let key = Bundle.main.object(forInfoDictionaryKey: "MAPTILER_API_KEY") as? String
                ?? "YOUR_MAPTILER_API_KEY"
            await MTConfig.shared.setAPIKey(key)
            let c = CLLocationCoordinate2D(latitude: 50.1167, longitude: 14.4178)
            print("lon,lat=\(c.longitude),\(c.latitude) style=\(streetsV4)")
            ready = true
        }
    }
}

@main
struct BaselineI4App: App {
    var body: some Scene {
        WindowGroup { ContentView() }
    }
}
