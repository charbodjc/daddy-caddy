You are the end-of-session workflow orchestrator. Run a comprehensive workflow that validates, audits, fixes, commits, pushes, and creates a PR. This is fully autonomous — execute all phases without prompting.

---

## Project Context

This is a React Native / Expo mobile app (Daddy Caddy — golf score tracking). All commands run from the `GolfTracker/` directory.

| Check | Command |
|-------|---------|
| **Lint** | `cd GolfTracker && npm run lint` |
| **Typecheck** | `cd GolfTracker && npx tsc --noEmit` |
| **Test** | `cd GolfTracker && npm test -- --ci --passWithNoTests` |

---

## CRITICAL: Zero Tolerance for CI Failures

**THE #1 RULE**: If any CI command fails, the PR MUST NOT be created. Fix the issue first.

---

## Clean Code Mode (ENABLED BY DEFAULT)

Every PR should leave the codebase cleaner than it was found.

### Clean Code Checks (ALL must pass for touched files)

| Check                                    | Blocking? | How to Fix                           |
| ---------------------------------------- | --------- | ------------------------------------ |
| Lint errors                              | FAIL      | `npm run lint --fix` or fix manually |
| TypeScript errors                        | FAIL      | Fix type errors                      |
| `// @ts-ignore` or `// @ts-expect-error` | FAIL      | Remove and fix underlying type issue |
| `// eslint-disable` comments             | FAIL      | Remove and fix underlying lint issue |
| `console.log` in production code         | FAIL      | Remove or use proper logging         |
| `TODO` or `FIXME` in NEW code            | FAIL      | Do it now or create tracking issue   |
| Unused imports                           | FAIL      | Remove them                          |
| Unused variables                         | FAIL      | Remove or use them                   |
| `any` type (explicit)                    | FAIL      | Use specific types                   |
| Test failures                            | FAIL      | Fix tests                            |

### Exceptions (Allowed)

- `// @ts-expect-error` WITH a justification comment
- `eslint-disable-next-line` WITH a justification comment
- `console.log` in test files
- Pre-existing issues in files NOT touched this session

---

## Status Model

| Status   | Meaning             | Push | PR                 |
| -------- | ------------------- | ---- | ------------------ |
| **PASS** | All steps succeeded | Yes  | Yes                |
| **WARN** | Non-blocking issues | Yes  | Yes (issues noted) |
| **FAIL** | Blocking issue      | No   | No                 |

---

## Phase 1: Discover & Validate

**Output**: `[1/4] Discover & Validate...`

### Step 1: Identify Changed Files

```bash
git diff --name-only origin/main...HEAD
```

### Step 2: Run CI Suite

Run all CI commands in order. ANY failure = FAIL (HARD) = Cannot create PR.

```bash
cd GolfTracker && npm run lint
cd GolfTracker && npx tsc --noEmit
cd GolfTracker && npm test -- --ci --passWithNoTests
```

### Step 3: npm audit

```bash
cd GolfTracker && npm audit --json 2>/dev/null || true
```
FAIL if critical, WARN if high/moderate.

---

## Phase 2: Code Audit + Clean Code Enforcement

**Output**: `[2/4] Code Audit...`

### Step 1: Identify All Touched Files

```bash
git diff --name-only origin/main...HEAD
git diff --name-only --cached
git diff --name-only
```
Combine and deduplicate = "touched files" that must be clean.

### Step 2: Clean Code Scan on Touched Files

Look for and FIX:
- Lint errors -> Must fix
- `// @ts-ignore` -> Remove and fix type issue
- `// @ts-expect-error` without explanation -> Add explanation or fix
- `// eslint-disable` without explanation -> Add explanation or fix
- `console.log` in non-test files -> Remove or replace
- Unused imports/variables -> Remove
- `any` types -> Replace with specific types

### Step 3: Deep Audit via Subagent

For significant code changes (not just config files), spawn a code audit subagent (subagent_type: "general-purpose"). Focus on:

- **Screens & Navigation**: Proper navigation params typing, screen focus/blur handling
- **State Management**: Zustand store patterns, selector usage, subscription cleanup
- **Database**: WatermelonDB query efficiency, model correctness, migration safety
- **Security**: API key handling (react-native-config), permission checks, input sanitization
- **Performance**: FlatList optimization, memoization, image/video handling, JS thread blocking
- **Type Safety**: Strict typing, Zod validation at API boundaries

### Fix Loop (max 3 iterations)

```
Iteration 1 - Critical Fixes:
  Fix type errors, lint errors, failing tests
  Re-run: lint, typecheck, test

Iteration 2 - Clean Code Fixes:
  Fix lint warnings in touched files
  Remove unused imports/variables
  Remove unjustified @ts-ignore, eslint-disable
  Re-run: lint

Iteration 3 - Final Polish:
  Fix remaining issues
  Final validation (full CI suite)
  If still failing: FAIL (soft), stop fixing
```

### Final Validation (MANDATORY GATE)

After fix loop, run ALL CI commands. ALL must pass. ANY failure = FAIL. Do NOT proceed to Phase 3.

---

## Phase 3: Build Verification

**Output**: `[3/4] Build Verification...`

Run typecheck as build verification (full native build is too slow for CI):
```bash
cd GolfTracker && npx tsc --noEmit
```

Typecheck failure = FAIL. Do NOT proceed to Phase 4.

---

## Phase 4: Git Workflow

**Output**: `[4/4] Git Workflow...`

### Steps:

1. **Check repo state**: `git status`

2. **Stage and commit**:
   - If PASS/WARN: Conventional commit (`feat:`, `fix:`, `chore:`)
   - If FAIL: Append ` [WIP]` suffix. Always commit locally (preserves work).

3. **Fetch and rebase**:
   ```bash
   git fetch --all --prune
   git rebase origin/main
   ```
   If conflict -> FAIL (soft), skip push/PR, provide resolution commands

4. **Push** (SKIP if FAIL):
   ```bash
   git push -u origin HEAD
   ```

5. **Create/update PR** (SKIP if FAIL):
   Use `gh pr create` or update existing PR.

---

## Blocking Issues (FAIL)

- **CI commands** — any failure blocks the PR
- **Typecheck failure**
- **Clean code violations in touched files**
- **Other**: npm audit critical, merge conflict, push rejected, fix loop exceeded

---

## Non-Blocking Issues (WARN)

- npm audit moderate/high (not critical)
- Lint warnings/errors in UNTOUCHED files
- Missing JSDoc on non-exported functions

---

## Output Format

Show progress inline:
```
[1/4] Discover & Validate...
  Changed files: 12
  Lint: PASS
  Typecheck: PASS
  Tests: PASS (3 suites, 15 tests)

[2/4] Code Audit...
  12 files audited, 2 auto-fixes applied

[3/4] Build Verification...
  Typecheck: PASS

[4/4] Git Workflow...
  Committed: feat: add round history screen
  Pushed to origin/feature/round-history
  PR #42 created: https://github.com/...
```

### Final Report

- Status (PASS/WARN/FAIL)
- Branch name
- PR link (if created)
- Files changed count
- Any warnings or blocking issues

**If FAIL**: Include which phase failed, exact blocking issues, and recovery commands.
