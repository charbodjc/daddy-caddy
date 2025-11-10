#!/bin/bash

echo "🏌️ Daddy Caddy - Auto Deploy to charboMAX"
echo "=========================================="
echo ""

# Set UTF-8 encoding for CocoaPods
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8

cd /Users/daniel/projects/daddy-caddy/GolfTracker

# Device info
DEVICE_ID="00008140-001C25100253001C"
DEVICE_NAME="charboMAX"

echo "📱 Target device: $DEVICE_NAME"
echo ""

# Clean build artifacts
echo "1. Cleaning previous builds..."
rm -rf ~/Library/Developer/Xcode/DerivedData/GolfTracker-* 2>/dev/null
cd ios
rm -rf build 2>/dev/null
cd ..

# Ensure JavaScript bundle exists
echo ""
echo "2. Building JavaScript bundle..."
if [ ! -f "ios/main.jsbundle" ] || [ "$1" == "--fresh" ]; then
    npx react-native bundle \
        --entry-file index.js \
        --platform ios \
        --dev false \
        --bundle-output ios/main.jsbundle \
        --assets-dest ios \
        --reset-cache
    
    # Copy to GolfTracker directory
    cp ios/main.jsbundle ios/GolfTracker/main.jsbundle 2>/dev/null
    echo "   ✅ Bundle created"
else
    echo "   ✅ Bundle already exists (use --fresh to rebuild)"
fi

# Build the app
echo ""
echo "3. Building app for iPhone..."
echo "   Note: This will use automatic signing with your Apple ID"
echo ""
cd ios

# Try to build with automatic signing
xcodebuild \
    -workspace GolfTracker.xcworkspace \
    -scheme GolfTracker \
    -configuration Debug \
    -destination "id=$DEVICE_ID" \
    -derivedDataPath build \
    -allowProvisioningUpdates \
    -allowProvisioningDeviceRegistration \
    CODE_SIGN_IDENTITY="Apple Development" \
    build 2>&1 | tail -30

# Check build result
if [ $? -eq 0 ]; then
    echo ""
    echo "4. Installing on iPhone..."
    
    # Find the app
    APP_PATH="build/Build/Products/Debug-iphoneos/GolfTracker.app"
    if [ ! -d "$APP_PATH" ]; then
        APP_PATH="build/Build/Products/Release-iphoneos/GolfTracker.app"
    fi
    
    if [ -d "$APP_PATH" ]; then
        echo "   Found app at: $APP_PATH"
        
        # Install using devicectl
        xcrun devicectl device install app \
            --device "$DEVICE_ID" \
            "$APP_PATH" 2>&1
        
        if [ $? -eq 0 ]; then
            echo ""
            echo "✅ SUCCESS! Daddy Caddy is now on your iPhone!"
            echo ""
            echo "📱 Look for 'Golf Tracker' on your home screen"
            echo ""
            echo "⚠️  If you see 'Untrusted Developer':"
            echo "   Settings → General → VPN & Device Management → Trust"
            
            # Try to launch the app
            echo ""
            echo "5. Attempting to launch app..."
            xcrun devicectl device process launch \
                --device "$DEVICE_ID" \
                --terminate-existing \
                com.golftracker 2>/dev/null || echo "   Please tap the app icon on your phone to launch"
        else
            echo "❌ Installation failed via devicectl"
            
            # Try alternative install method
            echo "   Trying alternative installation method..."
            if command -v ios-deploy &> /dev/null; then
                ios-deploy --id "$DEVICE_ID" --bundle "$APP_PATH" --justlaunch
            else
                echo "   Installing ios-deploy for better deployment..."
                brew install ios-deploy 2>/dev/null
                ios-deploy --id "$DEVICE_ID" --bundle "$APP_PATH" --justlaunch
            fi
        fi
    else
        echo "❌ Could not find built app"
        ls -la build/Build/Products/*/
        exit 1
    fi
else
    echo ""
    echo "❌ Build failed - Apple Developer account setup required"
    echo ""
    echo "📝 Since this is your first time deploying from this Mac:"
    echo ""
    echo "1. Open Xcode (it should already be open)"
    echo "2. Click on 'GolfTracker' in the project navigator"
    echo "3. Select the 'GolfTracker' target"
    echo "4. Go to 'Signing & Capabilities' tab"
    echo "5. Check '✅ Automatically manage signing'"
    echo "6. Click 'Team' dropdown and sign in with your Apple ID"
    echo "7. Select 'charboMAX' from the device dropdown (top bar)"
    echo "8. Press Cmd+R to build and run"
    echo ""
    echo "After this one-time setup, the script will work automatically!"
    echo ""
    echo "Opening Xcode now..."
    open /Users/daniel/projects/daddy-caddy/GolfTracker/ios/GolfTracker.xcworkspace
    exit 1
fi