import SwiftUI

@main
struct DaddyCaddyWatch: App {
    @StateObject private var connector = PhoneConnector()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(connector)
        }
    }
}
