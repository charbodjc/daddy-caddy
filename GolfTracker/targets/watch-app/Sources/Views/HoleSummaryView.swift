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
        ScrollView {
            VStack(spacing: 10) {
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

                // Share via SMS (relayed to phone)
                Button {
                    shareViaPhone()
                } label: {
                    Label("Text Score", systemImage: "message.fill")
                        .font(.caption)
                        .frame(maxWidth: .infinity, minHeight: 44)
                }
                .buttonStyle(.bordered)
                .tint(.blue)
                .accessibilityLabel("Send hole score via text message")
                .accessibilityHint("Opens Messages on your iPhone")
            }
            .padding(.horizontal, 4)
        }
        .onAppear {
            WKInterfaceDevice.current().play(.success)
        }
    }

    private func shareViaPhone() {
        let scoreName = ScoreColor.name(forScoreVsPar: scoreVsPar)
        let scoreStr = formatScoreVsPar(scoreVsPar)
        let body = "Hole \(hole.number) at \(context.courseName): \(scoreName)! \(totalStrokes) on par \(scoring.par) (\(scoreStr))"

        connector.sendShareRequest(text: body)
        WKInterfaceDevice.current().play(.click)
    }
}
