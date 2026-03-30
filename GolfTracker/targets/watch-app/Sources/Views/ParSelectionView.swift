import SwiftUI
import WatchKit

struct ParSelectionView: View {
    let hole: WatchHoleScore
    let context: WatchRoundContext
    @EnvironmentObject var connector: PhoneConnector
    let onParSelected: (Int) -> Void

    private let parOptions = [3, 4, 5]

    var body: some View {
        VStack(spacing: 6) {
            Text("Select Par")
                .font(.caption)
                .foregroundColor(.secondary)

            HStack(spacing: 6) {
                ForEach(parOptions, id: \.self) { par in
                    Button {
                        selectPar(par)
                    } label: {
                        Text("\(par)")
                            .font(.title2)
                            .fontWeight(.bold)
                            .frame(maxWidth: .infinity, minHeight: 50)
                    }
                    .buttonStyle(.bordered)
                    .tint(par == hole.par ? .green : nil)
                    .accessibilityLabel("Par \(par)")
                }
            }
        }
        .padding(.horizontal, 4)
    }

    private func selectPar(_ par: Int) {
        WKInterfaceDevice.current().play(.click)
        connector.sendAction(.setPar(par: par),
                             roundId: context.roundId,
                             holeId: hole.holeId)
        onParSelected(par)
    }
}
