import SwiftUI
import MapboxMaps
import CoreLocation

/// Mapbox Maps SDK for iOS — SwiftUI (mapbox-ios-patterns)
/// Token: set MBXAccessToken in Info.plist / .xcconfig — never commit pk. literals.
/// Style: mapbox://styles/mapbox/streets-v12 via MapStyle.streets (or Standard).
struct ContentView: View {
  private let downtown = CLLocationCoordinate2D(latitude: 38.9072, longitude: -77.0369)
  private let lincoln = CLLocationCoordinate2D(latitude: 38.8893, longitude: -77.0502)

  var body: some View {
    Map(initialViewport: .camera(center: downtown, zoom: 11, bearing: 0, pitch: 0)) {
      /* omitted annotation */

#Preview {
  ContentView()
}
