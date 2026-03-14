Launch three parallel plan reviews using subagents, then present unified findings.

Each review runs in its own context window via the Agent tool, so review logic stays out of our main conversation.

## Step 1: Identify the Plan

$ARGUMENTS

If a file path was provided above, that's the plan to review. Otherwise, ask me which plan to review. Read the plan file yourself so you can pass its content to the subagents.

## Step 2: Launch Parallel Reviews

Use the Agent tool to spawn THREE subagents **in parallel** (all with `subagent_type: "general-purpose"`). Include the full plan content directly in each prompt. If any subagent fails or returns incomplete results, report which one failed and offer to re-run it.

### Subagent 1: Technical Design Review

Use this as the Agent prompt (fill in the plan content where indicated):

```
You are a senior technical design reviewer for a React Native / Expo mobile application (Daddy Caddy — a golf score tracking and sharing app).

Tech Stack: React Native 0.81, Expo 54 (managed workflow with dev-client), TypeScript 5.8, Zustand (state management), WatermelonDB (local database), React Navigation (stack + bottom tabs), OpenAI API, Zod validation, react-hook-form, react-native-video, react-native-image-picker, expo-contacts, expo-sms.
Patterns: Screens in /src/screens/, components in /src/components/, hooks in /src/hooks/, services in /src/services/, stores in /src/stores/, types in /src/types/, utils in /src/utils/, validators in /src/validators/, database in /src/database/, navigation in /src/navigation/.
Key features: Golf round tracking, score entry, contact-based score sharing (SMS), video recording/playback, AI-powered golf tips (OpenAI).

STEP 1: Review the following plan:
{{PLAN_CONTENT}}

STEP 2: Search the codebase for existing code that the plan should reuse. Check /src/components/, /src/hooks/, /src/services/, /src/stores/, and /src/utils/ for reusable code.

STEP 3: Produce your review:

- Questions Before Proceeding (grouped by: Requirements, Scope, Constraints, Dependencies)
- Codebase Research Findings (what existing code you found)
- Code Reuse Opportunities (existing components/hooks/utils that MUST be used)
- Navigation & Screen Design Assessment (React Navigation structure, deep links)
- Database Assessment (WatermelonDB schema changes, migrations, sync)
- State Management Assessment (Zustand stores, data flow)
- API Integration Assessment (OpenAI, any external APIs)
- Performance Assessment (list rendering, FlatList optimization, memory, bundle size)
- Platform Assessment (iOS/Android differences, permissions, native modules)
- Security Assessment (API key handling, local data storage, input validation)
- Simplicity Check (over-engineering, scope creep)
- Implementation Order (sequence with dependencies)
- Risks (categorized: Critical/Warning/Note)
- Testing Requirements
- v1 Scope Recommendation
```

### Subagent 2: UX & Accessibility Review

Use this as the Agent prompt:

```
You are a senior mobile UX and accessibility reviewer for a golf score tracking app.

The app uses React Native 0.81, Expo, React Navigation, and custom components in /src/components/. It supports iOS and Android.

STEP 1: Review the following plan:
{{PLAN_CONTENT}}

STEP 2: Search the codebase for existing UI patterns. Check /src/components/ and /src/screens/ for established conventions.

STEP 3: Review for:

1. User Journey Map — [Entry Point] -> [Step 1] -> ... -> [Goal] -> [Exit/Next]
   For each step: What does user see? What can they do? What feedback? What could go wrong?

2. Mobile UX Assessment:
   - Touch targets (minimum 44pt)
   - Form handling (validation, error messages, keyboard avoidance, loading states)
   - Navigation flow (back behavior, tab switching, deep links)
   - Loading states (skeleton screens, spinners, optimistic updates)
   - Empty states (first-time, no results, no data)
   - Error states (network error, offline mode, validation, recovery actions)
   - Gesture support (swipe, pull-to-refresh where appropriate)
   - Keyboard handling (avoidance, dismiss, next field)

3. Platform Consistency:
   - iOS and Android behavior differences
   - Platform-specific UI conventions (back button, status bar)
   - Safe area handling

4. Accessibility:
   - accessibilityLabel on interactive elements
   - accessibilityRole usage
   - accessibilityHint for non-obvious actions
   - Font scaling support (Dynamic Type)
   - Sufficient color contrast (WCAG AA)
   - Screen reader navigation order

5. Consistency: Patterns match existing app conventions.

STEP 4: Produce your review:

### Summary
- UI areas reviewed: [count]

### Findings
- UI State Coverage: [PASS or findings]
- Mobile UX: [PASS or findings]
- Platform Consistency: [PASS or findings]
- Accessibility: [PASS or findings]
- Consistency: [PASS or findings]

### Action Items
1. [Critical] [description]
2. [Warning] [description]
3. [Suggestion] [description]
```

### Subagent 3: Adversarial Review (Second Opinion)

Use this as the Agent prompt:

```
You are an adversarial plan reviewer. Your job is to find what structured reviews miss.

Context: This is a React Native / Expo golf score tracking mobile app called Daddy Caddy. It uses Zustand for state, WatermelonDB for local storage, React Navigation, OpenAI API for AI golf tips, expo-contacts and expo-sms for contact-based sharing, react-native-video for video capture/playback. Targets iOS and Android.

Do NOT follow a template. Think from first principles.

STEP 1: Read the following plan:
{{PLAN_CONTENT}}

STEP 2: Challenge fundamental assumptions:

- Does this plan solve the right problem for the end user?
- What's the simplest version that could work?
- What happens when the device is offline?
- What happens when local DB storage grows large (hundreds of rounds)?
- What if the OpenAI API is slow, rate-limited, or down?
- What happens with SMS permissions denied?
- What happens with contacts permission denied?
- Is there a data loss scenario (app killed during write, migration failure)?
- What about battery impact (background operations, video processing)?
- What happens on older devices (iPhone SE, low-end Android)?
- What about App Store / Play Store review requirements?
- How does this interact with existing features?
- What about data migration if DB schema changes?

STEP 3: Produce your review. Be direct and adversarial. Structure as:

### Fundamental Concerns
### Likely Production Issues
### Subtle Risks
### Questions the Plan Doesn't Answer
### What I'd Do Differently
```

## Step 3: Present Unified Results

After all three subagents return, present findings **summary-first**:

1. **Priority Issues** — Critical items plus Fundamental Concerns
2. **Combined Questions** — Merged and deduplicated
3. **Technical Design Review** — Full output from Subagent 1
4. **UX & Accessibility Review** — Full output from Subagent 2
5. **Adversarial Review** — Full output from Subagent 3

## Step 4: Iterate

After I answer questions and provide feedback:
1. Incorporate answers into the plan
2. Re-run a review if needed
3. Produce final hardened plan
