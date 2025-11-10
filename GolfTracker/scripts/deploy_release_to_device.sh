#!/usr/bin/env bash
set -euo pipefail

# Deploy Release build directly to iPhone charboMAX
# This bundles JavaScript into the app (no Metro needed)

cd "$(dirname "$0")/.."

echo "🚀 Deploying Daddy Caddy (Release) to charboMAX..."
echo ""

# 1. Clear ALL caches
echo "🧹 Clearing all caches..."
watchman watch-del-all 2>/dev/null || true
rm -rf $TMPDIR/metro-* $TMPDIR/react-* 2>/dev/null || true
rm -rf ~/Library/Developer/Xcode/DerivedData/GolfTracker-* 2>/dev/null || true

# 2. Install iOS dependencies
echo "📦 Installing CocoaPods dependencies..."
cd ios
pod install
cd ..

# 3. Check if device is connected
echo "📱 Checking for charboMAX..."
if ! xcrun devicectl list devices | grep -q "charboMAX.*connected"; then
    echo "❌ ERROR: charboMAX not connected!"
    echo "Please:"
    echo "  1. Connect your iPhone via USB"
    echo "  2. Unlock your phone"
    echo "  3. Trust this computer if prompted"
    exit 1
fi

# 4. Build and install using Xcode
echo "🔨 Building and installing Release configuration..."
echo "⚠️  This bundles JavaScript into the app - no Metro needed after install"
echo "⚠️  If build fails with provisioning errors, use Xcode to set up signing first"
echo ""

# Use xcodebuild to build and then install
cd ios

# Try to build - if provisioning fails, provide helpful error
xcodebuild \
    -workspace GolfTracker.xcworkspace \
    -scheme GolfTracker \
    -configuration Release \
    -destination "platform=iOS,name=charboMAX" \
    -derivedDataPath build \
    -allowProvisioningUpdates \
    build 2>&1 | grep -E "BUILD|error|warning|Bundle React Native" || true

BUILD_RESULT=${PIPESTATUS[0]}

if [ $BUILD_RESULT -ne 0 ]; then
    echo ""
    echo "❌ Build failed!"
    echo ""
    echo "This is likely a CODE SIGNING issue for Release builds."
    echo ""
    echo "FIX: Open Xcode and configure signing:"
    echo "  1. open ios/GolfTracker.xcworkspace"
    echo "  2. Select 'GolfTracker' target (left sidebar)"
    echo "  3. Go to 'Signing & Capabilities' tab"
    echo "  4. Make sure:"
    echo "     - Team is selected"
    echo "     - 'Automatically manage signing' is checked"
    echo "     - A valid provisioning profile is shown"
    echo "  5. Try building in Xcode (⌘R) with Release scheme"
    echo "  6. Once that works, run this script again"
    echo ""
    exit 1
fi

# 5. Install to device
cd ..
echo ""
echo "📱 Installing to charboMAX..."

xcrun devicectl device install app \
    --device "charboMAX" \
    "ios/build/Build/Products/Release-iphoneos/GolfTracker.app"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Release build deployed successfully!"
    echo ""
    echo "📋 VERIFY DEPLOYMENT:"
    echo "   1. Open Daddy Caddy app on your phone"
    echo "   2. Go to Settings tab"
    echo "   3. Check version at top: v1.0.0 (build X) • [date]"
    echo "   4. If build number changed → deployment worked! ✅"
    echo "   5. If build number same → something failed ❌"
    echo ""
    echo "💡 REMEMBER: Increment BUILD_NUMBER in src/screens/SettingsScreen.tsx"
    echo "   before each deploy to track changes!"
    echo ""
    echo "🎯 TEST THE NEW PUTTING FLOW:"
    echo "   - Track shots → Select Putt → Enter distance"
    echo "   - You should see Made It / Missed It / Cancel buttons"
    echo ""
else
    echo ""
    echo "❌ Installation failed!"
    echo "Make sure your phone is unlocked"
    exit 1
fi
