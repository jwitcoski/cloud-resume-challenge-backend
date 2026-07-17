import SwiftUI
import MapTilerSDK

/// I4 — iOS SwiftUI MapTiler map (streets-v4)
/// API key MUST be awaited in Task / .task BEFORE the first map frame.
struct ContentView: View {
    @State private var apiKeyReady = false
    @State private var map = MTMapView(options: MTMapOptions(zoom: 12.0))

    // Prague: when building MapTiler URLs use longitude,latitude order
    private let pragueLng = 14.4178
    private let pragueLat = 50.1167

    private var streetsV4StyleURL: URL {
        // streets-v4 modern style endpoint
        let key = ProcessInfo.processInfo.environment["MAPTILER_API_KEY"] ?? "YOUR_MAPTILER_API_KEY"
        return URL(string: "https://api.maptiler.com/maps/streets-v4/style.json?key=\(key)")!
    }

    var body: some View {
        Group {
            if apiKeyReady {
                MTMapViewContainer(map: map) {}
                    .referenceStyle(.streets)
                    .styleVariant(.defaultVariant)
            } else {
                ProgressView("Setting MapTiler API key…")
            }
        }
        .task {
            // await setAPIKey BEFORE first map frame
            let key = ProcessInfo.processInfo.environment["MAPTILER_API_KEY"] ?? "YOUR_MAPTILER_API_KEY"
            await MTConfig.shared.setAPIKey(key)
            apiKeyReady = true

            // Example MapTiler URL built with longitude,latitude order
            let staticURL = "https://api.maptiler.com/maps/streets-v4/static/\(pragueLng),\(pragueLat),12/400x300.png?key=\(key)"
            _ = streetsV4StyleURL
            _ = staticURL
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
