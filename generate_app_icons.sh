#!/bin/bash

echo "🎨 Generating iOS App Icons from Daddy Caddy logo..."
echo "================================"

# Create icons directory if it doesn't exist
ICON_DIR="/Users/dancharbonneau/projects/daddy-caddy/GolfTracker/ios/GolfTracker/Images.xcassets/AppIcon.appiconset"
mkdir -p "$ICON_DIR"

# Source image - using the new Daddy Caddy logo
SOURCE_IMAGE="/Users/dancharbonneau/projects/daddy-caddy/daddy_caddy_logo.png"

# Check if source image exists
if [ ! -f "$SOURCE_IMAGE" ]; then
    echo "❌ Error: Source image not found at $SOURCE_IMAGE"
    echo "Please save the Daddy Caddy logo as daddy_caddy_logo.png in the project root"
    exit 1
fi

# Generate all required iOS icon sizes
echo "📱 Generating iOS icon sizes..."

# iPhone Notification icons
sips -z 40 40 "$SOURCE_IMAGE" --out "$ICON_DIR/Icon-20@2x.png"
sips -z 60 60 "$SOURCE_IMAGE" --out "$ICON_DIR/Icon-20@3x.png"

# iPhone Settings icons
sips -z 58 58 "$SOURCE_IMAGE" --out "$ICON_DIR/Icon-29@2x.png"
sips -z 87 87 "$SOURCE_IMAGE" --out "$ICON_DIR/Icon-29@3x.png"

# iPhone Spotlight icons
sips -z 80 80 "$SOURCE_IMAGE" --out "$ICON_DIR/Icon-40@2x.png"
sips -z 120 120 "$SOURCE_IMAGE" --out "$ICON_DIR/Icon-40@3x.png"

# iPhone App icons
sips -z 120 120 "$SOURCE_IMAGE" --out "$ICON_DIR/Icon-60@2x.png"
sips -z 180 180 "$SOURCE_IMAGE" --out "$ICON_DIR/Icon-60@3x.png"

# iPad icons
sips -z 20 20 "$SOURCE_IMAGE" --out "$ICON_DIR/Icon-20.png"
sips -z 29 29 "$SOURCE_IMAGE" --out "$ICON_DIR/Icon-29.png"
sips -z 40 40 "$SOURCE_IMAGE" --out "$ICON_DIR/Icon-40.png"
sips -z 76 76 "$SOURCE_IMAGE" --out "$ICON_DIR/Icon-76.png"
sips -z 152 152 "$SOURCE_IMAGE" --out "$ICON_DIR/Icon-76@2x.png"
sips -z 167 167 "$SOURCE_IMAGE" --out "$ICON_DIR/Icon-83.5@2x.png"

# App Store icon
sips -z 1024 1024 "$SOURCE_IMAGE" --out "$ICON_DIR/Icon-1024.png"

echo "✅ Icon generation complete!"

# Create Contents.json file for the icon set
cat > "$ICON_DIR/Contents.json" << 'EOF'
{
  "images" : [
    {
      "idiom" : "iphone",
      "size" : "20x20",
      "scale" : "2x",
      "filename" : "Icon-20@2x.png"
    },
    {
      "idiom" : "iphone",
      "size" : "20x20",
      "scale" : "3x",
      "filename" : "Icon-20@3x.png"
    },
    {
      "idiom" : "iphone",
      "size" : "29x29",
      "scale" : "2x",
      "filename" : "Icon-29@2x.png"
    },
    {
      "idiom" : "iphone",
      "size" : "29x29",
      "scale" : "3x",
      "filename" : "Icon-29@3x.png"
    },
    {
      "idiom" : "iphone",
      "size" : "40x40",
      "scale" : "2x",
      "filename" : "Icon-40@2x.png"
    },
    {
      "idiom" : "iphone",
      "size" : "40x40",
      "scale" : "3x",
      "filename" : "Icon-40@3x.png"
    },
    {
      "idiom" : "iphone",
      "size" : "60x60",
      "scale" : "2x",
      "filename" : "Icon-60@2x.png"
    },
    {
      "idiom" : "iphone",
      "size" : "60x60",
      "scale" : "3x",
      "filename" : "Icon-60@3x.png"
    },
    {
      "idiom" : "ipad",
      "size" : "20x20",
      "scale" : "1x",
      "filename" : "Icon-20.png"
    },
    {
      "idiom" : "ipad",
      "size" : "20x20",
      "scale" : "2x",
      "filename" : "Icon-20@2x.png"
    },
    {
      "idiom" : "ipad",
      "size" : "29x29",
      "scale" : "1x",
      "filename" : "Icon-29.png"
    },
    {
      "idiom" : "ipad",
      "size" : "29x29",
      "scale" : "2x",
      "filename" : "Icon-29@2x.png"
    },
    {
      "idiom" : "ipad",
      "size" : "40x40",
      "scale" : "1x",
      "filename" : "Icon-40.png"
    },
    {
      "idiom" : "ipad",
      "size" : "40x40",
      "scale" : "2x",
      "filename" : "Icon-40@2x.png"
    },
    {
      "idiom" : "ipad",
      "size" : "76x76",
      "scale" : "1x",
      "filename" : "Icon-76.png"
    },
    {
      "idiom" : "ipad",
      "size" : "76x76",
      "scale" : "2x",
      "filename" : "Icon-76@2x.png"
    },
    {
      "idiom" : "ipad",
      "size" : "83.5x83.5",
      "scale" : "2x",
      "filename" : "Icon-83.5@2x.png"
    },
    {
      "idiom" : "ios-marketing",
      "size" : "1024x1024",
      "scale" : "1x",
      "filename" : "Icon-1024.png"
    }
  ],
  "info" : {
    "version" : 1,
    "author" : "xcode"
  }
}
EOF

echo "✅ Contents.json created!"
echo ""
echo "🎉 App icon setup complete!"
echo "The Daddy Caddy logo has been configured as your app icon."
echo "Rebuild the app to see the new icon in the simulator."
