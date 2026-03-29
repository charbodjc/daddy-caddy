import SwiftUI

struct ContentView: View {
    @EnvironmentObject var connector: PhoneConnector

    var body: some View {
        Group {
            if let context = connector.roundContext {
                NavigationStack {
                    RoundOverviewView(context: context)
                }
            } else {
                WaitingView()
            }
        }
    }
}
