Do the following:

1. Inspect and categorize the changes in the working tree.

2. Run git status -sb and skim the diffs (git diff, git diff --staged). Spot anything unintentional or obsolete.

3. Decide the fate of each file, ask me if the decision is not obvious.
   - Keep it → stage it: git add <file>
   - Discard it → git checkout -- <file> (for tracked files) or git clean -f (for unwanted new files)
   - Set it aside → git stash push [-u] (stashes tracked and optionally new files)

4. Commit logical units.
   - Group related changes, write a clear message (git commit -m "feat: …"), and repeat until git status is clean.
   - Never leave “mystery” files hanging.

5. Document intentional additions (e.g., new setup scripts) so teammates know why they’re there.

6. Ensure a clean state before rebasing, pulling, or ending the day.

7. `git status`
   - If anything is unstaged, stash or commit before continuing.

8. Refresh local knowledge of remotes.
   - `git fetch --all --prune`
   - `git status` (ensure you’re still on your feature/fix branch)

9. Rebase on the latest `origin/main` to avoid reintroducing conflicts later.
   - `git rebase origin/main`
   - If conflicts appear, resolve them now, then `git rebase --continue`.

10. Re-run linting/tests/builds **before** packaging a PR.
   - Web:  
     `npm run lint`  
     `npm test` (if applicable)  
     `npm run build`
   - Mobile (run from `mobile/`):  
     `npm run lint` (optional but recommended)  
     `npm run test` (if applicable)  
     `npm run build`
   - Fix any failures, commit fixes, and keep the branch rebased.

11. Review `git status` and the diff for sanity.
   - `git status` (should show only intentional changes)
   - `git diff main...HEAD` or `git diff --staged` for a final glance

12. Commit.
   - Use a clean conventional message (e.g., `feat: …`, `fix: …`)
   - Double-check `git status` afterward (should show “nothing to commit”).

13. Push the branch.
   - `git push --set-upstream origin <branch>` (first time)  
     or `git push`

14. Check whether a PR already exists for this branch.
   - `gh pr list --head <branch>`
   - If a PR exists, update it
   - `gh pr view --web` (confirm it’s updated after the push)

15. Create the PR if a PR does not already exist, ensuring build steps are documented.
   - New PR:  
     `gh pr create --title "<Title>" --body "<Summary + Testing>"`  
     (Don’t tag it unless required; note build/test commands in the description.) 

16. Validate PR status.
    - `gh pr checks view` to confirm CI/builds pass.
    - `gh pr status` to ensure there are no conflicts or failing checks.
    - If conflicts are reported, resolve them (rebase, fix, force-push).

17. Announce readiness.
    - Share PR number/title with reviewers (and note builds/tests run).

18. Clean up the local branch (after confirming PR is safely pushed).
    - `git checkout main`
    - `git pull --ff-only origin main` (optional, keeps main current)
    - (Remote cleanup happens when the PR is merged.)

19. Hygiene:
    - `gh pr status` to ensure no untracked draft PRs remain.
    - Close or delete any abandoned local branches (`git branch --list` → `git branch -d …`).
