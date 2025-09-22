#!/bin/bash

echo "🏌️ Golf Tracker - Fresh Build for Device"
echo "========================================"

# Set working directory
cd /Users/dancharbonneau/projects/daddy-caddy/GolfTracker

# Step 1: Clean everything
echo ""
echo "Step 1: Deep cleaning all caches..."
echo "-----------------------------------"
rm -rf ~/Library/Developer/Xcode/DerivedData/GolfTracker-*
rm -rf ios/build
rm -rf ios/Pods
rm -rf node_modules/.cache
cd ios && pod cache clean --all 2>/dev/null
cd ..

# Step 2: Reinstall dependencies
echo ""
echo "Step 2: Reinstalling dependencies..."
echo "------------------------------------"
npm install

# Step 3: Reinstall pods
echo ""
echo "Step 3: Installing iOS dependencies..."
echo "--------------------------------------"
cd ios
pod install

# Step 4: Pre-bundle the JavaScript
echo ""
echo "Step 4: Pre-bundling JavaScript..."
echo "----------------------------------"
cd ..
npx react-native bundle \
  --entry-file index.js \
  --platform ios \
  --dev false \
  --bundle-output ios/main.jsbundle \
  --assets-dest ios

echo ""
echo "✅ Build preparation complete!"
echo ""
echo "Now, please follow these steps in Xcode:"
echo "========================================="
echo ""
echo "1. Open Xcode (should already be open)"
echo ""
echo "2. In the top bar:"
echo "   - Make sure 'GolfTracker' scheme is selected"
echo "   - Select YOUR iPhone from the device list"
echo ""
echo "3. Go to Product menu → Clean Build Folder (Shift+Cmd+K)"
echo ""
echo "4. Go to GolfTracker project settings (click on GolfTracker in left panel):"
echo "   - Select 'Signing & Capabilities' tab"
echo "   - Make sure 'Automatically manage signing' is checked"
echo "   - Select your Apple ID team"
echo ""
echo "5. Press Cmd+R to build and run"
echo ""
echo "If it still fails, try:"
echo "- Product menu → Destination → Destination Architectures → Show Both"
echo "- Then build again with Cmd+R"

# Open Xcode
open /Users/dancharbonneau/projects/daddy-caddy/GolfTracker/ios/GolfTracker.xcworkspace
