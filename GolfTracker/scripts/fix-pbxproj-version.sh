#!/bin/bash
# Fix Xcode 26 objectVersion incompatibility with CocoaPods
# Xcode 26 stamps objectVersion=70 which xcodeproj gem doesn't support yet.
# Downgrade to 60 (Xcode 16.x) so pod install works on EAS build servers.

PBXPROJ="ios/DaddyCaddy.xcodeproj/project.pbxproj"

if [ -f "$PBXPROJ" ] && grep -q 'objectVersion = 70;' "$PBXPROJ"; then
  sed -i '' 's/objectVersion = 70;/objectVersion = 60;/' "$PBXPROJ"
  echo "✓ Fixed pbxproj objectVersion: 70 → 60"
fi
