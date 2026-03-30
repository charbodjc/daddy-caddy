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

    var body: some View {
        ScrollView {
            VStack(spacing: 6) {
                // Score badge
                VStack(spacing: 2) {
                    Text("\(totalStrokes)")
                        .font(.title3)
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

                // Send / Skip buttons
                HStack(spacing: 8) {
                    Button {
                        WKInterfaceDevice.current().play(.click)
                        dismiss()
                    } label: {
                        Text("Skip")
                            .font(.caption)
                            .frame(maxWidth: .infinity, minHeight: 38)
                    }
                    .buttonStyle(.bordered)
                    .tint(.gray)
                    .accessibilityLabel("Skip sending score")

                    Button {
                        sendToContacts()
                    } label: {
                        Text("Send")
                            .font(.caption)
                            .frame(maxWidth: .infinity, minHeight: 38)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.green)
                    .accessibilityLabel("Send hole score to contacts")
                }
                .padding(.horizontal, 4)
            }
            .padding(.horizontal, 4)
        }
        .onAppear {
            WKInterfaceDevice.current().play(.success)
        }
    }

    private func sendToContacts() {
        let scoreName = ScoreColor.name(forScoreVsPar: scoreVsPar)
        let scoreStr = formatScoreVsPar(scoreVsPar)
        let puttCount = scoring.shots.filter { $0.lie == .green }.count
        var body = "Hole \(hole.number) at \(context.courseName): \(scoreName)! \(totalStrokes) on par \(scoring.par) (\(scoreStr))"
        if puttCount > 0 {
            body += " - \(puttCount) putt\(puttCount == 1 ? "" : "s")"
        }

        let sent = connector.sendShareRequest(text: body, roundId: context.roundId)
        if sent {
            WKInterfaceDevice.current().play(.success)
        } else {
            WKInterfaceDevice.current().play(.failure)
        }
        dismiss()
    }
}
