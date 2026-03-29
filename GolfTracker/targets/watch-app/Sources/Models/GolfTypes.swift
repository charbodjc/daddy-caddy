import Foundation

// All enums use String raw values matching the TypeScript constants in src/types/index.ts.
// JSON serialization MUST produce identical strings for cross-platform compatibility.

enum LieType: String, Codable, CaseIterable {
    case tee, fairway, rough, sand, green, trouble
}

enum SwingType: String, Codable {
    case free, restricted
}

enum ShotOutcome: String, Codable {
    case on_target, missed, holed, penalty
}

enum MissDirection: String, Codable, CaseIterable {
    case left, right, short, long
    case short_left, short_right, long_left, long_right
}

enum PenaltyType: String, Codable {
    case ob, hazard, lost
}

enum PuttMissDistance: String, Codable {
    case long, short
}

enum PuttMissBreak: String, Codable {
    case high, low
}

enum DistanceUnit: String, Codable {
    case yds, ft
}

struct TrackedShotV2: Codable, Identifiable, Equatable {
    var id: Int { stroke }
    let stroke: Int
    let lie: LieType
    var distanceToHole: Int?
    let distanceUnit: DistanceUnit
    let swing: SwingType
    let outcome: ShotOutcome
    var missDirection: MissDirection?
    var puttMissDistance: PuttMissDistance?
    var puttMissBreak: PuttMissBreak?
    var resultLie: LieType?
    var penaltyType: PenaltyType?
    var penaltyStrokes: Int?
}
