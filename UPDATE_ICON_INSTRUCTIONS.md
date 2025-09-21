# Update App Icon to Daddy Caddy Logo

## Step 1: Save the New Logo
Please save the Daddy Caddy logo image (the one with "DC" text, golf ball, flag, and chart) as:
```
/Users/dancharbonneau/projects/daddy-caddy/daddy_caddy_logo.png
```

## Step 2: Generate All Icon Sizes
Run this command in Terminal:
```bash
cd /Users/dancharbonneau/projects/daddy-caddy
chmod +x generate_app_icons.sh
./generate_app_icons.sh
```

## Step 3: Rebuild the App
The app will automatically use the new icons on the next build:
```bash
cd GolfTracker
npx react-native run-ios --simulator="iPhone 17 Pro Max"
```

## What This Will Do:
- Generate all 15 required iOS icon sizes from your Daddy Caddy logo
- Replace the Charbo logo with the new DC logo
- The app icon will show "DC" with golf elements
- The app name "Daddy Caddy" will appear under the icon

## Icon Sizes Generated:
- iPhone notifications (20pt @2x, @3x)
- iPhone settings (29pt @2x, @3x)  
- iPhone spotlight (40pt @2x, @3x)
- iPhone app (60pt @2x, @3x)
- iPad various sizes (20pt, 29pt, 40pt, 76pt, 83.5pt)
- App Store icon (1024x1024)
