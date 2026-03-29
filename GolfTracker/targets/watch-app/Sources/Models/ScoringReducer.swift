import Foundation

/// Pure function port of useScoringReducerV2.ts reducer.
/// Must produce identical state for identical inputs — verified via shared test vectors.
enum ScoringReducer {

    // MARK: - Public API

    static func reduce(_ state: ScoringState, _ action: ScoringActionPayload) -> ScoringState {
        switch action {

        // ── Step 1: Distance ──────────────────────────────────

        case .submitDistance(let value):
            guard state.phase == .awaiting_distance else { return state }
            var s = state
            s.phase = .awaiting_result
            s.pendingDistance = value
            return s

        case .skipDistance:
            guard state.phase == .awaiting_distance else { return state }
            var s = state
            s.phase = .awaiting_result
            s.pendingDistance = nil
            return s

        // ── Swing toggle ─────────────────────────────────────

        case .toggleSwing:
            var s = state
            s.pendingSwing = state.pendingSwing == .free ? .restricted : .free
            return s

        // ── Lie override (distance phase only) ───────────────

        case .setLie(let lie):
            guard state.phase == .awaiting_distance else { return state }
            var s = state
            s.currentLie = lie
            s.isOnGreen = lie == .green
            s.pendingDistanceUnit = inferDistanceUnit(lie)
            return s

        // ── Step 2: Result (off-green) ───────────────────────

        case .tapCenterResult(let result):
            guard state.phase == .awaiting_result else { return state }

            if result == .hole {
                let holedShot = TrackedShotV2(
                    stroke: state.currentStroke,
                    lie: state.currentLie,
                    distanceToHole: state.pendingDistance,
                    distanceUnit: state.pendingDistanceUnit,
                    swing: state.pendingSwing,
                    outcome: .holed
                )
                var s = state
                s.phase = .hole_complete
                s.shots = state.shots + [holedShot]
                s.currentStroke = state.currentStroke + 1
                return s
            }

            let resultLie: LieType = result == .fairway ? .fairway : .green
            return commitShot(state, outcome: .on_target, resultLie: resultLie)

        case .tapDirection(let direction):
            guard state.phase == .awaiting_result else { return state }
            var s = state
            s.phase = .awaiting_result_lie
            s.pendingMissDirection = direction
            return s

        // ── Step 2b: Result lie (off-green miss) ─────────────

        case .tapResultLie(let lie):
            guard state.phase == .awaiting_result_lie else { return state }
            return commitShot(state, outcome: .missed,
                              missDirection: state.pendingMissDirection,
                              resultLie: lie)

        case .tapPenaltyLie(let penaltyType):
            guard state.phase == .awaiting_result_lie else { return state }
            let penaltyLie: LieType = penaltyType == .hazard ? .trouble : state.currentLie
            return commitShot(state, outcome: .penalty,
                              missDirection: state.pendingMissDirection,
                              resultLie: penaltyLie,
                              penaltyType: penaltyType,
                              penaltyStrokes: 1)

        // ── Step 2: Result (on-green / putts) ────────────────

        case .tapPuttMade:
            guard state.phase == .awaiting_result else { return state }
            let madeShot = TrackedShotV2(
                stroke: state.currentStroke,
                lie: state.currentLie,
                distanceToHole: state.pendingDistance,
                distanceUnit: state.pendingDistanceUnit,
                swing: state.pendingSwing,
                outcome: .holed
            )
            var s = state
            s.phase = .hole_complete
            s.shots = state.shots + [madeShot]
            s.currentStroke = state.currentStroke + 1
            return s

        case .tapPuttMiss(let distance, let breakDir):
            guard state.phase == .awaiting_result else { return state }
            return commitShot(state, outcome: .missed,
                              puttMissDistance: distance,
                              puttMissBreak: breakDir,
                              resultLie: .green)
        }
    }

    // MARK: - Helpers

    static func inferNextLie(_ shots: [TrackedShotV2]) -> LieType {
        guard let last = shots.last else { return .tee }

        // OB/Lost: revert to the lie BEFORE the penalty shot
        if last.outcome == .penalty {
            if shots.count >= 2 { return shots[shots.count - 2].lie }
            return .tee
        }

        if let resultLie = last.resultLie { return resultLie }
        if last.outcome == .on_target {
            if last.lie == .tee { return .fairway }
            return .green
        }
        if last.outcome == .holed { return .green }
        return .fairway
    }

    static func inferDistanceUnit(_ lie: LieType) -> DistanceUnit {
        lie == .green ? .ft : .yds
    }

    // MARK: - Private

    private static func commitShot(
        _ state: ScoringState,
        outcome: ShotOutcome,
        missDirection: MissDirection? = nil,
        puttMissDistance: PuttMissDistance? = nil,
        puttMissBreak: PuttMissBreak? = nil,
        resultLie: LieType? = nil,
        penaltyType: PenaltyType? = nil,
        penaltyStrokes: Int? = nil
    ) -> ScoringState {
        let shot = TrackedShotV2(
            stroke: state.currentStroke,
            lie: state.currentLie,
            distanceToHole: state.pendingDistance,
            distanceUnit: state.pendingDistanceUnit,
            swing: state.pendingSwing,
            outcome: outcome,
            missDirection: missDirection,
            puttMissDistance: puttMissDistance,
            puttMissBreak: puttMissBreak,
            resultLie: resultLie,
            penaltyType: penaltyType,
            penaltyStrokes: penaltyStrokes
        )

        let newShots = state.shots + [shot]
        return advanceToNextShot(state, newShots: newShots)
    }

    private static func advanceToNextShot(_ state: ScoringState, newShots: [TrackedShotV2]) -> ScoringState {
        let nextLie = inferNextLie(newShots)
        let isOnGreen = nextLie == .green
        var s = state
        s.phase = .awaiting_distance
        s.shots = newShots
        s.currentStroke = state.currentStroke + 1
        s.currentLie = nextLie
        s.isOnGreen = isOnGreen
        s.pendingDistance = nil
        s.pendingDistanceUnit = inferDistanceUnit(nextLie)
        s.pendingSwing = .free
        s.pendingMissDirection = nil
        return s
    }
}
