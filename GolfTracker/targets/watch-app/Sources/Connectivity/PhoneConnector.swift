import Foundation
import WatchConnectivity

final class PhoneConnector: NSObject, ObservableObject {
    @Published var roundContext: WatchRoundContext?
    @Published var isReachable: Bool = false

    /// Optimistic local scoring state (applies actions immediately, reconciles with phone)
    @Published var localScoringState: ScoringState?

    private var session: WCSession?
    private let actionQueue = ActionQueue()

    override init() {
        super.init()
        guard WCSession.isSupported() else { return }
        session = WCSession.default
        session?.delegate = self
        session?.activate()
    }

    // MARK: - Send action to phone

    func sendAction(_ action: ScoringActionPayload, roundId: String, holeId: String) {
        // Apply optimistically
        if var state = localScoringState {
            state = ScoringReducer.reduce(state, action)
            localScoringState = state
        }

        let messageId = UUID().uuidString
        let message: [String: Any] = [
            "type": WatchActionType.SCORING_ACTION.rawValue,
            "messageId": messageId,
            "roundId": roundId,
            "holeId": holeId,
            "action": action.toDictionary(),
        ]

        sendToPhone(message, messageId: messageId)
    }

    /// Send SMS share request to phone. Real-time only — never queued.
    /// Returns false if the phone is unreachable (caller should show feedback).
    @discardableResult
    func sendShareRequest(text: String, roundId: String) -> Bool {
        guard let session = session,
              session.activationState == .activated,
              session.isReachable else {
            return false
        }

        let messageId = UUID().uuidString
        let message: [String: Any] = [
            "type": WatchActionType.SHARE_SMS.rawValue,
            "messageId": messageId,
            "roundId": roundId,
            "text": text,
        ]
        session.sendMessage(message, replyHandler: nil, errorHandler: nil)
        return true
    }

    func navigateToHole(_ holeNumber: Int, holeId: String, roundId: String) {
        let messageId = UUID().uuidString
        let message: [String: Any] = [
            "type": WatchActionType.NAVIGATE_HOLE.rawValue,
            "messageId": messageId,
            "roundId": roundId,
            "holeNumber": holeNumber,
            "holeId": holeId,
        ]

        sendToPhone(message, messageId: messageId)
    }

    // MARK: - Private

    private func sendToPhone(_ message: [String: Any], messageId: String) {
        guard let session = session, session.activationState == .activated else {
            // Queue for later delivery
            actionQueue.enqueue(message)
            return
        }

        if session.isReachable {
            session.sendMessage(message, replyHandler: nil) { [weak self] _ in
                // sendMessage failed — queue as transferUserInfo
                self?.actionQueue.enqueue(message)
                self?.flushQueue()
            }
        } else {
            // Not reachable — use transferUserInfo (guaranteed delivery)
            actionQueue.enqueue(message)
            flushQueue()
        }
    }

    private func flushQueue() {
        guard let session = session, session.activationState == .activated else { return }
        while let message = actionQueue.dequeue() {
            session.transferUserInfo(message)
        }
    }

    private func processApplicationContext(_ context: [String: Any]) {
        guard let jsonString = context["data"] as? String else { return }
        if jsonString == "null" {
            DispatchQueue.main.async {
                self.roundContext = nil
                self.localScoringState = nil
            }
            return
        }

        guard let data = jsonString.data(using: .utf8) else { return }
        do {
            let appContext = try JSONDecoder().decode(WatchApplicationContext.self, from: data)
            DispatchQueue.main.async {
                self.roundContext = appContext.activeRound
                // Reconcile: phone's state always wins
                self.localScoringState = appContext.activeRound?.scoring
            }
        } catch {
            print("[PhoneConnector] Failed to decode context: \(error)")
        }
    }
}

// MARK: - WCSessionDelegate

extension PhoneConnector: WCSessionDelegate {
    func session(
        _ session: WCSession,
        activationDidCompleteWith activationState: WCSessionActivationState,
        error: Error?
    ) {
        // Check for any context received before activation
        if activationState == .activated {
            let context = session.receivedApplicationContext
            if !context.isEmpty {
                processApplicationContext(context)
            }
            DispatchQueue.main.async {
                self.isReachable = session.isReachable
            }
            flushQueue()
        }
    }

    func session(
        _ session: WCSession,
        didReceiveApplicationContext applicationContext: [String: Any]
    ) {
        processApplicationContext(applicationContext)
    }

    func session(
        _ session: WCSession,
        didReceiveMessage message: [String: Any]
    ) {
        // Phone may send real-time updates via sendMessage too
        processApplicationContext(message)
    }

    func sessionReachabilityDidChange(_ session: WCSession) {
        DispatchQueue.main.async {
            self.isReachable = session.isReachable
        }
        if session.isReachable {
            flushQueue()
        }
    }
}

// MARK: - Action Queue (persisted to UserDefaults for crash resilience)

private class ActionQueue {
    private let key = "com.daddycaddy.watchActionQueue"
    private var queue: [[String: Any]] = []

    init() {
        // Restore queued actions from UserDefaults
        if let data = UserDefaults.standard.data(forKey: key),
           let restored = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] {
            queue = restored
        }
    }

    func enqueue(_ message: [String: Any]) {
        queue.append(message)
        persist()
    }

    func dequeue() -> [String: Any]? {
        guard !queue.isEmpty else { return nil }
        let message = queue.removeFirst()
        persist()
        return message
    }

    private func persist() {
        if let data = try? JSONSerialization.data(withJSONObject: queue) {
            UserDefaults.standard.set(data, forKey: key)
        }
    }
}
