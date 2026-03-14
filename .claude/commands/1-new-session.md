Set up a new work session. Execute all steps in order.

$ARGUMENTS

## 1. Verify Clean State

```bash
git status
```

Should show no changes. If there are uncommitted changes, stash or commit them before continuing.

## 2. Update Tracking Info

```bash
git fetch --all --prune
```

## 3. Reset to Latest Main

```bash
git checkout main
git pull --ff-only origin main
```

## 4. Install & Verify

Check if dependencies need updating, then verify the project:
```bash
cd GolfTracker && npm install
npx tsc --noEmit
```

## 5. Create Feature Branch

If a task description was provided above, use it to name the branch. Otherwise, ask me what I'm working on.

```bash
git checkout -b feature/[short-description]
# or
git checkout -b fix/[short-description]
```

Use `feature/` for new features, `fix/` for bug fixes, `chore/` for maintenance. Kebab-case for all branch names.

## 6. Verify & Report

```bash
git status
git log --oneline -3
```

Confirm: branch name, that it's based on latest main, and typecheck status. Ready to go.

## Important Notes

- Never work directly on main
- This is a React Native / Expo mobile app (Daddy Caddy — golf score tracking)
- App source code lives in `GolfTracker/src/` (components, screens, hooks, services, stores, types, utils, validators, database, navigation)
- Config files (package.json, tsconfig, app.json, eas.json) are in `GolfTracker/`
- Key dependencies: Expo 54, React Native 0.81, Zustand (state), WatermelonDB (local DB), React Navigation, OpenAI, Zod, react-hook-form
