import SwiftUI
import WatchKit

@main
struct DaddyCaddyWatch: App {
    @StateObject private var connector = PhoneConnector()
    @StateObject private var sessionManager = ExtendedSessionManager()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(connector)
                .onChange(of: connector.roundContext != nil) { _, hasRound in
                    if hasRound {
                        sessionManager.start()
                    } else {
                        sessionManager.stop()
                    }
                }
        }
    }
}

/// Manages a WKExtendedRuntimeSession to keep the app active during a round.
/// This prevents watchOS from suspending the app when the wrist drops,
/// so it stays foregrounded and shows in the dock as "active".
final class ExtendedSessionManager: NSObject, ObservableObject, WKExtendedRuntimeSessionDelegate {
    private var session: WKExtendedRuntimeSession?

    func start() {
        guard session == nil || session?.state == .invalid else { return }
        let newSession = WKExtendedRuntimeSession()
        newSession.delegate = self
        newSession.start()
        session = newSession
    }

    func stop() {
        session?.invalidate()
        session = nil
    }

    func extendedRuntimeSession(
        _ extendedRuntimeSession: WKExtendedRuntimeSession,
        didInvalidateWith reason: WKExtendedRuntimeSessionInvalidationReason,
        error: (any Error)?
    ) {
        session = nil
    }

    func extendedRuntimeSessionDidStart(
        _ extendedRuntimeSession: WKExtendedRuntimeSession
    ) {}

    func extendedRuntimeSessionWillExpire(
        _ extendedRuntimeSession: WKExtendedRuntimeSession
    ) {
        // Session is about to expire — invalidate it and start a fresh one
        extendedRuntimeSession.invalidate()
        session = nil
        start()
    }
}
