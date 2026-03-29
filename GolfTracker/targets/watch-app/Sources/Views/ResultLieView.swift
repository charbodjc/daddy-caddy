import SwiftUI
import WatchKit

struct ResultLieView: View {
    let scoring: ScoringState
    let hole: WatchHoleScore
    let context: WatchRoundContext
    @EnvironmentObject var connector: PhoneConnector

    var body: some View {
        ScrollView {
            VStack(spacing: 6) {
                Text("Where did it end up?")
                    .font(.caption2)
                    .foregroundColor(.secondary)

                // Lie options
                lieButton(.fairway)
                lieButton(.rough)
                lieButton(.sand)
                lieButton(.trouble)

                // Penalty divider
                HStack {
                    Rectangle()
                        .frame(height: 1)
                        .foregroundColor(.secondary.opacity(0.3))
                    Text("Penalty +1")
                        .font(.caption2)
                        .foregroundColor(.red)
                    Rectangle()
                        .frame(height: 1)
                        .foregroundColor(.secondary.opacity(0.3))
                }
                .padding(.vertical, 4)

                // Penalty options
                penaltyButton(.ob, label: "OB", color: .red)
                penaltyButton(.hazard, label: "Hazard", color: .blue)
                penaltyButton(.lost, label: "Lost", color: .gray)
            }
            .padding(.horizontal, 4)
        }
    }

    private func lieButton(_ lie: LieType) -> some View {
        Button {
            connector.sendAction(.tapResultLie(lie: lie),
                                 roundId: context.roundId,
                                 holeId: hole.holeId)
            WKInterfaceDevice.current().play(.click)
        } label: {
            HStack {
                Circle()
                    .fill(LieColor.color(for: lie))
                    .frame(width: 10, height: 10)
                Text(LieColor.label(for: lie))
                    .font(.caption)
                Spacer()
            }
            .frame(maxWidth: .infinity, minHeight: 44)
            .padding(.horizontal, 8)
        }
        .buttonStyle(.bordered)
        .accessibilityLabel("Result: \(LieColor.label(for: lie))")
        .accessibilityHint("Records the ball landing in the \(LieColor.label(for: lie).lowercased())")
    }

    private func penaltyButton(_ penalty: PenaltyType, label: String, color: Color) -> some View {
        Button {
            connector.sendAction(.tapPenaltyLie(penaltyType: penalty),
                                 roundId: context.roundId,
                                 holeId: hole.holeId)
            WKInterfaceDevice.current().play(.failure)
        } label: {
            HStack {
                Image(systemName: "exclamationmark.triangle.fill")
                    .foregroundColor(color)
                    .font(.caption2)
                Text(label)
                    .font(.caption)
                Spacer()
            }
            .frame(maxWidth: .infinity, minHeight: 44)
            .padding(.horizontal, 8)
        }
        .buttonStyle(.bordered)
        .tint(color)
        .accessibilityLabel("Penalty: \(label)")
        .accessibilityHint("Records a penalty stroke")
    }
}
