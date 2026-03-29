import SwiftUI

struct RoundOverviewView: View {
    let context: WatchRoundContext
    @EnvironmentObject var connector: PhoneConnector

    var body: some View {
        List {
            // Header
            Section {
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(context.courseName)
                            .font(.headline)
                            .lineLimit(1)
                        Text("\(context.holesCompleted) of \(context.totalHoles) holes")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                    Spacer()
                    Text(formatScoreVsPar(context.scoreVsPar))
                        .font(.title3)
                        .fontWeight(.bold)
                        .foregroundColor(ScoreColor.color(forScoreVsPar: context.scoreVsPar))
                }
            }

            // Holes
            Section {
                ForEach(context.holes) { hole in
                    NavigationLink {
                        HoleScoringView(holeNumber: hole.number)
                    } label: {
                        HoleRowView(
                            hole: hole,
                            isCurrent: hole.number == context.currentHoleNumber
                        )
                    }
                }
            }
        }
        .navigationTitle("Scorecard")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                if !connector.isReachable {
                    Image(systemName: "iphone.slash")
                        .font(.caption2)
                        .foregroundColor(.orange)
                        .accessibilityLabel("iPhone not connected")
                }
            }
        }
    }
}
