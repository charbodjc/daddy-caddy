#!/bin/bash

echo "🏌️ Daddy Caddy - Simple Deploy Script"
echo "====================================="
echo ""

# Kill any existing processes
echo "1. Cleaning up existing processes..."
pkill -f "Metro" 2>/dev/null
pkill -f "Xcode" 2>/dev/null
pkill -f "react-native" 2>/dev/null

cd /Users/dancharbonneau/projects/daddy-caddy/GolfTracker

# Clean everything
echo ""
echo "2. Cleaning all caches..."
rm -rf ~/Library/Developer/Xcode/DerivedData/GolfTracker-* 2>/dev/null
rm -rf ios/build 2>/dev/null
rm -rf node_modules/.cache 2>/dev/null
watchman watch-del-all 2>/dev/null

# Create production bundle
echo ""
echo "3. Creating production JavaScript bundle..."
npx react-native bundle \
    --entry-file index.js \
    --platform ios \
    --dev false \
    --bundle-output ios/main.jsbundle \
    --assets-dest ios \
    --reset-cache

# Copy bundle to app directory
cp ios/main.jsbundle ios/GolfTracker/main.jsbundle 2>/dev/null

# Build using xcodebuild directly (no Xcode GUI needed)
echo ""
echo "4. Building app for your iPhone..."
cd ios

# Get device ID
DEVICE_ID=$(xcrun xctrace list devices 2>&1 | grep "charboMAX" | grep -oE '[A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12}' | head -1)

if [ -z "$DEVICE_ID" ]; then
    echo "❌ iPhone 'charboMAX' not found. Please connect your iPhone."
    exit 1
fi

echo "   Found iPhone: charboMAX ($DEVICE_ID)"

# Build and install
echo ""
echo "5. Installing on your iPhone..."
xcodebuild \
    -workspace GolfTracker.xcworkspace \
    -scheme GolfTracker \
    -configuration Release \
    -destination "id=$DEVICE_ID" \
    -derivedDataPath build \
    clean build

# Install the app
echo ""
echo "6. Launching app..."
xcrun devicectl device install app \
    --device "$DEVICE_ID" \
    build/Build/Products/Release-iphoneos/GolfTracker.app 2>/dev/null || \
    ios-deploy \
    --id "$DEVICE_ID" \
    --bundle build/Build/Products/Release-iphoneos/GolfTracker.app 2>/dev/null || \
    echo "App installed. Please tap 'Daddy Caddy' on your iPhone to launch."

echo ""
echo "✅ Done! The app should be on your iPhone."
echo "   If you see 'Untrusted Developer', go to:"
echo "   Settings → General → VPN & Device Management → Developer App → Trust"
