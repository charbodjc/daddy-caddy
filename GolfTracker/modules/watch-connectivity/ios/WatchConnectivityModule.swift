import ExpoModulesCore
import WatchConnectivity

public class WatchConnectivityModule: Module {
    private var sessionDelegate: SessionDelegate?

    public func definition() -> ModuleDefinition {
        Name("WatchConnectivity")

        Events(
            "onWatchScoringAction",
            "onWatchNavigateHole",
            "onWatchReachabilityChanged",
            "onWatchShareSMS"
        )

        AsyncFunction("activateSession") { () -> Bool in
            guard WCSession.isSupported() else { return false }

            let delegate = SessionDelegate(module: self)
            self.sessionDelegate = delegate

            let session = WCSession.default
            session.delegate = delegate
            session.activate()
            return true
        }

        AsyncFunction("getReachability") { () -> Bool in
            guard WCSession.isSupported() else { return false }
            return WCSession.default.isReachable
        }

        AsyncFunction("getIsPaired") { () -> Bool in
            guard WCSession.isSupported() else { return false }
            return WCSession.default.isPaired
        }

        AsyncFunction("getIsWatchAppInstalled") { () -> Bool in
            guard WCSession.isSupported() else { return false }
            return WCSession.default.isWatchAppInstalled
        }

        AsyncFunction("updateContext") { (contextJson: String) in
            let session = WCSession.default
            guard session.activationState == .activated else { return }
            try session.updateApplicationContext(["data": contextJson])
        }

        AsyncFunction("clearContext") { () in
            let session = WCSession.default
            guard session.activationState == .activated else { return }
            try session.updateApplicationContext(["data": "null"])
        }
    }

    // MARK: - Event forwarding from delegate

    func emitScoringAction(_ body: [String: Any]) {
        sendEvent("onWatchScoringAction", body)
    }

    func emitNavigateHole(_ body: [String: Any]) {
        sendEvent("onWatchNavigateHole", body)
    }

    func emitReachabilityChanged(_ reachable: Bool) {
        sendEvent("onWatchReachabilityChanged", ["reachable": reachable])
    }

    func emitShareSMS(_ body: [String: Any]) {
        sendEvent("onWatchShareSMS", body)
    }
}

// MARK: - WCSessionDelegate

private class SessionDelegate: NSObject, WCSessionDelegate {
    private weak var module: WatchConnectivityModule?
    private var processedMessageIds: Set<String> = []
    private let maxProcessedIds = 500

    init(module: WatchConnectivityModule) {
        self.module = module
        super.init()
    }

    // Required delegate methods
    func session(
        _ session: WCSession,
        activationDidCompleteWith activationState: WCSessionActivationState,
        error: Error?
    ) {}

    func sessionDidBecomeInactive(_ session: WCSession) {}

    func sessionDidDeactivate(_ session: WCSession) {
        // Re-activate for subsequent connections (e.g., watch switch)
        session.activate()
    }

    func sessionReachabilityDidChange(_ session: WCSession) {
        module?.emitReachabilityChanged(session.isReachable)
    }

    // Handle real-time messages from watch
    func session(
        _ session: WCSession,
        didReceiveMessage message: [String: Any],
        replyHandler: @escaping ([String: Any]) -> Void
    ) {
        processWatchMessage(message)
        replyHandler(["status": "ok"])
    }

    // Handle real-time messages without reply
    func session(
        _ session: WCSession,
        didReceiveMessage message: [String: Any]
    ) {
        processWatchMessage(message)
    }

    // Handle queued messages (transferUserInfo) from watch
    func session(
        _ session: WCSession,
        didReceiveUserInfo userInfo: [String: Any]
    ) {
        processWatchMessage(userInfo)
    }

    private func processWatchMessage(_ message: [String: Any]) {
        guard let messageId = message["messageId"] as? String,
              let type = message["type"] as? String else { return }

        // Deduplication — transferUserInfo may deliver after sendMessage succeeded
        guard !processedMessageIds.contains(messageId) else { return }
        processedMessageIds.insert(messageId)

        // Cap the dedup set size (arbitrary eviction — order does not matter for UUID dedup)
        if processedMessageIds.count > maxProcessedIds {
            processedMessageIds.removeFirst()
        }

        switch type {
        case "SCORING_ACTION":
            guard let roundId = message["roundId"] as? String,
                  let holeId = message["holeId"] as? String,
                  let action = message["action"] as? [String: Any] else { return }
            module?.emitScoringAction([
                "messageId": messageId,
                "roundId": roundId,
                "holeId": holeId,
                "action": action,
            ])

        case "NAVIGATE_HOLE":
            guard let roundId = message["roundId"] as? String,
                  let holeNumber = message["holeNumber"] as? Int,
                  let holeId = message["holeId"] as? String else { return }
            module?.emitNavigateHole([
                "messageId": messageId,
                "roundId": roundId,
                "holeNumber": holeNumber,
                "holeId": holeId,
            ])

        case "SHARE_SMS":
            guard let roundId = message["roundId"] as? String,
                  let text = message["text"] as? String else { return }
            module?.emitShareSMS([
                "messageId": messageId,
                "roundId": roundId,
                "text": text,
            ])

        default:
            break
        }
    }
}
