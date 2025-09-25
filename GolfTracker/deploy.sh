#!/bin/bash

echo "🚀 Building and deploying GolfTracker to device..."

# Navigate to project directory
cd /Users/dancharbonneau/projects/daddy-caddy/GolfTracker

# Clean build folder
echo "🧹 Cleaning build folder..."
cd ios
rm -rf build/

# Build the app for device
echo "🔨 Building app for device..."
xcodebuild -workspace GolfTracker.xcworkspace \
  -scheme GolfTracker \
  -configuration Release \
  -destination generic/platform=iOS \
  -derivedDataPath build \
  CODE_SIGN_IDENTITY="Apple Development" \
  DEVELOPMENT_TEAM="CXHZ8Z4F6P" \
  -allowProvisioningUpdates \
  clean archive

# Check if build was successful
if [ $? -eq 0 ]; then
  echo "✅ Build successful!"
  
  # Deploy to device
  echo "📱 Deploying to device..."
  xcrun devicectl device install app --device "00008140-001C25100253001C" "build/Build/Products/Release-iphoneos/GolfTracker.app"
  
  if [ $? -eq 0 ]; then
    echo "✅ App deployed successfully!"
  else
    echo "❌ Deployment failed"
    exit 1
  fi
else
  echo "❌ Build failed"
  exit 1
fi
