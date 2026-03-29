#!/bin/bash
# Post-prebuild fixups for Xcode/CocoaPods compatibility
# Run after expo prebuild to patch known issues.

set -e

PBXPROJ="ios/DaddyCaddy.xcodeproj/project.pbxproj"

# 1. Fix Xcode 26 objectVersion incompatibility with CocoaPods.
#    Xcode 26 stamps objectVersion=70 which xcodeproj gem doesn't support yet.
#    Downgrade to 60 (Xcode 16.x) so pod install works on EAS build servers.
#    No-op when building with Xcode 16.x (already generates 54).
if [ -f "$PBXPROJ" ] && grep -q 'objectVersion = 70;' "$PBXPROJ"; then
  sed -i.bak 's/objectVersion = 70;/objectVersion = 60;/' "$PBXPROJ" && rm -f "$PBXPROJ.bak"
  echo "✓ Fixed pbxproj objectVersion: 70 → 60"
fi

# 2. Restore @bacons/apple-targets symlinks.
#    prebuild --clean wipes ios/, destroying the symlinks that Xcode's
#    PBXFileSystemSynchronizedRootGroup entries need to resolve.
for target_dir in targets/*/; do
  target_name=$(basename "$target_dir")
  link_path="ios/$target_name"
  if [ ! -e "$link_path" ]; then
    ln -sf "../targets/$target_name" "$link_path"
    echo "✓ Restored symlink: $link_path → ../targets/$target_name"
  fi
done
