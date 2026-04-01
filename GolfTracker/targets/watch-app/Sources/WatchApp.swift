import SwiftUI
import WatchKit
import os

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
    private static let logger = Logger(subsystem: "com.daddycaddy.golf.watch", category: "ExtendedSession")

    private var session: WKExtendedRuntimeSession?

    /// Tracks consecutive restarts to avoid a tight loop if watchOS keeps expiring sessions
    /// due to resource pressure. Resets when a session runs for > 60s or on explicit stop/start.
    private var consecutiveRestarts = 0
    private var lastStartTime: Date?
    private static let maxConsecutiveRestarts = 5

    func start() {
        guard session == nil || session?.state == .invalid else { return }
        consecutiveRestarts = 0
        let newSession = WKExtendedRuntimeSession()
        newSession.delegate = self
        newSession.start()
        session = newSession
        lastStartTime = Date()
        Self.logger.info("Session started")
    }

    func stop() {
        session?.invalidate()
        session = nil
        consecutiveRestarts = 0
        lastStartTime = nil
        Self.logger.info("Session stopped")
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
        extendedRuntimeSession.invalidate()
        session = nil

        // Reset counter if the session ran for a reasonable duration
        if let lastStart = lastStartTime, Date().timeIntervalSince(lastStart) > 60 {
            consecutiveRestarts = 0
        }

        consecutiveRestarts += 1
        if consecutiveRestarts > Self.maxConsecutiveRestarts {
            Self.logger.warning("Hit restart limit (\(Self.maxConsecutiveRestarts)) — not restarting")
            return
        }

        Self.logger.info("Session expiring — restarting (\(self.consecutiveRestarts)/\(Self.maxConsecutiveRestarts))")
        let newSession = WKExtendedRuntimeSession()
        newSession.delegate = self
        newSession.start()
        session = newSession
        lastStartTime = Date()
    }
}
