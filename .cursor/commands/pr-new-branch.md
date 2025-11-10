git switch main
git pull --ff-only
git switch -c golf-buddah
git fetch origin
git rebase origin/main
git push -u origin golf-buddah
git tag eas-build