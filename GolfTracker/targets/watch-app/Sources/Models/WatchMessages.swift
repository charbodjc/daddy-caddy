import Foundation

// MARK: - Phone → Watch (received via applicationContext)

struct WatchHoleScore: Codable, Identifiable {
    var id: Int { number }
    let number: Int
    let par: Int
    let strokes: Int
    let holeId: String
}

struct WatchRoundContext: Codable {
    let roundId: String
    let courseName: String
    let currentHoleNumber: Int
    let currentHoleId: String
    let totalHoles: Int
    let totalScore: Int
    let scoreVsPar: Int
    let holesCompleted: Int
    let scoring: ScoringState
    let holes: [WatchHoleScore]
}

struct WatchApplicationContext: Codable {
    let activeRound: WatchRoundContext?
    let seq: Int
    let timestamp: Double
}

// MARK: - Watch → Phone (sent via sendMessage / transferUserInfo)

enum WatchActionType: String, Codable {
    case SCORING_ACTION
    case NAVIGATE_HOLE
    case SHARE_SMS
}

enum CenterResult: String, Codable {
    case fairway, green, hole
}

/// Actions the watch can send to the phone.
/// Must serialize to JSON matching the TypeScript ScoringActionV2 union.
enum ScoringActionPayload {
    case submitDistance(value: Int)
    case skipDistance
    case toggleSwing
    case setPar(par: Int)
    case setLie(lie: LieType)
    case tapCenterResult(result: CenterResult)
    case tapDirection(direction: MissDirection)
    case tapResultLie(lie: LieType)
    case tapPenaltyLie(penaltyType: PenaltyType)
    case tapPuttMade
    case tapPuttMiss(distance: PuttMissDistance, breakDir: PuttMissBreak)

    /// Convert to dictionary for WCSession message
    func toDictionary() -> [String: Any] {
        switch self {
        case .submitDistance(let value):
            return ["type": "SUBMIT_DISTANCE", "value": value]
        case .skipDistance:
            return ["type": "SKIP_DISTANCE"]
        case .toggleSwing:
            return ["type": "TOGGLE_SWING"]
        case .setPar(let par):
            return ["type": "SET_PAR", "par": par]
        case .setLie(let lie):
            return ["type": "SET_LIE", "lie": lie.rawValue]
        case .tapCenterResult(let result):
            return ["type": "TAP_CENTER_RESULT", "result": result.rawValue]
        case .tapDirection(let direction):
            return ["type": "TAP_DIRECTION", "direction": direction.rawValue]
        case .tapResultLie(let lie):
            return ["type": "TAP_RESULT_LIE", "lie": lie.rawValue]
        case .tapPenaltyLie(let penaltyType):
            return ["type": "TAP_PENALTY_LIE", "penaltyType": penaltyType.rawValue]
        case .tapPuttMade:
            return ["type": "TAP_PUTT_MADE"]
        case .tapPuttMiss(let distance, let breakDir):
            return ["type": "TAP_PUTT_MISS", "distance": distance.rawValue, "break": breakDir.rawValue]
        }
    }
}
