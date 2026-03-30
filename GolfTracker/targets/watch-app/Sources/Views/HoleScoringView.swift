import SwiftUI
import WatchKit

struct HoleScoringView: View {
    let holeNumber: Int
    @EnvironmentObject var connector: PhoneConnector
    @State private var parConfirmed = false

    /// Live context from the connector — always current, not captured at navigation time
    private var context: WatchRoundContext? {
        connector.roundContext
    }

    private var hole: WatchHoleScore? {
        context?.holes.first(where: { $0.number == holeNumber })
    }

    /// Use phone's scoring state only when the phone is on this hole;
    /// otherwise use the optimistic local state (set in onAppear after NAVIGATE_HOLE).
    private var scoring: ScoringState {
        if context?.currentHoleNumber == holeNumber {
            return connector.localScoringState ?? context?.scoring ?? .initial(par: hole?.par ?? 4)
        }
        return connector.localScoringState ?? .initial(par: hole?.par ?? 4)
    }

    var body: some View {
        if let context = context, let hole = hole {
            VStack(spacing: 0) {
                // Header: Hole info
                HStack {
                    Text("Hole \(hole.number)")
                        .font(.caption)
                        .fontWeight(.bold)
                    Spacer()
                    Text("Par \(scoring.par)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Spacer()
                    Text("Stroke \(scoring.currentStroke)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .padding(.horizontal, 4)
                .padding(.bottom, 4)

                // Phase-specific UI
                if scoring.phase == .awaiting_distance && scoring.currentStroke == 1 && scoring.shots.isEmpty && !parConfirmed {
                    ParSelectionView(hole: hole, context: context) { _ in
                        parConfirmed = true
                    }
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
