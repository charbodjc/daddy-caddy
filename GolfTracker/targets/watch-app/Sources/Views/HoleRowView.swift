import SwiftUI

struct HoleRowView: View {
    let hole: WatchHoleScore
    let isCurrent: Bool

    var body: some View {
        HStack {
            // Hole number
            Text("\(hole.number)")
                .font(.body)
                .fontWeight(isCurrent ? .bold : .regular)
                .frame(width: 24, alignment: .leading)

            // Par
            Text("Par \(hole.par)")
                .font(.caption)
                .foregroundColor(.secondary)

            Spacer()

            // Score
            if hole.strokes > 0 {
                let diff = hole.strokes - hole.par
                Text("\(hole.strokes)")
                    .font(.body)
                    .fontWeight(.semibold)
                    .foregroundColor(ScoreColor.color(forScoreVsPar: diff))
            } else if isCurrent {
                Text("NOW")
                    .font(.caption2)
                    .fontWeight(.bold)
                    .foregroundColor(.green)
            } else {
                Text("--")
                    .font(.body)
                    .foregroundColor(.secondary)
            }
        }
        .padding(.vertical, 2)
        .listRowBackground(
            isCurrent ? Color.green.opacity(0.15) : Color.clear
        )
        .accessibilityLabel("Hole \(hole.number), par \(hole.par)\(hole.strokes > 0 ? ", score \(hole.strokes)" : isCurrent ? ", current hole" : "")")
    }
}
