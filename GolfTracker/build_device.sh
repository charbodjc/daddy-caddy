#!/bin/bash

echo "🏌️ Building Daddy Caddy for iPhone..."

# Clean build folder
echo "🧹 Cleaning build folder..."
rm -rf ~/Library/Developer/Xcode/DerivedData/GolfTracker-*

# Build for device
echo "📱 Building for device..."
cd /Users/dancharbonneau/projects/daddy-caddy/GolfTracker/ios

xcodebuild -workspace GolfTracker.xcworkspace \
  -scheme GolfTracker \
  -configuration Debug \
  -destination generic/platform=iOS \
  -allowProvisioningUpdates \
  clean build

echo "✅ Build complete! Now run the app from Xcode."
