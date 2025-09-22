#!/bin/bash

echo "🏌️ Deploying Golf Tracker to iPhone..."

# Change to iOS directory
cd /Users/dancharbonneau/projects/daddy-caddy/GolfTracker/ios

# Clean previous builds
echo "🧹 Cleaning build artifacts..."
rm -rf ~/Library/Developer/Xcode/DerivedData/GolfTracker-*

# Get the device ID (handle custom device names; exclude simulators, watches, and Macs)
echo "📱 Finding connected iOS device..."
DEVICE_LINE=$(xcrun xctrace list devices 2>&1 \
  | grep -v "Simulator" \
  | grep -v "Watch" \
  | grep -v "MacBook" \
  | grep -v "Mac mini" \
  | grep -v "Mac Pro" \
  | grep -v "Mac Studio" \
  | grep -E "\\([0-9]+(\\.[0-9]+)+\\)" \
  | head -1)

# Extract the UDID inside the last parentheses on the line
DEVICE_ID=$(echo "$DEVICE_LINE" | sed -E 's/.*\(([^()]+)\)$/\1/')

if [ -z "$DEVICE_ID" ]; then
    echo "❌ No iPhone found. Please connect your iPhone and make sure it's trusted."
    echo "   You may need to:"
    echo "   1. Unlock your iPhone"
    echo "   2. Trust this computer when prompted"
    echo "   3. Enable Developer Mode in Settings > Privacy & Security"
    exit 1
fi

echo "✅ Found iPhone with ID: $DEVICE_ID"

# Build the app
echo "🔨 Building app..."
if ! xcodebuild -workspace GolfTracker.xcworkspace \
    -scheme GolfTracker \
    -configuration Debug \
    -destination "id=$DEVICE_ID" \
    -allowProvisioningUpdates \
    -allowProvisioningDeviceRegistration \
    clean build | cat; then
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
    exit 1
fi

# Locate the built .app
APP_PATH=$(ls -d ~/Library/Developer/Xcode/DerivedData/GolfTracker-*/Build/Products/Debug-iphoneos/GolfTracker.app 2>/dev/null | head -1)

if [ -z "$APP_PATH" ]; then
  echo "❌ Could not locate built .app. Check the build logs."
  exit 1
fi

# Install the app to device
echo "📲 Installing app to device $DEVICE_ID..."
if xcrun devicectl device install app --device "$DEVICE_ID" "$APP_PATH" | cat; then
  echo "✅ App successfully deployed to your iPhone!"
  echo "📱 Check your iPhone for the Golf Tracker app"
else
  echo "❌ Installation failed via devicectl. Opening Xcode for manual deployment..."
  open GolfTracker.xcworkspace
  exit 1
fi
