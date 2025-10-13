#!/usr/bin/env bash
set -euo pipefail

# Create production archive for TestFlight/App Store distribution
# Archives the app with Release configuration and bundled JavaScript

cd "$(dirname "$0")/.."

echo "📦 Creating Production Archive for Daddy Caddy..."
echo ""

# 1. Clear ALL caches
echo "🧹 Clearing all caches..."
watchman watch-del-all 2>/dev/null || true
rm -rf $TMPDIR/metro-* $TMPDIR/react-* 2>/dev/null || true
rm -rf ~/Library/Developer/Xcode/DerivedData/GolfTracker-* 2>/dev/null || true

# 2. Install dependencies
echo "📦 Installing dependencies..."
npm install --legacy-peer-deps

echo "📦 Installing CocoaPods dependencies..."
cd ios
pod install
cd ..

# 3. Test Release build locally first (optional but recommended)
echo ""
echo "⚠️  RECOMMENDED: Test Release build on device first"
echo "   Run: ./scripts/deploy_release_to_device.sh"
echo ""
read -p "Continue with archive? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Archive cancelled"
    exit 0
fi

# 4. Clean build folder
echo "🧹 Cleaning Xcode build folder..."
cd ios
xcodebuild \
    -workspace GolfTracker.xcworkspace \
    -scheme GolfTracker \
    -configuration Release \
    clean

# 5. Archive
echo ""
echo "📦 Creating archive..."
echo "⏳ This may take several minutes..."
echo ""

xcodebuild \
    -workspace GolfTracker.xcworkspace \
    -scheme GolfTracker \
    -configuration Release \
    -destination 'generic/platform=iOS' \
    -archivePath ./build/GolfTracker.xcarchive \
    CODE_SIGN_IDENTITY="Apple Development" \
    DEVELOPMENT_TEAM="CXHZ8Z4F6P" \
    -allowProvisioningUpdates \
    archive

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Archive created successfully!"
    echo ""
    echo "📁 Location: ios/build/GolfTracker.xcarchive"
    echo ""
    echo "📤 Next steps:"
    echo "   1. Open Xcode"
    echo "   2. Window → Organizer"
    echo "   3. Select the GolfTracker archive"
    echo "   4. Click 'Distribute App'"
    echo "   5. Choose distribution method:"
    echo "      - App Store Connect (for TestFlight/App Store)"
    echo "      - Ad Hoc (for specific devices)"
    echo "      - Development (for testing)"
    echo ""
    echo "⚠️  BEFORE DISTRIBUTING:"
    echo "   - Verify build number was incremented in Xcode"
    echo "   - Check release notes are ready"
    echo ""
else
    echo ""
    echo "❌ Archive failed!"
    echo ""
    echo "Common issues:"
    echo "  - Code signing: Check Xcode → Signing & Capabilities"
    echo "  - Provisioning profile expired or missing"
    echo "  - Bundle script error: Check Build Phases"
    echo ""
    echo "Try building in Xcode to see detailed errors"
    exit 1
fi


