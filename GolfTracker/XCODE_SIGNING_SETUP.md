# Xcode Signing Setup for Release Builds

## The Problem

Release builds require Apple code signing certificates and provisioning profiles. If you see errors like:

```
error: No Account for Team "CXHZ8Z4F6P"
error: No profiles for 'com.daddycaddy.golf' were found
```

This means Xcode needs to be configured for code signing.

## One-Time Setup (Required for Release Builds)

### Step 1: Open Project in Xcode

```bash
cd /Users/dancharbonneau/projects/daddy-caddy/GolfTracker
open ios/GolfTracker.xcworkspace
```

**Important**: Always open the `.xcworkspace` file, NOT the `.xcodeproj` file!

### Step 2: Add Your Apple ID

1. Xcode → **Settings** (⌘,)
2. Click **Accounts** tab
3. Click **+** button (bottom left)
4. Select **Apple ID**
5. Sign in with your Apple Developer account
6. Close Settings

### Step 3: Configure Signing for GolfTracker Target

1. In Xcode's left sidebar, click on **GolfTracker** (blue project icon at top)
2. In the main editor, select **GolfTracker** target (under TARGETS)
3. Click **Signing & Capabilities** tab
4. Configure:
   - ✅ Check **"Automatically manage signing"**
   - **Team**: Select your team (should show your Apple ID or organization)
   - **Bundle Identifier**: Should be `com.daddycaddy.golf`
   - **Provisioning Profile**: Should auto-select after choosing team
   - **Signing Certificate**: Should show "Apple Development" or "iOS Development"

### Step 4: Test Build in Xcode

1. At the top of Xcode, click the scheme dropdown (says "GolfTracker")
2. Click **Edit Scheme...**
3. Select **Run** in left sidebar
4. Change **Build Configuration** to **Release**
5. Click **Close**
6. In the device dropdown (next to scheme), select your **charboMAX** device
7. Press **⌘R** (or click the ▶️ Play button) to build and run

If this builds successfully, your signing is configured correctly!

### Step 5: After Successful Xcode Build

Now the deployment scripts will work:

```bash
./scripts/deploy_release_to_device.sh
```

## Why This Is Needed

- **Debug builds**: Can use simpler signing (Development certificate)
- **Release builds**: Require proper App Store/Ad Hoc signing
- **Xcode**: Manages certificates and profiles automatically
- **Command line**: Can't set up signing interactively - relies on Xcode config

## Troubleshooting

### "No Account for Team"

- You haven't added your Apple ID to Xcode
- Go to Xcode → Settings → Accounts → Add Apple ID

### "No profiles found"

- Team isn't selected in Signing & Capabilities
- Or Apple Developer account doesn't have necessary permissions
- Try unchecking/rechecking "Automatically manage signing"

### "Provisioning profile expired"

- In Signing & Capabilities, uncheck and recheck "Automatically manage signing"
- Xcode will create a new profile

### "iPhone is busy"

- Close Xcode
- Disconnect and reconnect iPhone
- Reopen Xcode
- Try again

## After Setup Complete

You only need to do this setup **once**. After that:

```bash
# Make changes → Increment build number → Deploy
./scripts/deploy_release_to_device.sh
```

The script will use the signing configuration you set up in Xcode.

## Alternative: Use Debug Builds

If you can't get Release signing working, you can use Debug builds for testing:

1. Keep Metro running: `npx react-native start --reset-cache`
2. Build Debug: `npx react-native run-ios --device "charboMAX"`
3. App loads JavaScript from Metro (requires Mac nearby)

But Release builds are better because they:
- Work standalone without Mac
- Match what users will get from App Store
- Bundle JavaScript into the app (what you build is what you get)


