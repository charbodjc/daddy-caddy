import SwiftUI
import WatchKit

struct DistanceEntryView: View {
    let hole: WatchHoleScore
    let context: WatchRoundContext
    @EnvironmentObject var connector: PhoneConnector
    @Environment(\.dismiss) private var dismiss

    @State private var digits: String = ""

    private var maxDigits: Int { 3 }

    var body: some View {
        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 4), count: 3), spacing: 4) {
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
                .font(.title3)
                .fontWeight(.medium)
                .frame(maxWidth: .infinity, minHeight: 36)
        }
        .buttonStyle(.bordered)
    }
}
