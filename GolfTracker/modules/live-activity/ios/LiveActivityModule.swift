import ExpoModulesCore
import ActivityKit

public class LiveActivityModule: Module {
    public func definition() -> ModuleDefinition {
        Name("LiveActivity")

        AsyncFunction("startRoundActivity") { (courseName: String, roundId: String, totalHoles: Int) -> String? in
            guard #available(iOS 16.2, *) else { return nil }
            guard ActivityAuthorizationInfo().areActivitiesEnabled else { return nil }

            let attributes = GolfRoundAttributes(
                courseName: courseName,
                roundId: roundId
            )
            let initialState = GolfRoundAttributes.ContentState(
                currentHole: 1,
                totalScore: 0,
                scoreVsPar: 0,
                holesCompleted: 0,
                totalHoles: totalHoles
            )
            let content = ActivityContent(state: initialState, staleDate: nil)

            do {
                let activity = try Activity.request(
                    attributes: attributes,
                    content: content,
                    pushType: nil
                )
                return activity.id
            } catch {
                return nil
            }
        }

        AsyncFunction("updateRoundActivity") {
            (activityId: String, currentHole: Int, totalScore: Int, scoreVsPar: Int, holesCompleted: Int, totalHoles: Int) in
            guard #available(iOS 16.2, *) else { return }

            let state = GolfRoundAttributes.ContentState(
                currentHole: currentHole,
                totalScore: totalScore,
                scoreVsPar: scoreVsPar,
                holesCompleted: holesCompleted,
                totalHoles: totalHoles
            )
            let content = ActivityContent(state: state, staleDate: nil)

            let activities = Activity<GolfRoundAttributes>.activities
            guard let activity = activities.first(where: { $0.id == activityId }) else { return }

            await activity.update(content)
        }

        AsyncFunction("endRoundActivity") {
            (activityId: String, currentHole: Int, totalScore: Int, scoreVsPar: Int, holesCompleted: Int, totalHoles: Int, immediate: Bool) in
            guard #available(iOS 16.2, *) else { return }

            let finalState = GolfRoundAttributes.ContentState(
                currentHole: currentHole,
                totalScore: totalScore,
                scoreVsPar: scoreVsPar,
                holesCompleted: holesCompleted,
                totalHoles: totalHoles
            )
            let content = ActivityContent(state: finalState, staleDate: nil)

            let activities = Activity<GolfRoundAttributes>.activities
            guard let activity = activities.first(where: { $0.id == activityId }) else { return }

            let policy: ActivityUIDismissalPolicy = immediate ? .immediate : .after(.now + 300)
            await activity.end(content, dismissalPolicy: policy)
        }

        AsyncFunction("getRunningActivityId") { (roundId: String) -> String? in
            guard #available(iOS 16.2, *) else { return nil }

            let activities = Activity<GolfRoundAttributes>.activities
            // Filter by roundId to avoid returning a stale activity for a different round
            return activities.first(where: { $0.attributes.roundId == roundId })?.id
        }
    }
}
