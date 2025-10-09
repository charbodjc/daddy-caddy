#!/bin/bash

echo "🚀 Building and deploying GolfTracker to charbomax..."

# Navigate to project directory
cd /Users/dancharbonneau/projects/daddy-caddy/GolfTracker

# Install npm dependencies if needed
echo "📦 Checking npm dependencies..."
npm install --legacy-peer-deps

# Clean build folder
echo "🧹 Cleaning build folder..."
cd ios
rm -rf build/
rm -rf ~/Library/Developer/Xcode/DerivedData/GolfTracker-*

# Try to install pods (will skip if pod is not available)
if command -v pod &> /dev/null; then
    echo "🔧 Installing CocoaPods dependencies..."
    pod install
else
    echo "⚠️ CocoaPods not found, skipping pod install"
fi

# Build the app for device
echo "🔨 Building app for device..."
xcodebuild -workspace GolfTracker.xcworkspace \
  -scheme GolfTracker \
  -configuration Release \
  -destination "platform=iOS,name=charboMAX" \
  -derivedDataPath build \
  CODE_SIGN_IDENTITY="Apple Development" \
  DEVELOPMENT_TEAM="CXHZ8Z4F6P" \
  -allowProvisioningUpdates \
  clean build

# Check if build was successful
if [ $? -eq 0 ]; then
  echo "✅ Build successful!"
  
  # Install on device
  echo "📱 Installing on charbomax..."
  xcrun devicectl device install app --device "charboMAX" "build/Build/Products/Release-iphoneos/GolfTracker.app"
  
  if [ $? -eq 0 ]; then
    echo "✅ App deployed successfully to charbomax!"
  else
    echo "❌ Deployment failed"
    exit 1
  fi
else
  echo "❌ Build failed"
  exit 1
fi

