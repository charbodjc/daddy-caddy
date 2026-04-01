import SwiftUI
import WatchKit

struct HoleScoringView: View {
    let holeNumber: Int
    @EnvironmentObject var connector: PhoneConnector
    /// Whether par should be visible — derived from scoring state, survives view recreation
    private var shouldShowPar: Bool {
        scoring.isParConfirmed || scoring.currentStroke > 1 || !scoring.shots.isEmpty
    }

    /// Live context from the connector — always current, not captured at navigation time
    private var context: WatchRoundContext? {
        connector.roundContext
    }

    private var hole: WatchHoleScore? {
        context?.holes.first(where: { $0.number == holeNumber })
    }

    /// True when the distance numpad is showing (not par selection)
    private var isDistanceNumpad: Bool {
        scoring.phase == .awaiting_distance && (scoring.currentStroke > 1 || !scoring.shots.isEmpty || scoring.isParConfirmed)
    }

    private var scoring: ScoringState {
        if context?.currentHoleNumber == holeNumber {
            return connector.localScoringState ?? context?.scoring ?? .initial(par: hole?.par ?? 4)
        }
        return connector.localScoringState ?? .initial(par: hole?.par ?? 4)
    }

    var body: some View {
        if let context = context, let hole = hole {
            VStack(spacing: 0) {
                // Header row (hidden during distance numpad — it shows its own inline)
                if !isDistanceNumpad {
                    HStack(spacing: 0) {
                        Text("#\(hole.number)")
                            .fontWeight(.bold)
                        if shouldShowPar {
                            Text(" P\(scoring.par)")
                                .foregroundColor(.secondary)
                        }
                        Text(" S\(scoring.currentStroke)")
                            .foregroundColor(.secondary)
                    }
                    .font(.caption2)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 4)
                    .padding(.bottom, 2)
                }

                // Phase-specific UI
                if scoring.phase == .awaiting_distance && scoring.currentStroke == 1 && scoring.shots.isEmpty && !scoring.isParConfirmed {
                    ParSelectionView(hole: hole, context: context) { _ in }
                } else if scoring.phase == .awaiting_distance {
                    DistanceEntryView(hole: hole, context: context, unit: scoring.pendingDistanceUnit)
                        .id(scoring.currentStroke)
                } else if scoring.phase == .awaiting_result {
                    if scoring.isOnGreen {
                        PuttResultView(scoring: scoring, hole: hole, context: context)
                    } else {
                        CompassResultView(scoring: scoring, hole: hole, context: context)
                    }
                } else if scoring.phase == .awaiting_result_lie {
                    ResultLieView(scoring: scoring, hole: hole, context: context)
                } else if scoring.phase == .hole_complete {
                    HoleSummaryView(scoring: scoring, hole: hole, context: context)
                }
            }
            .navigationTitle("Hole \(hole.number)")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar(isDistanceNumpad ? .hidden : .visible, for: .navigationBar)
            .onAppear {
                navigateIfNeeded(context: context, hole: hole)
            }
        } else {
            ProgressView("Loading...")
                .accessibilityLabel("Loading hole data")
        }
    }

    /// If the phone isn't already on this hole, tell it to navigate and
    /// set an optimistic initial scoring state so the UI is immediately usable.
    private func navigateIfNeeded(context: WatchRoundContext, hole: WatchHoleScore) {
        guard context.currentHoleNumber != holeNumber else { return }
        connector.localScoringState = .initial(par: hole.par)
        connector.navigateToHole(holeNumber, holeId: hole.holeId, roundId: context.roundId)
    }
}
