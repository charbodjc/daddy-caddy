#!/bin/bash

echo "🏌️ Deploying Golf Tracker to iPhone..."

# Change to iOS directory
cd /Users/dancharbonneau/projects/daddy-caddy/GolfTracker/ios

# Clean previous builds
echo "🧹 Cleaning build artifacts..."
rm -rf ~/Library/Developer/Xcode/DerivedData/GolfTracker-*

# Get the device ID
echo "📱 Finding connected iPhone..."
DEVICE_ID=$(xcrun xctrace list devices 2>&1 | grep -v "Simulator" | grep "iPhone" | head -1 | grep -oE '[A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12}')

if [ -z "$DEVICE_ID" ]; then
    echo "❌ No iPhone found. Please connect your iPhone and make sure it's trusted."
    echo "   You may need to:"
    echo "   1. Unlock your iPhone"
    echo "   2. Trust this computer when prompted"
    echo "   3. Enable Developer Mode in Settings > Privacy & Security"
    exit 1
fi

echo "✅ Found iPhone with ID: $DEVICE_ID"

# Build and install using xcodebuild
echo "🔨 Building and installing app..."
xcodebuild -workspace GolfTracker.xcworkspace \
    -scheme GolfTracker \
    -configuration Debug \
    -destination "id=$DEVICE_ID" \
    -allowProvisioningUpdates \
    -allowProvisioningDeviceRegistration \
    clean build

if [ $? -eq 0 ]; then
    echo "✅ App successfully deployed to your iPhone!"
    echo "📱 Check your iPhone for the Golf Tracker app"
else
    echo "❌ Build failed. Opening Xcode for manual deployment..."
    echo ""
    echo "📝 Manual deployment steps:"
    echo "1. In Xcode, select your iPhone from the device list (top bar)"
    echo "2. Click the Play button (or press Cmd+R)"
    echo "3. If prompted, enable Developer Mode on your iPhone:"
    echo "   - Go to Settings > Privacy & Security > Developer Mode"
    echo "   - Toggle it ON and restart your phone"
    echo ""
    open GolfTracker.xcworkspace
fi
