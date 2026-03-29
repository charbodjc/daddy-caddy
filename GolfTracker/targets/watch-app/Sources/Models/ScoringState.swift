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
    var currentLie: LieType
    var isOnGreen: Bool
    var pendingDistance: Int?
    var pendingDistanceUnit: DistanceUnit
    var pendingSwing: SwingType
    var pendingMissDirection: MissDirection?

    static func initial(par: Int) -> ScoringState {
        ScoringState(
            phase: .awaiting_distance,
            shots: [],
            currentStroke: 1,
            par: par,
            currentLie: .tee,
            isOnGreen: false,
            pendingDistance: nil,
            pendingDistanceUnit: .yds,
            pendingSwing: .free,
            pendingMissDirection: nil
        )
    }
}
