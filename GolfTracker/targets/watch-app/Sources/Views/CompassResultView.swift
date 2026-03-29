import SwiftUI
import WatchKit

/// 2-step compass for off-green results.
/// Step 1: Tap center (on-target) or a quadrant (Left/Right/Long/Short).
/// Step 2 (if quadrant): Confirm specific direction or pick diagonal.
struct CompassResultView: View {
    let scoring: ScoringState
    let hole: WatchHoleScore
    let context: WatchRoundContext
    @EnvironmentObject var connector: PhoneConnector

    @State private var selectedQuadrant: MissDirection?

    private var centerLabel: String {
        scoring.currentLie == .tee ? "Fairway" : "Green"
    }

    var body: some View {
        if let quadrant = selectedQuadrant {
            // Step 2: Specific direction picker
            directionPicker(quadrant: quadrant)
        } else {
            // Step 1: Main compass
            mainCompass
        }
    }

    // MARK: - Step 1: Main Compass

    private var mainCompass: some View {
        VStack(spacing: 6) {
            // Long
            directionButton(.long, label: "Long", icon: "arrow.up")

            HStack(spacing: 6) {
                // Left
                directionButton(.left, label: "Left", icon: "arrow.left")

                // Center: on-target or hole
                VStack(spacing: 4) {
                    Button {
                        let result: CenterResult = scoring.currentLie == .tee ? .fairway : .green
                        connector.sendAction(.tapCenterResult(result: result),
                                             roundId: context.roundId,
                                             holeId: hole.holeId)
                        WKInterfaceDevice.current().play(.success)
                    } label: {
                        Text(centerLabel)
                            .font(.caption2)
                            .fontWeight(.bold)
                            .frame(minWidth: 52, minHeight: 44)
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
                            .font(.caption2)
                            .frame(minWidth: 52, minHeight: 44)
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

    // MARK: - Step 2: Direction Picker (for diagonals)

    private func directionPicker(quadrant: MissDirection) -> some View {
        let diagonals = diagonalsFor(quadrant)
        return VStack(spacing: 8) {
            Text("Which way?")
                .font(.caption2)
                .foregroundColor(.secondary)

            // Primary direction (straight)
            Button {
                sendDirection(quadrant)
            } label: {
                Text(directionLabel(quadrant))
                    .font(.caption)
                    .fontWeight(.bold)
                    .frame(maxWidth: .infinity, minHeight: 44)
            }
            .buttonStyle(.borderedProminent)
            .tint(.red)

            // Diagonals
            HStack(spacing: 8) {
                ForEach(diagonals, id: \.self) { dir in
                    Button {
                        sendDirection(dir)
                    } label: {
                        Text(directionLabel(dir))
                            .font(.caption2)
                            .frame(maxWidth: .infinity, minHeight: 44)
                    }
                    .buttonStyle(.bordered)
                    .tint(.red)
                }
            }

            Button {
                selectedQuadrant = nil
            } label: {
                Text("Back")
                    .font(.caption2)
            }
            .buttonStyle(.plain)
            .foregroundColor(.secondary)
        }
        .padding(.horizontal, 4)
    }

    // MARK: - Helpers

    private func directionButton(_ direction: MissDirection, label: String, icon: String) -> some View {
        Button {
            selectedQuadrant = direction
        } label: {
            Image(systemName: icon)
                .font(.caption)
                .frame(minWidth: 44, minHeight: 44)
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
        selectedQuadrant = nil
    }

    private func diagonalsFor(_ quadrant: MissDirection) -> [MissDirection] {
        switch quadrant {
        case .long:  return [.long_left, .long_right]
        case .short: return [.short_left, .short_right]
        case .left:  return [.long_left, .short_left]
        case .right: return [.long_right, .short_right]
        default:     return []
        }
    }

    private func directionLabel(_ dir: MissDirection) -> String {
        switch dir {
        case .left:        return "Left"
        case .right:       return "Right"
        case .long:        return "Long"
        case .short:       return "Short"
        case .long_left:   return "Long L"
        case .long_right:  return "Long R"
        case .short_left:  return "Short L"
        case .short_right: return "Short R"
        }
    }
}
