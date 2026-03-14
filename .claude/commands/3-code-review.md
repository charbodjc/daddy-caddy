Run a comprehensive code review on all changes in this session. Auto-fix issues where possible.

Each review runs in its own context window via the Agent tool, so review logic stays out of our main conversation.

$ARGUMENTS

## Step 1: Identify What to Review

1. **Find touched files**:
   ```bash
   git diff --name-only origin/main...HEAD
   ```

2. **Check for a plan** (optional context):
   - If a plan file path was provided above, read it
   - Otherwise check `docs/` for a recent plan matching the current branch name
   - If no plan found, note "no plan"

3. **Read the diff** for the adversarial reviewer:
   ```bash
   git diff origin/main...HEAD
   ```

## Step 2: Launch Code Reviews (Parallel)

Use the Agent tool to spawn subagents **in parallel** (all with `subagent_type: "general-purpose"`). Include the file list and plan content (if any) directly in each prompt.

**Skip Subagent 2** if no files contain UI changes (no `.tsx` files in the file list, nothing in `/src/components/` or `/src/screens/`). Only launch Subagents 1 and 3 in that case.

### Subagent 1: Technical Code Review

Use this as the Agent prompt:

```
You are a senior technical code reviewer for Daddy Caddy, a React Native / Expo golf score tracking mobile app.

Tech Stack: React Native 0.81, Expo 54, TypeScript 5.8, Zustand (state), WatermelonDB (local DB), React Navigation (stack + bottom tabs), OpenAI API, Zod validation, react-hook-form, react-native-video, expo-contacts, expo-sms.
Patterns: Screens in /src/screens/, components in /src/components/, hooks in /src/hooks/, services in /src/services/, stores in /src/stores/, types in /src/types/, utils in /src/utils/, validators in /src/validators/, database in /src/database/, navigation in /src/navigation/.

IMPORTANT: Review EVERY touched file completely. Read each file in full.

STEP 1: Here are the files changed:
{{FILE_LIST}}

Plan context (if any):
{{PLAN_CONTENT_OR_NONE}}

STEP 2: Read each touched file IN FULL. Review for:

**Type Safety**:
- No `any` types, `@ts-ignore`, `@ts-expect-error`, `!` non-null assertions, unsafe `as` casts
- Proper typing for API responses, component props, navigation params
- Zod validation at API boundaries

**State & Data**:
- Zustand store patterns (selectors, actions, immutability)
- WatermelonDB model/query correctness
- No stale closures in hooks
- Proper cleanup in useEffect

**Performance**:
- FlatList with keyExtractor, getItemLayout where possible
- Memoization (React.memo, useMemo, useCallback) where needed
- No heavy computation on JS thread
- Image/video handling optimized
- No unnecessary re-renders

**Code Quality**:
- No `// TODO` comments — complete or flag
- Proper error handling with user-facing error messages
- Consistent with existing patterns
- No unused imports, variables, or dead code

**Security**:
- No secrets/API keys hardcoded in code (use env vars via react-native-config)
- User input validated and sanitized
- OpenAI API key not exposed in client code
- Proper permission handling (contacts, SMS, camera)

STEP 3: Auto-fix any issues you can. Only report issues you cannot fix.

STEP 4: Produce your review:

### Summary
- Files reviewed: [count]
- Auto-fixes applied: [list]

### Findings
For sections with no issues, use "PASS".

- Type Safety: [PASS or findings]
- State & Data: [PASS or findings]
- Performance: [PASS or findings]
- Code Quality: [PASS or findings]
- Security: [PASS or findings]

### Action Items
1. [Critical] [description]
2. [Warning] [description]
3. [Suggestion] [description]
```

### Subagent 2: UX & Accessibility Review

Use this as the Agent prompt:

```
You are a senior mobile UX and accessibility reviewer for a golf score tracking app.

Tech Stack: React Native 0.81, Expo, React Navigation, custom components in /src/components/.

IMPORTANT: Review EVERY touched file with UI changes completely.

STEP 1: Here are the files changed:
{{FILE_LIST}}

STEP 2: Read each touched file with UI changes IN FULL. Search the codebase for existing UI patterns.

STEP 3: Review for:

**UI State Coverage** — For every UI element:
- Loading states (skeleton, spinner, disabled during load)
- Empty states (first-time, no results, no data)
- Error states (network error, offline, validation, recovery)
- Success states (confirmation, feedback, next steps)

**Mobile UX**:
- Touch targets (minimum 44pt)
- Forms: keyboard avoidance, validation, error messages, submit handling
- Navigation flow and back behavior
- Pull-to-refresh / pagination where appropriate
- Gesture handling (swipe actions, etc.)

**Accessibility**:
- accessibilityLabel on interactive elements and images
- accessibilityRole and accessibilityHint
- Dynamic Type / font scaling support
- Sufficient color contrast (WCAG AA)
- Screen reader navigation order

**Platform Consistency**:
- iOS and Android behavior differences handled
- Safe area insets applied correctly
- Status bar handling

**Consistency**: Patterns match existing app conventions.

STEP 4: Produce your review:

### Summary
- UI files reviewed: [count]

### Findings
- UI State Coverage: [PASS or findings]
- Mobile UX: [PASS or findings]
- Accessibility: [PASS or findings]
- Platform Consistency: [PASS or findings]
- Consistency: [PASS or findings]

### Action Items
1. [Critical] [description]
2. [Warning] [description]
3. [Suggestion] [description]
```

### Subagent 3: Adversarial Review

Use this as the Agent prompt:

```
You are an adversarial code reviewer. Find what structured reviews miss.

Context: Daddy Caddy is a React Native / Expo golf score tracking mobile app with Zustand state management, WatermelonDB local database, React Navigation, OpenAI API integration, expo-contacts and expo-sms for sharing, and react-native-video for video features. Targets iOS and Android.

Do NOT follow a template. Think from first principles.

STEP 1: Here are the files changed and the full diff:
{{FILE_LIST}}
{{FULL_DIFF}}

STEP 2: Read each touched file IN FULL. Challenge assumptions:

- Does this code solve the right problem?
- What happens when the device is offline?
- What happens with concurrent writes to WatermelonDB?
- What if the OpenAI API is rate-limited or returns unexpected responses?
- What if permissions (contacts, SMS, camera) are denied at runtime?
- Is there a race condition in async operations?
- What happens on slow or older devices?
- What breaks if a DB migration hasn't been run?
- Are there memory leaks (uncleaned subscriptions, listeners)?

STEP 3: Produce your review:

### Fundamental Concerns
### Likely Production Issues
### Subtle Risks
### What I'd Do Differently
```

## Step 3: Present Results

Summary-first:

1. **Priority Issues** — Critical items plus Fundamental Concerns
2. **Auto-Fixes Applied**
3. **Action Items** — Merged, deduplicated, sorted by severity
4. **Technical Code Review** — Full output from Subagent 1
5. **UX & Accessibility Review** — Full output from Subagent 2 (if run)
6. **Adversarial Review** — Full output from Subagent 3

## Step 4: Fix and Iterate

1. Fix Critical/Warning issues immediately
2. Re-run subagents if fixes were significant
3. Run final validation:
   ```bash
   cd GolfTracker && npm run lint
   cd GolfTracker && npx tsc --noEmit
   ```
4. Report final status
