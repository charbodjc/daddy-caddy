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

    private var nextHole: WatchHoleScore? {
        context.holes.first(where: { $0.number == hole.number + 1 })
    }

    var body: some View {
        VStack(spacing: 8) {
            Spacer()

            // Score badge
            Text("\(totalStrokes)")
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(ScoreColor.color(forScoreVsPar: scoreVsPar))

            Text(ScoreColor.name(forScoreVsPar: scoreVsPar))
                .font(.caption)
                .fontWeight(.semibold)
                .foregroundColor(ScoreColor.color(forScoreVsPar: scoreVsPar))
                .accessibilityLabel("\(ScoreColor.name(forScoreVsPar: scoreVsPar)), \(totalStrokes) on par \(scoring.par)")

            Spacer()

            // Send / Skip buttons
            HStack(spacing: 8) {
                Button {
                    WKInterfaceDevice.current().play(.click)
                    advanceToNextHole()
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
        .onAppear {
            WKInterfaceDevice.current().play(.success)
        }
    }

    private func advanceToNextHole() {
        // Optimistically update the round context so the scorecard
        // shows the completed score (and advances "NOW") immediately
        if var ctx = connector.roundContext {
            // Update this hole's strokes
            if let idx = ctx.holes.firstIndex(where: { $0.holeId == hole.holeId }) {
                ctx.holes[idx] = WatchHoleScore(number: hole.number, par: scoring.par, strokes: totalStrokes, holeId: hole.holeId)
            }
            // Update totals
            let completed = ctx.holes.filter { $0.strokes > 0 }
            ctx.totalScore = completed.reduce(0) { $0 + $1.strokes }
            ctx.scoreVsPar = ctx.totalScore - completed.reduce(0) { $0 + $1.par }
            ctx.holesCompleted = completed.count

            // Advance to next hole if available
            if let next = nextHole {
                ctx.currentHoleNumber = next.number
                ctx.currentHoleId = next.holeId
                ctx.scoring = .initial(par: next.par)
                connector.localScoringState = .initial(par: next.par)
                connector.navigateToHole(next.number, holeId: next.holeId, roundId: context.roundId)
            }

            connector.roundContext = ctx
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
        advanceToNextHole()
        dismiss()
    }
}
