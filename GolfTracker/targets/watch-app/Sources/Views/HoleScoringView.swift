import SwiftUI
import WatchKit

struct HoleScoringView: View {
    let holeNumber: Int
    @EnvironmentObject var connector: PhoneConnector

    /// Live context from the connector — always current, not captured at navigation time
    private var context: WatchRoundContext? {
        connector.roundContext
    }

    private var hole: WatchHoleScore? {
        context?.holes.first(where: { $0.number == holeNumber })
    }

    private var scoring: ScoringState {
        connector.localScoringState ?? context?.scoring ?? .initial(par: hole?.par ?? 4)
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
                    Text("Par \(hole.par)")
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
                switch scoring.phase {
                case .awaiting_distance:
                    DistanceEntryView(scoring: scoring, hole: hole, context: context)
                case .awaiting_result:
                    if scoring.isOnGreen {
                        PuttResultView(scoring: scoring, hole: hole, context: context)
                    } else {
                        CompassResultView(scoring: scoring, hole: hole, context: context)
                    }
                case .awaiting_result_lie:
                    ResultLieView(scoring: scoring, hole: hole, context: context)
                case .hole_complete:
                    HoleSummaryView(scoring: scoring, hole: hole, context: context)
                }
            }
            .navigationTitle("Hole \(hole.number)")
            .navigationBarTitleDisplayMode(.inline)
        } else {
            ProgressView("Loading...")
                .accessibilityLabel("Loading hole data")
        }
    }
}
