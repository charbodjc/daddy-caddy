#!/bin/bash

echo "🏌️ Daddy Caddy - Deployment Script"
echo "====================================="
echo ""

# Kill any existing processes
echo "1. Cleaning up existing processes..."
pkill -f "Metro" 2>/dev/null
pkill -f "react-native" 2>/dev/null

cd /Users/daniel/projects/daddy-caddy/GolfTracker

# Clean everything
echo ""
echo "2. Cleaning all caches..."
rm -rf ~/Library/Developer/Xcode/DerivedData/GolfTracker-* 2>/dev/null
rm -rf ios/build 2>/dev/null
rm -rf node_modules/.cache 2>/dev/null
watchman watch-del-all 2>/dev/null || true

# Install dependencies if needed
echo ""
echo "3. Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo "   Installing dependencies..."
    npm install
fi

# Create production bundle
echo ""
echo "4. Creating production JavaScript bundle..."
npx react-native bundle \
    --entry-file index.js \
    --platform ios \
    --dev false \
    --bundle-output ios/main.jsbundle \
    --assets-dest ios \
    --reset-cache

# Copy bundle to app directory
cp ios/main.jsbundle ios/GolfTracker/main.jsbundle 2>/dev/null

# Build using xcodebuild directly
echo ""
echo "5. Building app for your iPhone..."
cd ios

# Device info
DEVICE_ID="00008140-001C25100253001C"
DEVICE_NAME="charboMAX"

echo "   Target device: $DEVICE_NAME ($DEVICE_ID)"

# Build the app
echo "   Building for release..."
xcodebuild \
    -workspace GolfTracker.xcworkspace \
    -scheme GolfTracker \
    -configuration Release \
    -destination "id=$DEVICE_ID" \
    -derivedDataPath build \
    -allowProvisioningUpdates \
    -allowProvisioningDeviceRegistration \
    clean build | cat

# Check if build was successful
if [ $? -eq 0 ]; then
    echo ""
    echo "6. Installing app on your iPhone..."
    
    # Try to install the app
    APP_PATH="build/Build/Products/Release-iphoneos/GolfTracker.app"
    if [ ! -d "$APP_PATH" ]; then
        # Try Debug path if Release doesn't exist
        APP_PATH="build/Build/Products/Debug-iphoneos/GolfTracker.app"
    fi
    
    if [ -d "$APP_PATH" ]; then
        xcrun devicectl device install app \
            --device "$DEVICE_ID" \
            "$APP_PATH" 2>&1 | cat
        
        if [ $? -eq 0 ]; then
            echo ""
            echo "✅ Success! Daddy Caddy has been deployed to your iPhone!"
            echo ""
            echo "📱 Look for 'Golf Tracker' on your iPhone home screen"
            echo ""
            echo "⚠️  If you see 'Untrusted Developer' when opening the app:"
            echo "   1. Go to Settings → General → VPN & Device Management"
            echo "   2. Find your Developer App section"
            echo "   3. Tap Trust"
        else
            echo ""
            echo "❌ Installation failed. Trying alternative method..."
            
            # Try ios-deploy if available
            if command -v ios-deploy &> /dev/null; then
                ios-deploy --id "$DEVICE_ID" --bundle "$APP_PATH" --justlaunch
            else
                echo "   Please open Xcode and deploy manually:"
                echo "   1. Open Xcode"
                echo "   2. Select your iPhone from the device list"
                echo "   3. Press Cmd+R to run"
                open GolfTracker.xcworkspace
            fi
        fi
    else
        echo "❌ Could not find built app. Please check the build logs above."
        exit 1
    fi
else
    echo ""
    echo "❌ Build failed. Opening Xcode for manual deployment..."
    echo ""
    echo "📝 Manual deployment steps:"
    echo "1. In Xcode, select 'charboMAX' from the device list (top bar)"
    echo "2. Click the Play button (or press Cmd+R)"
    echo "3. If prompted about signing, select your Apple Developer account"
    echo ""
    cd /Users/daniel/projects/daddy-caddy/GolfTracker/ios
    open GolfTracker.xcworkspace
    exit 1
fi
