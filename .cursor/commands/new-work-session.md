1.	Clean tree
  - git status must be clean. If not: git add -A && git commit -m "chore: wip" or git stash -u.
2.	Sync remotes
  - git fetch --all --prune
3.	Update main
4.	Remove last session branch only if safe
5.	Create today’s branch
6.	Work loop
  - Commit small, Conventional Commits.
  - Before PR: git fetch && git rebase origin/main
  - CI locally: npm run lint && npm test && npm run build