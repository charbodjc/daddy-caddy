// GolfRoundAttributes.swift — Shared between Widget Extension and Expo Native Module
// This file is the single source of truth. The module copy at
// modules/live-activity/ios/GolfRoundAttributes.swift is a symlink to this file.
// ActivityKit requires both the app and widget extension to use the same struct.

import ActivityKit
import Foundation

struct GolfRoundAttributes: ActivityAttributes {
    // Static data — set once when the activity starts
    let courseName: String
    let roundId: String

    // Dynamic data — updated after each hole/shot
    struct ContentState: Codable, Hashable {
        let currentHole: Int      // 1-18, the highest hole number with strokes
        let totalScore: Int       // sum of all strokes on completed/in-progress holes
        let scoreVsPar: Int       // totalScore - sumOfParsOnPlayedHoles (negative = under par)
        let holesCompleted: Int   // count of holes with strokes > 0
        let totalHoles: Int       // 18
    }
}
