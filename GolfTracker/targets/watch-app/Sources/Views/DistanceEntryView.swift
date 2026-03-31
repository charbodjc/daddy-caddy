import SwiftUI
import WatchKit

struct DistanceEntryView: View {
    let hole: WatchHoleScore
    let context: WatchRoundContext
    let unit: DistanceUnit
    @EnvironmentObject var connector: PhoneConnector
    @Environment(\.dismiss) private var dismiss

    @State private var digits: String = ""

    private var maxDigits: Int { 3 }

    private var unitLabel: String {
        unit == .ft ? "ft" : "yds"
    }

    var body: some View {
        VStack(spacing: 1) {
            // Distance display
            HStack(alignment: .firstTextBaseline, spacing: 3) {
                Text(digits.isEmpty ? "—" : digits)
                    .font(.system(.caption, design: .rounded))
                    .fontWeight(.semibold)
                    .foregroundColor(digits.isEmpty ? .secondary : .white)
                    .monospacedDigit()
                Text(unitLabel)
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 1)
            .accessibilityElement(children: .combine)
            .accessibilityLabel(digits.isEmpty ? "No distance entered" : "\(digits) \(unitLabel)")

            // Numpad grid
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 1), count: 3), spacing: 1) {
                ForEach(1...9, id: \.self) { num in
                    numButton("\(num)") { appendDigit("\(num)") }
                }
                // Bottom row: cancel, 0, checkmark
                numButton("✕") { cancel() }
                    .tint(.red)
                    .accessibilityLabel("Cancel")
                numButton("0") { appendDigit("0") }
                numButton("✓") { submit() }
                    .tint(.green)
                    .accessibilityLabel("Submit distance")
            }
        }
        .padding(.horizontal, 4)
    }

    // MARK: - Helpers

    private func appendDigit(_ digit: String) {
        guard digits.count < maxDigits else { return }
        if digits == "0" { digits = digit } else { digits += digit }
        WKInterfaceDevice.current().play(.click)
    }

    private func cancel() {
        WKInterfaceDevice.current().play(.click)
        dismiss()
    }

    private func submit() {
        let value = Int(digits) ?? 0
        if value > 0 {
            connector.sendAction(.submitDistance(value: value),
                                 roundId: context.roundId,
                                 holeId: hole.holeId)
        } else {
            connector.sendAction(.skipDistance,
                                 roundId: context.roundId,
                                 holeId: hole.holeId)
        }
        WKInterfaceDevice.current().play(.click)
    }

    private func numButton(_ label: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(label)
                .font(.caption2)
                .fontWeight(.medium)
                .frame(maxWidth: .infinity, minHeight: 20)
        }
        .buttonStyle(.bordered)
    }
}
