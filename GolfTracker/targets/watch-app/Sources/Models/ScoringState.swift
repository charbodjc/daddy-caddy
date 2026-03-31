import Foundation

enum ScoringPhase: String, Codable {
    case awaiting_distance
    case awaiting_result
    case awaiting_result_lie
    case hole_complete
}

struct ScoringState: Codable, Equatable {
    var phase: ScoringPhase
    var shots: [TrackedShotV2]
    var currentStroke: Int
    var par: Int
    /// Optional for backward-compatible Codable decoding (nil treated as false)
    var parConfirmed: Bool?
    var currentLie: LieType
    var isOnGreen: Bool
    var pendingDistance: Int?
    var pendingDistanceUnit: DistanceUnit
    var pendingSwing: SwingType
    var pendingMissDirection: MissDirection?

    /// Whether the user has explicitly confirmed par for this hole
    var isParConfirmed: Bool { parConfirmed ?? false }

    static func initial(par: Int) -> ScoringState {
        ScoringState(
            phase: .awaiting_distance,
            shots: [],
            currentStroke: 1,
            par: par,
            parConfirmed: false,
            currentLie: .tee,
            isOnGreen: false,
            pendingDistance: nil,
            pendingDistanceUnit: .yds,
            pendingSwing: .free,
            pendingMissDirection: nil
        )
    }
}
