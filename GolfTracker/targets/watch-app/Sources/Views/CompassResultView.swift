import SwiftUI
import WatchKit

/// Compass for off-green results: tap center (on-target) or a cardinal direction (Left/Right/Long/Short).
struct CompassResultView: View {
    let scoring: ScoringState
    let hole: WatchHoleScore
    let context: WatchRoundContext
    @EnvironmentObject var connector: PhoneConnector

    private var centerLabel: String {
        scoring.currentLie == .tee ? "Fairway" : "Green"
    }

    var body: some View {
        mainCompass
    }

    // MARK: - Main Compass

    private var mainCompass: some View {
        VStack(spacing: 2) {
            // Long
            directionButton(.long, label: "Long", icon: "arrow.up")

            HStack(spacing: 2) {
                // Left
                directionButton(.left, label: "Left", icon: "arrow.left")

                // Center: on-target or hole
                VStack(spacing: 2) {
                    Button {
                        let result: CenterResult = scoring.currentLie == .tee ? .fairway : .green
                        connector.sendAction(.tapCenterResult(result: result),
                                             roundId: context.roundId,
                                             holeId: hole.holeId)
                        WKInterfaceDevice.current().play(.success)
                    } label: {
                        Text(centerLabel)
                            .font(.system(size: 10))
                            .fontWeight(.bold)
                            .frame(minWidth: 38, minHeight: 22)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(Color(hex: "2E7D32"))
                    .accessibilityLabel(centerLabel)

                    Button {
                        connector.sendAction(.tapCenterResult(result: .hole),
                                             roundId: context.roundId,
                                             holeId: hole.holeId)
                        WKInterfaceDevice.current().play(.success)
                    } label: {
                        Text("Hole!")
                            .font(.system(size: 10))
                            .frame(minWidth: 38, minHeight: 22)
                    }
                    .buttonStyle(.bordered)
                    .tint(.blue)
                    .accessibilityLabel("Holed shot")
                    .accessibilityHint("Records the ball going in the hole")
                }

                // Right
                directionButton(.right, label: "Right", icon: "arrow.right")
            }

            // Short
            directionButton(.short, label: "Short", icon: "arrow.down")
        }
        .padding(.horizontal, 2)
    }

    // MARK: - Helpers

    private func directionButton(_ direction: MissDirection, label: String, icon: String) -> some View {
        Button {
            sendDirection(direction)
        } label: {
            Image(systemName: icon)
                .font(.system(size: 10))
                .frame(minWidth: 26, minHeight: 22)
        }
        .buttonStyle(.bordered)
        .tint(.red)
        .accessibilityLabel("Miss \(label)")
    }

    private func sendDirection(_ direction: MissDirection) {
        connector.sendAction(.tapDirection(direction: direction),
                             roundId: context.roundId,
                             holeId: hole.holeId)
        WKInterfaceDevice.current().play(.notification)
    }
}
