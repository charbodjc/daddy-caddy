import SwiftUI
import WatchKit

struct DistanceEntryView: View {
    let scoring: ScoringState
    let hole: WatchHoleScore
    let context: WatchRoundContext
    @EnvironmentObject var connector: PhoneConnector

    @State private var digits: String = ""

    private var unit: String { scoring.pendingDistanceUnit == .ft ? "ft" : "yds" }
    private var displayValue: String { digits.isEmpty ? "0" : digits }
    private var maxDigits: Int { 3 }

    var body: some View {
        ScrollView {
            VStack(spacing: 4) {
                // Lie badge
                Text(LieColor.label(for: scoring.currentLie))
                    .font(.caption2)
                    .fontWeight(.semibold)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 2)
                    .background(LieColor.color(for: scoring.currentLie).opacity(0.3))
                    .cornerRadius(8)
                    .accessibilityLabel("Lie: \(LieColor.label(for: scoring.currentLie))")

                // Distance display
                HStack(alignment: .firstTextBaseline, spacing: 2) {
                    Text(displayValue)
                        .font(.title2)
                        .fontWeight(.bold)
                        .monospacedDigit()
                    Text(unit)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .accessibilityLabel("Distance: \(displayValue) \(unit)")

                // Number pad: 3x4 grid
                LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 4), count: 3), spacing: 4) {
                    ForEach(1...9, id: \.self) { num in
                        numButton("\(num)") { appendDigit("\(num)") }
                    }
                    // Bottom row
                    numButton("⌫") { deleteDigit() }
                        .tint(.orange)
                    numButton("0") { appendDigit("0") }
                    numButton("✓") { submit() }
                        .tint(.green)
                }

                // Swing toggle + Skip
                HStack(spacing: 12) {
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

                    Button {
                        connector.sendAction(.skipDistance,
                                             roundId: context.roundId,
                                             holeId: hole.holeId)
                    } label: {
                        Text("Skip")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Skip distance")
                }
                .padding(.top, 4)
            }
            .padding(.horizontal, 4)
        }
    }

    // MARK: - Helpers

    private func appendDigit(_ digit: String) {
        guard digits.count < maxDigits else { return }
        if digits == "0" { digits = digit } else { digits += digit }
        WKInterfaceDevice.current().play(.click)
    }

    private func deleteDigit() {
        guard !digits.isEmpty else { return }
        digits.removeLast()
        WKInterfaceDevice.current().play(.click)
    }

    private func submit() {
        let value = Int(digits) ?? 0
        guard value > 0 else { return }
        connector.sendAction(.submitDistance(value: value),
                             roundId: context.roundId,
                             holeId: hole.holeId)
        WKInterfaceDevice.current().play(.click)
    }

    private func numButton(_ label: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(label)
                .font(.body)
                .fontWeight(.medium)
                .frame(maxWidth: .infinity, minHeight: 44)
        }
        .buttonStyle(.bordered)
    }
}
