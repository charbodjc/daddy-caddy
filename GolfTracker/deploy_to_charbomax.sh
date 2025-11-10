#!/bin/bash

# Legacy script - USE scripts/deploy_release_to_device.sh instead!
# This script is kept for backwards compatibility

echo "⚠️  DEPRECATED: Use ./scripts/deploy_release_to_device.sh instead"
echo ""
read -p "Continue with legacy script? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Redirecting to new script..."
    exec ./scripts/deploy_release_to_device.sh
fi

echo "🚀 Building and deploying GolfTracker to charboMAX..."

# Navigate to project directory
cd /Users/dancharbonneau/projects/daddy-caddy/GolfTracker

# Clear caches
echo "🧹 Clearing caches..."
watchman watch-del-all 2>/dev/null || true
rm -rf $TMPDIR/metro-* $TMPDIR/react-* 2>/dev/null || true
rm -rf ~/Library/Developer/Xcode/DerivedData/GolfTracker-* 2>/dev/null || true

# Install npm dependencies if needed
echo "📦 Checking npm dependencies..."
npm install --legacy-peer-deps

# Clean build folder
echo "🧹 Cleaning build folder..."
cd ios
rm -rf build/

# Try to install pods (will skip if pod is not available)
if command -v pod &> /dev/null; then
    echo "🔧 Installing CocoaPods dependencies..."
    pod install
else
    echo "⚠️ CocoaPods not found, skipping pod install"
fi

# Build the app for device using React Native CLI (Release configuration)
echo "🔨 Building app for device..."
cd ..
npx react-native run-ios --configuration Release --device "charboMAX"

# Check if build was successful
if [ $? -eq 0 ]; then
  echo ""
  echo "✅ App deployed successfully to charboMAX!"
  echo ""
  echo "📋 IMPORTANT: Check version in Settings!"
  echo "   If version didn't change, code didn't deploy!"
else
  echo "❌ Deployment failed"
  echo "Try: ./scripts/deploy_release_to_device.sh"
  exit 1
fi
