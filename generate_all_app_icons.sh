#!/bin/bash

echo "🎨 Generating App Icons for Daddy Caddy..."
echo "=========================================="

# Source image - using the new Daddy Caddy logo
SOURCE_IMAGE="/Users/dancharbonneau/projects/daddy-caddy/daddy_caddy_logo.png"

# Check if source image exists
if [ ! -f "$SOURCE_IMAGE" ]; then
    echo "❌ Error: Source image not found at $SOURCE_IMAGE"
    echo ""
    echo "📝 Instructions:"
    echo "1. Save the Daddy Caddy logo image as 'daddy_caddy_logo.png' in the project root"
    echo "2. The image should be at least 1024x1024 pixels for best quality"
    echo "3. Run this script again after saving the image"
    exit 1
fi

echo ""
echo "📱 Generating iOS App Icons..."
echo "------------------------------"

# iOS icons directory
IOS_ICON_DIR="/Users/dancharbonneau/projects/daddy-caddy/GolfTracker/ios/GolfTracker/Images.xcassets/AppIcon.appiconset"
mkdir -p "$IOS_ICON_DIR"

# Generate all required iOS icon sizes
# iPhone Notification icons
sips -z 40 40 "$SOURCE_IMAGE" --out "$IOS_ICON_DIR/Icon-20@2x.png" >/dev/null 2>&1
sips -z 60 60 "$SOURCE_IMAGE" --out "$IOS_ICON_DIR/Icon-20@3x.png" >/dev/null 2>&1

# iPhone Settings icons
sips -z 58 58 "$SOURCE_IMAGE" --out "$IOS_ICON_DIR/Icon-29@2x.png" >/dev/null 2>&1
sips -z 87 87 "$SOURCE_IMAGE" --out "$IOS_ICON_DIR/Icon-29@3x.png" >/dev/null 2>&1

# iPhone Spotlight icons
sips -z 80 80 "$SOURCE_IMAGE" --out "$IOS_ICON_DIR/Icon-40@2x.png" >/dev/null 2>&1
sips -z 120 120 "$SOURCE_IMAGE" --out "$IOS_ICON_DIR/Icon-40@3x.png" >/dev/null 2>&1

# iPhone App icons
sips -z 120 120 "$SOURCE_IMAGE" --out "$IOS_ICON_DIR/Icon-60@2x.png" >/dev/null 2>&1
sips -z 180 180 "$SOURCE_IMAGE" --out "$IOS_ICON_DIR/Icon-60@3x.png" >/dev/null 2>&1

# iPad icons
sips -z 20 20 "$SOURCE_IMAGE" --out "$IOS_ICON_DIR/Icon-20.png" >/dev/null 2>&1
sips -z 29 29 "$SOURCE_IMAGE" --out "$IOS_ICON_DIR/Icon-29.png" >/dev/null 2>&1
sips -z 40 40 "$SOURCE_IMAGE" --out "$IOS_ICON_DIR/Icon-40.png" >/dev/null 2>&1
sips -z 76 76 "$SOURCE_IMAGE" --out "$IOS_ICON_DIR/Icon-76.png" >/dev/null 2>&1
sips -z 152 152 "$SOURCE_IMAGE" --out "$IOS_ICON_DIR/Icon-76@2x.png" >/dev/null 2>&1
sips -z 167 167 "$SOURCE_IMAGE" --out "$IOS_ICON_DIR/Icon-83.5@2x.png" >/dev/null 2>&1

# App Store icon
sips -z 1024 1024 "$SOURCE_IMAGE" --out "$IOS_ICON_DIR/Icon-1024.png" >/dev/null 2>&1

echo "✅ iOS icons generated successfully!"

echo ""
echo "🤖 Generating Android App Icons..."
echo "-----------------------------------"

# Android icons base directory
ANDROID_RES_DIR="/Users/dancharbonneau/projects/daddy-caddy/GolfTracker/android/app/src/main/res"

# Generate Android icons for different densities
# mdpi (48x48)
sips -z 48 48 "$SOURCE_IMAGE" --out "$ANDROID_RES_DIR/mipmap-mdpi/ic_launcher.png" >/dev/null 2>&1
sips -z 48 48 "$SOURCE_IMAGE" --out "$ANDROID_RES_DIR/mipmap-mdpi/ic_launcher_round.png" >/dev/null 2>&1

# hdpi (72x72)
sips -z 72 72 "$SOURCE_IMAGE" --out "$ANDROID_RES_DIR/mipmap-hdpi/ic_launcher.png" >/dev/null 2>&1
sips -z 72 72 "$SOURCE_IMAGE" --out "$ANDROID_RES_DIR/mipmap-hdpi/ic_launcher_round.png" >/dev/null 2>&1

# xhdpi (96x96)
sips -z 96 96 "$SOURCE_IMAGE" --out "$ANDROID_RES_DIR/mipmap-xhdpi/ic_launcher.png" >/dev/null 2>&1
sips -z 96 96 "$SOURCE_IMAGE" --out "$ANDROID_RES_DIR/mipmap-xhdpi/ic_launcher_round.png" >/dev/null 2>&1

# xxhdpi (144x144)
sips -z 144 144 "$SOURCE_IMAGE" --out "$ANDROID_RES_DIR/mipmap-xxhdpi/ic_launcher.png" >/dev/null 2>&1
sips -z 144 144 "$SOURCE_IMAGE" --out "$ANDROID_RES_DIR/mipmap-xxhdpi/ic_launcher_round.png" >/dev/null 2>&1

# xxxhdpi (192x192)
sips -z 192 192 "$SOURCE_IMAGE" --out "$ANDROID_RES_DIR/mipmap-xxxhdpi/ic_launcher.png" >/dev/null 2>&1
sips -z 192 192 "$SOURCE_IMAGE" --out "$ANDROID_RES_DIR/mipmap-xxxhdpi/ic_launcher_round.png" >/dev/null 2>&1

echo "✅ Android icons generated successfully!"

echo ""
echo "🎉 All Done!"
echo "============"
echo "✅ iOS app icons have been generated"
echo "✅ Android app icons have been generated"
echo ""
echo "📱 Next steps:"
echo "1. For iOS: Rebuild the app in Xcode or run 'npx react-native run-ios'"
echo "2. For Android: Rebuild the app or run 'npx react-native run-android'"
echo "3. The new Daddy Caddy icon will appear on your device!"
echo ""
echo "⚠️  Note: You may need to clean the build cache:"
echo "   iOS: Product > Clean Build Folder in Xcode"
echo "   Android: cd android && ./gradlew clean"
