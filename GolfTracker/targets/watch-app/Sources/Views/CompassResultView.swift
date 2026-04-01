import SwiftUI
import WatchKit

/// Compass for off-green results: tap center (on-target) or a cardinal direction (Left/Right/Long/Short).
struct CompassResultView: View {
    let scoring: ScoringState
    let hole: WatchHoleScore
    let context: WatchRoundContext
    @EnvironmentObject var connector: PhoneConnector

    /// True when the shot is an approach to the green (or closer).
    /// Uses current lie to avoid false positives after penalties
    /// (e.g., after OB from the tee, you're still on the tee, not approaching).
    private var isTargetingGreen: Bool {
        if scoring.currentLie == .tee {
            // From the tee, only target green on par 3
            return scoring.par <= 3
        }
        // From fairway/rough/trouble: target green when stroke count
        // suggests an approach (stroke >= par - 2)
        return scoring.currentStroke >= scoring.par - 2
    }

    private var centerLabel: String {
        isTargetingGreen ? "Green" : "Fairway"
    }

    var body: some View {
        mainCompass
    }

    /// The secondary center result — the opposite of what the main center button shows.
    private var secondaryCenterResult: CenterResult {
        isTargetingGreen ? .fairway : .green
    }

    private var secondaryCenterLabel: String {
        isTargetingGreen ? "Fairway" : "Green"
    }

    // MARK: - Main Compass

    private var mainCompass: some View {
        VStack(spacing: 2) {
            // Long (narrow, centered)
            directionButton(.long, icon: "arrow.up")

            // Middle row: Left | Center | Right
            HStack(spacing: 2) {
                directionButton(.left, icon: "arrow.left")

                // Center: primary on-target result
                Button {
                    let result: CenterResult = isTargetingGreen ? .green : .fairway
                    connector.sendAction(.tapCenterResult(result: result),
                                         roundId: context.roundId,
                                         holeId: hole.holeId)
                    WKInterfaceDevice.current().play(.success)
                } label: {
                    Text(centerLabel)
                        .font(.system(size: 12))
                        .fontWeight(.bold)
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .tint(Color(hex: "2E7D32"))
                .controlSize(.small)
                .accessibilityLabel(centerLabel)

                directionButton(.right, icon: "arrow.right")
            }

            // Bottom row: secondary result | Short | Hole!
            HStack(spacing: 2) {
                Button {
                    connector.sendAction(.tapCenterResult(result: secondaryCenterResult),
                                         roundId: context.roundId,
                                         holeId: hole.holeId)
                    WKInterfaceDevice.current().play(.success)
                } label: {
                    Text(secondaryCenterLabel)
                        .font(.system(size: 11))
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
                .tint(Color(hex: "2E7D32"))
                .controlSize(.small)
                .accessibilityLabel(secondaryCenterLabel)

                directionButton(.short, icon: "arrow.down")

                Button {
                    connector.sendAction(.tapCenterResult(result: .hole),
                                         roundId: context.roundId,
                                         holeId: hole.holeId)
                    WKInterfaceDevice.current().play(.success)
                } label: {
                    Text("Hole!")
                        .font(.system(size: 11))
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
                .tint(.blue)
                .controlSize(.small)
                .accessibilityLabel("Holed shot")
            }
        }
        .padding(.horizontal, 2)
    }

    // MARK: - Helpers

    private func directionButton(_ direction: MissDirection, icon: String) -> some View {
        Button {
            sendDirection(direction)
        } label: {
            Image(systemName: icon)
                .font(.system(size: 12))
        }
        .buttonStyle(.bordered)
        .tint(.red)
        .controlSize(.small)
        .accessibilityLabel("Miss \(direction)")
    }

    private func sendDirection(_ direction: MissDirection) {
        connector.sendAction(.tapDirection(direction: direction),
                             roundId: context.roundId,
                             holeId: hole.holeId)
        WKInterfaceDevice.current().play(.notification)
    }
}
