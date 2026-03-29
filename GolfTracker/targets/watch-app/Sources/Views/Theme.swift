import SwiftUI

// Colors ported from src/utils/shotDataV2Helpers.ts and src/utils/scoreColors.ts

enum LieColor {
    static func color(for lie: LieType) -> Color {
        switch lie {
        case .tee:     return Color(hex: "4CAF50")
        case .fairway: return Color(hex: "4CAF50")
        case .rough:   return Color(hex: "8BC34A")
        case .sand:    return Color(hex: "F4B400")
        case .green:   return Color(hex: "2E7D32")
        case .trouble: return Color(hex: "F44336")
        }
    }

    static func label(for lie: LieType) -> String {
        switch lie {
        case .tee:     return "Tee"
        case .fairway: return "Fairway"
        case .rough:   return "Rough"
        case .sand:    return "Bunker"
        case .green:   return "Green"
        case .trouble: return "Trouble"
        }
    }
}

enum ScoreColor {
    static func color(forScoreVsPar diff: Int) -> Color {
        if diff <= -2 { return Color(hex: "FFD700") }
        if diff == -1 { return Color(hex: "388E3C") }
        if diff == 0  { return .gray }
        if diff == 1  { return Color(hex: "FF9800") }
        return Color(hex: "F44336")
    }

    static func name(forScoreVsPar diff: Int) -> String {
        if diff <= -2 { return "Eagle" }
        if diff == -1 { return "Birdie" }
        if diff == 0  { return "Par" }
        if diff == 1  { return "Bogey" }
        if diff == 2  { return "Double" }
        return "+\(diff)"
    }
}

func formatScoreVsPar(_ score: Int) -> String {
    if score > 0 { return "+\(score)" }
    if score == 0 { return "E" }
    return "\(score)"
}

func calculateTotalStrokes(_ shots: [TrackedShotV2]) -> Int {
    shots.count + shots.compactMap(\.penaltyStrokes).reduce(0, +)
}

// MARK: - Hex Color Extension

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let r, g, b: Double
        switch hex.count {
        case 6:
            r = Double((int >> 16) & 0xFF) / 255.0
            g = Double((int >> 8) & 0xFF) / 255.0
            b = Double(int & 0xFF) / 255.0
        default:
            r = 1; g = 1; b = 1
        }
        self.init(red: r, green: g, blue: b)
    }
}
