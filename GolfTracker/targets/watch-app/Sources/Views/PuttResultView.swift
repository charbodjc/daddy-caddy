import SwiftUI
import WatchKit

struct PuttResultView: View {
    let scoring: ScoringState
    let hole: WatchHoleScore
    let context: WatchRoundContext
    @EnvironmentObject var connector: PhoneConnector

    var body: some View {
        VStack(spacing: 3) {
            // Made button (full width, prominent)
            Button {
                connector.sendAction(.tapPuttMade,
                                     roundId: context.roundId,
                                     holeId: hole.holeId)
                WKInterfaceDevice.current().play(.success)
            } label: {
                Label("Made", systemImage: "checkmark.circle.fill")
                    .font(.caption)
                    .fontWeight(.bold)
                    .frame(maxWidth: .infinity, minHeight: 30)
            }
            .buttonStyle(.borderedProminent)
            .tint(.green)
            .accessibilityLabel("Putt made")
            .accessibilityHint("Records a made putt and completes the hole")

            // Miss grid: 2x2
            Text("Missed")
                .font(.caption2)
                .foregroundColor(.secondary)

            LazyVGrid(columns: [
                GridItem(.flexible(), spacing: 3),
                GridItem(.flexible(), spacing: 3),
            ], spacing: 3) {
                puttMissButton(distance: .long, breakDir: .high, label: "Long\nHigh")
                puttMissButton(distance: .long, breakDir: .low, label: "Long\nLow")
                puttMissButton(distance: .short, breakDir: .high, label: "Short\nHigh")
                puttMissButton(distance: .short, breakDir: .low, label: "Short\nLow")
            }
        }
        .padding(.horizontal, 4)
    }

    private func puttMissButton(distance: PuttMissDistance, breakDir: PuttMissBreak, label: String) -> some View {
        Button {
            connector.sendAction(.tapPuttMiss(distance: distance, breakDir: breakDir),
                                 roundId: context.roundId,
                                 holeId: hole.holeId)
            WKInterfaceDevice.current().play(.notification)
        } label: {
            Text(label)
                .font(.caption2)
                .multilineTextAlignment(.center)
                .frame(maxWidth: .infinity, minHeight: 26)
        }
        .buttonStyle(.bordered)
        .tint(.orange)
        .accessibilityLabel("Putt missed \(distance.rawValue) \(breakDir.rawValue)")
        .accessibilityHint("Records a missed putt")
    }
}
