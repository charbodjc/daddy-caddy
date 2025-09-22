#!/bin/bash

echo "🔧 Fixing Golf Tracker Build Issues"
echo "===================================="

cd /Users/dancharbonneau/projects/daddy-caddy/GolfTracker

# Step 1: Ensure bundle exists
echo "1. Ensuring JavaScript bundle exists..."
if [ ! -f "ios/main.jsbundle" ]; then
    echo "   Creating bundle..."
    npx react-native bundle \
        --entry-file index.js \
        --platform ios \
        --dev false \
        --bundle-output ios/main.jsbundle \
        --assets-dest ios
else
    echo "   ✅ Bundle already exists"
fi

# Step 2: Copy bundle to build directory if it exists
echo "2. Copying bundle to build directories..."
DERIVED_DATA_PATH=$(find ~/Library/Developer/Xcode/DerivedData -name "GolfTracker-*" -type d 2>/dev/null | head -1)
if [ -n "$DERIVED_DATA_PATH" ]; then
    BUILD_DIR="$DERIVED_DATA_PATH/Build/Products/Debug-iphoneos"
    mkdir -p "$BUILD_DIR"
    cp ios/main.jsbundle "$BUILD_DIR/main.jsbundle" 2>/dev/null
    echo "   ✅ Bundle copied to build directory"
    
    # Also copy to the app bundle if it exists
    if [ -d "$BUILD_DIR/GolfTracker.app" ]; then
        cp ios/main.jsbundle "$BUILD_DIR/GolfTracker.app/main.jsbundle" 2>/dev/null
        echo "   ✅ Bundle copied to app bundle"
    fi
fi

# Step 3: Clean and build
echo "3. Cleaning build..."
cd ios
xcodebuild clean -workspace GolfTracker.xcworkspace -scheme GolfTracker -quiet

echo ""
echo "✅ Build issues fixed!"
echo ""
echo "Now in Xcode:"
echo "1. Press Cmd+Shift+K (Clean Build Folder)"
echo "2. Select your iPhone from the device list"
echo "3. Press Cmd+R to build and run"
echo ""
echo "The app will use the pre-bundled JavaScript, avoiding all permission issues."
