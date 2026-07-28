/*
 Xcode setup:
 - Add Swift Package https://github.com/maptiler/maptiler-sdk-swift.git at 1.3.1
   and link the MapTilerSDK product to the iOS application target.
 - Add MAPTILER_API_KEY as a String in Info.plist, populated from an xcconfig value.
 - HTTPS MapTiler endpoints need no App Transport Security exception.
 - This sample does not request device location. If location is enabled later, add
   NSLocationWhenInUseUsageDescription and request user authorization first.
 */

import SwiftUI
import CoreLocation
import MapTilerSDK

private enum AppConfiguration {
    static func mapTilerAPIKey() throws -> String {
        guard
            let value = Bundle.main.object(
                forInfoDictionaryKey: "MAPTILER_API_KEY"
            ) as? String,
            !value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        else {
            throw ConfigurationError.missingAPIKey
        }
        return value.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    enum ConfigurationError: LocalizedError {
        case missingAPIKey

        var errorDescription: String? {
            "MAPTILER_API_KEY is missing from the application Info.plist."
        }
    }
}

@main
struct MapTilerSwiftUIApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}

@MainActor
struct ContentView: View {
    @State private var mapView: MTMapView?
    @State private var streetsV4StyleURL: URL?
    @State private var errorMessage: String?

    private let prague = CLLocationCoordinate2D(
        latitude: 50.1167,
        longitude: 14.4178
    )

    var body: some View {
        ZStack {
            if let mapView, let streetsV4StyleURL {
                MTMapViewContainer(map: mapView) {
                    let popup = MTTextPopup(
                        coordinates: prague,
                        text: "Prague — 14.4178° E, 50.1167° N",
                        offset: 18
                    )
                    MTMarker(
                        coordinates: prague,
                        draggable: false,
                        popup: popup
                    )
                }
                .referenceStyle(.custom(streetsV4StyleURL))
                .ignoresSafeArea()
                .accessibilityLabel("MapTiler streets map centered on Prague")
            } else if let errorMessage {
                ContentUnavailableView(
                    "Map unavailable",
                    systemImage: "map.fill",
                    description: Text(errorMessage)
                )
                .padding()
            } else {
                ProgressView("Configuring MapTiler securely…")
                    .accessibilityIdentifier("apiKeyReadyProgressView")
            }
        }
        .task {
            await configureMapOnce()
        }
    }

    private func configureMapOnce() async {
        guard mapView == nil, errorMessage == nil else { return }

        do {
            let apiKey = try AppConfiguration.mapTilerAPIKey()
            await MTConfig.shared.setAPIKey(apiKey)

            var components = URLComponents(
                string: "https://api.maptiler.com/maps/streets-v4/style.json"
            )
            components?.queryItems = [URLQueryItem(name: "key", value: apiKey)]
            guard let styleURL = components?.url else {
                throw MapSetupError.invalidStyleURL
            }

            let options = MTMapOptions(
                center: prague,
                zoom: 12,
                bearing: 0,
                pitch: 25
            )
            streetsV4StyleURL = styleURL
            mapView = MTMapView(options: options)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    enum MapSetupError: LocalizedError {
        case invalidStyleURL

        var errorDescription: String? {
            "The authenticated streets-v4 style URL could not be constructed."
        }
    }
}

extension ContentView {
    static func reverseGeocodingURL(
        for coordinate: CLLocationCoordinate2D,
        apiKey: String
    ) -> URL? {
        let coordinatePath = "\(coordinate.longitude),\(coordinate.latitude)"
        var components = URLComponents(
            string: "https://api.maptiler.com/geocoding/\(coordinatePath).json"
        )
        components?.queryItems = [URLQueryItem(name: "key", value: apiKey)]
        return components?.url
    }
}
