import ActivityKit
import SwiftUI
import WidgetKit

struct GolfRoundLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: GolfRoundAttributes.self) { context in
            // Lock Screen / StandBy presentation
            lockScreenView(context: context)
                .widgetURL(deepLink(for: context.attributes.roundId))
                .accessibilityElement(children: .combine)
                .accessibilityLabel(accessibilityDescription(context: context))
        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded regions
                DynamicIslandExpandedRegion(.leading) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Hole")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                        Text("\(context.state.currentHole)")
                            .font(.title2)
                            .fontWeight(.bold)
                    }
                }
                DynamicIslandExpandedRegion(.trailing) {
                    VStack(alignment: .trailing, spacing: 2) {
                        Text("Score")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                        Text(formatScoreVsPar(context.state.scoreVsPar))
                            .font(.title2)
                            .fontWeight(.bold)
                            .foregroundStyle(scoreColor(context.state.scoreVsPar))
                    }
                }
                DynamicIslandExpandedRegion(.center) {
                    VStack(spacing: 2) {
                        Text(context.attributes.courseName)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                        Text("\(context.state.totalScore)")
                            .font(.title)
                            .fontWeight(.heavy)
                        Text("\(context.state.holesCompleted)/\(context.state.totalHoles) holes")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                }
                DynamicIslandExpandedRegion(.bottom) {
                    EmptyView()
                }
            } compactLeading: {
                Text("\(context.state.currentHole)")
                    .font(.headline)
                    .fontWeight(.bold)
            } compactTrailing: {
                Text(formatScoreVsPar(context.state.scoreVsPar))
                    .font(.headline)
                    .fontWeight(.bold)
                    .foregroundStyle(scoreColor(context.state.scoreVsPar))
            } minimal: {
                Text(formatScoreVsPar(context.state.scoreVsPar))
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundStyle(scoreColor(context.state.scoreVsPar))
            }
            .widgetURL(deepLink(for: context.attributes.roundId))
        }
    }

    // MARK: - Lock Screen Layout

    @ViewBuilder
    private func lockScreenView(context: ActivityViewContext<GolfRoundAttributes>) -> some View {
        HStack(spacing: 16) {
            // Course name and progress
            VStack(alignment: .leading, spacing: 4) {
                Text(context.attributes.courseName)
                    .font(.headline)
                    .lineLimit(1)
                Text("\(context.state.holesCompleted)/\(context.state.totalHoles) holes")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            // Hole number
            VStack(spacing: 2) {
                Text("HOLE")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                Text("\(context.state.currentHole)")
                    .font(.title2)
                    .fontWeight(.bold)
            }

            // Divider
            Rectangle()
                .fill(.secondary.opacity(0.3))
                .frame(width: 1, height: 36)

            // Total score
            VStack(spacing: 2) {
                Text("SCORE")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                Text("\(context.state.totalScore)")
                    .font(.title2)
                    .fontWeight(.bold)
            }

            // Divider
            Rectangle()
                .fill(.secondary.opacity(0.3))
                .frame(width: 1, height: 36)

            // Score vs par
            VStack(spacing: 2) {
                Text("PAR")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                Text(formatScoreVsPar(context.state.scoreVsPar))
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundStyle(scoreColor(context.state.scoreVsPar))
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }

    // MARK: - Helpers

    private func deepLink(for roundId: String) -> URL {
        guard let url = URL(string: "daddycaddy://round/\(roundId)") else {
            // Fallback: open the app without a specific round
            return URL(string: "daddycaddy://")!
        }
        return url
    }

    private func formatScoreVsPar(_ score: Int) -> String {
        if score == 0 { return "E" }
        return score > 0 ? "+\(score)" : "\(score)"
    }

    private func scoreColor(_ scoreVsPar: Int) -> Color {
        // 5-tier system matching scoreColors.ts
        if scoreVsPar <= -2 { return Color(red: 1.0, green: 0.84, blue: 0.0) }    // #FFD700 gold — eagle or better
        if scoreVsPar == -1 { return Color(red: 0.22, green: 0.56, blue: 0.24) }   // #388E3C green — birdie
        if scoreVsPar == 0  { return Color(red: 0.2, green: 0.2, blue: 0.2) }      // #333333 neutral — par
        if scoreVsPar == 1  { return Color(red: 1.0, green: 0.6, blue: 0.0) }      // #FF9800 orange — bogey
        return Color(red: 0.96, green: 0.26, blue: 0.21)                            // #F44336 red — double+
    }

    private func accessibilityDescription(context: ActivityViewContext<GolfRoundAttributes>) -> String {
        let parDescription: String
        let svp = context.state.scoreVsPar
        if svp == 0 {
            parDescription = "even par"
        } else if svp > 0 {
            parDescription = "\(svp) over par"
        } else {
            parDescription = "\(abs(svp)) under par"
        }
        return "Round at \(context.attributes.courseName), hole \(context.state.currentHole) of \(context.state.totalHoles), \(parDescription)"
    }
}
