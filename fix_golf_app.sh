#!/bin/bash

echo "🔧 Fixing Golf Tracker Build..."
echo "================================"

# Navigate to project
cd /Users/dancharbonneau/projects/daddy-caddy/GolfTracker

# Step 1: Stop all processes
echo "📍 Step 1: Stopping all processes..."
pkill -f xcodebuild 2>/dev/null
pkill -f "react-native" 2>/dev/null

# Step 2: Remove problematic dependencies
echo "📍 Step 2: Removing problematic dependencies..."
npm uninstall react-native-reanimated react-native-worklets-core

# Step 3: Clean everything
echo "📍 Step 3: Cleaning build artifacts..."
cd ios
rm -rf Pods Podfile.lock
rm -rf ~/Library/Developer/Xcode/DerivedData/GolfTracker-*
cd ..

# Step 4: Reinstall dependencies
echo "📍 Step 4: Reinstalling dependencies..."
npm install

# Step 5: Install iOS dependencies
echo "📍 Step 5: Installing iOS dependencies..."
cd ios
export LANG=en_US.UTF-8
pod install
cd ..

echo ""
echo "✅ Build fix complete!"
echo ""
echo "Now run: npx react-native run-ios --simulator=\"iPhone 17 Pro Max\""
echo ""
echo "Or open Xcode and build from there:"
echo "  1. Open /Users/dancharbonneau/projects/daddy-caddy/GolfTracker/ios/GolfTracker.xcworkspace"
echo "  2. Select iPhone 17 Pro Max simulator"
echo "  3. Press Cmd+R to build and run"
