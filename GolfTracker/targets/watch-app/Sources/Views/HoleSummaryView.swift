import SwiftUI
import WatchKit

struct HoleSummaryView: View {
    let scoring: ScoringState
    let hole: WatchHoleScore
    let context: WatchRoundContext
    @EnvironmentObject var connector: PhoneConnector
    @Environment(\.dismiss) private var dismiss

    private var totalStrokes: Int {
        calculateTotalStrokes(scoring.shots)
    }

    private var scoreVsPar: Int {
        totalStrokes - scoring.par
    }

    private var isLastHole: Bool {
        hole.number >= context.totalHoles
    }

    var body: some View {
        VStack(spacing: 12) {
            // Score badge
            VStack(spacing: 4) {
                Text("\(totalStrokes)")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                    .foregroundColor(ScoreColor.color(forScoreVsPar: scoreVsPar))

                Text(ScoreColor.name(forScoreVsPar: scoreVsPar))
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundColor(ScoreColor.color(forScoreVsPar: scoreVsPar))

                Text("Par \(scoring.par)")
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
            .accessibilityLabel("\(ScoreColor.name(forScoreVsPar: scoreVsPar)), \(totalStrokes) on par \(scoring.par)")

            // Shot count
            Text("\(scoring.shots.count) shots\(scoring.shots.contains(where: { $0.penaltyStrokes != nil }) ? " + penalty" : "")")
                .font(.caption2)
                .foregroundColor(.secondary)

            // Next hole / back to scorecard
            Button {
                WKInterfaceDevice.current().play(.click)
                dismiss()
            } label: {
                Label(
                    isLastHole ? "Scorecard" : "Next Hole",
                    systemImage: isLastHole ? "list.number" : "arrow.right"
                )
                    .font(.caption)
                    .frame(maxWidth: .infinity, minHeight: 44)
            }
            .buttonStyle(.borderedProminent)
            .tint(.green)
            .accessibilityLabel(isLastHole ? "Back to scorecard" : "Go to next hole")
        }
        .padding(.horizontal, 4)
        .onAppear {
            WKInterfaceDevice.current().play(.success)
        }
    }
}
