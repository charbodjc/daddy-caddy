import SwiftUI

struct WaitingView: View {
    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: "figure.golf")
                .font(.system(size: 40))
                .foregroundColor(.green)
                .accessibilityHidden(true)

            Text("Daddy Caddy")
                .font(.headline)

            Text("Start a round on\nyour iPhone")
                .font(.caption)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding()
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Daddy Caddy. Start a round on your iPhone to begin scoring.")
    }
}

#Preview {
    WaitingView()
}
