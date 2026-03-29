import SwiftUI

struct DistanceEntryView: View {
    let scoring: ScoringState
    let hole: WatchHoleScore
    let context: WatchRoundContext
    @EnvironmentObject var connector: PhoneConnector

    @State private var distance: Double

    private var unit: String { scoring.pendingDistanceUnit == .ft ? "ft" : "yds" }
    private var step: Double { scoring.isOnGreen ? 1 : 5 }
    private var range: ClosedRange<Double> {
        scoring.isOnGreen ? 1...60 : 5...700
    }

    init(scoring: ScoringState, hole: WatchHoleScore, context: WatchRoundContext) {
        self.scoring = scoring
        self.hole = hole
        self.context = context
        // Default: 150yds off-green, 20ft on-green
        let initial = scoring.isOnGreen ? 20.0 : 150.0
        _distance = State(initialValue: initial)
    }

    var body: some View {
        VStack(spacing: 8) {
            // Lie badge
            Text(LieColor.label(for: scoring.currentLie))
                .font(.caption2)
                .fontWeight(.semibold)
                .padding(.horizontal, 8)
                .padding(.vertical, 2)
                .background(LieColor.color(for: scoring.currentLie).opacity(0.3))
                .cornerRadius(8)
                .accessibilityLabel("Lie: \(LieColor.label(for: scoring.currentLie))")

            // Distance with Digital Crown
            Text("\(Int(distance)) \(unit)")
                .font(.title2)
                .fontWeight(.bold)
                .focusable()
                .digitalCrownRotation(
                    $distance,
                    from: range.lowerBound,
                    through: range.upperBound,
                    by: step,
                    sensitivity: .medium,
                    isContinuous: false,
                    isHapticFeedbackEnabled: true
                )
                .accessibilityLabel("Distance: \(Int(distance)) \(unit)")
                .accessibilityHint("Use Digital Crown to adjust distance")

            // Swing type toggle
            Button {
                connector.sendAction(.toggleSwing,
                                     roundId: context.roundId,
                                     holeId: hole.holeId)
            } label: {
                Text(scoring.pendingSwing == .free ? "Free" : "Restricted")
                    .font(.caption2)
                    .foregroundColor(scoring.pendingSwing == .free ? .green : .orange)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Swing: \(scoring.pendingSwing == .free ? "free" : "restricted")")
            .accessibilityHint("Tap to toggle swing type")

            // Submit / Skip
            HStack(spacing: 12) {
                Button {
                    connector.sendAction(.submitDistance(value: Int(distance)),
                                         roundId: context.roundId,
                                         holeId: hole.holeId)
                    WKInterfaceDevice.current().play(.click)
                } label: {
                    Image(systemName: "checkmark")
                        .font(.title3)
                        .frame(minWidth: 44, minHeight: 44)
                }
                .buttonStyle(.borderedProminent)
                .tint(.green)
                .accessibilityLabel("Submit distance")

                Button {
                    connector.sendAction(.skipDistance,
                                         roundId: context.roundId,
                                         holeId: hole.holeId)
                } label: {
                    Text("Skip")
                        .font(.caption)
                        .frame(minWidth: 44, minHeight: 44)
                }
                .buttonStyle(.bordered)
                .accessibilityLabel("Skip distance")
            }
        }
        .padding(.horizontal, 4)
    }
}
