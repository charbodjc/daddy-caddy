# Deployment Setup Complete ✅

## What Was Done

### 1. Fixed the Putting Flow Code ✅
- Added new putting mode UI with "Made It / Missed It / Cancel" buttons
- Code is in `src/screens/ShotTrackingScreen.tsx`
- Metro is serving the updated code

### 2. Fixed the Xcode Bundle Script ✅
**CRITICAL FIX**: The Xcode project was copying a static `main.jsbundle` file instead of generating it from source!

**Before**: Script copied old `ios/main.jsbundle` → Always deployed old code  
**After**: Script runs React Native bundler → Always deploys latest code

This was why your changes never appeared!

### 3. Added Version Tracking ✅
- Settings screen now shows: `v1.0.0 (build 1) • 2025-01-09`
- **Increment `BUILD_NUMBER`** before each deploy
- After deploy, check Settings - if version changed, code deployed!

### 4. Created Deployment Scripts ✅
- `scripts/deploy_release_to_device.sh` - Deploy Release build to iPhone
- `scripts/deploy_archive.sh` - Create archive for TestFlight/App Store

### 5. Created Documentation ✅
- `DEPLOYMENT.md` - Complete deployment guide
- `XCODE_SIGNING_SETUP.md` - How to fix signing errors

---

## NEXT STEPS (Do This Now!)

### Step 1: Set Up Code Signing in Xcode (One-Time)

Release builds need Apple code signing. Follow this guide:

**[XCODE_SIGNING_SETUP.md](./XCODE_SIGNING_SETUP.md)** ← Open this file

Quick version:
1. `open ios/GolfTracker.xcworkspace`
2. Add Apple ID: Xcode → Settings → Accounts
3. Select GolfTracker target → Signing & Capabilities
4. Check "Automatically manage signing"
5. Select your Team
6. Build in Xcode (⌘R) to verify it works

### Step 2: Deploy with New Script

Once Xcode signing is set up:

```bash
cd /Users/dancharbonneau/projects/daddy-caddy/GolfTracker

# Increment BUILD_NUMBER in src/screens/SettingsScreen.tsx first!
# Change: const BUILD_NUMBER = '2';  // was '1'

./scripts/deploy_release_to_device.sh
```

### Step 3: Verify on Phone

1. Open Daddy Caddy app
2. Go to **Settings** tab
3. **Check version number** - should show `v1.0.0 (build 2)`
4. If version changed → Code deployed! ✅
5. If version same → Deployment failed ❌

### Step 4: Test the New Putting Flow

1. Start a round
2. Track some shots
3. Select **Putt**
4. Enter distance and share
5. **You should see the new UI**:
   - "Made It!" button (green)
   - "Missed It" button (orange)  
   - "Cancel" button (gray)
6. Try clicking "Missed It" multiple times
7. Finally click "Made It!" to complete

---

## Why This Matters

### The Root Cause

Your Xcode project was configured to **copy a static bundle file** instead of **generating the bundle from source code**. This meant:

- ❌ Code changes in `src/` were ignored
- ❌ Always deployed the same old JavaScript
- ❌ No way to update the app without manually creating bundles

### The Fix

Now the Xcode "Bundle React Native code and images" script:
- ✅ Runs the React Native bundler on every build
- ✅ Compiles your latest JavaScript into the app
- ✅ Includes all your code changes automatically

### How to Know It Worked

**Version number in Settings is your source of truth!**

Before deploy: `v1.0.0 (build 1) • 2025-01-09`  
After deploy: `v1.0.0 (build 2) • 2025-01-09` ← Build number increased!

If the build number doesn't change → deployment failed, code is still old.

---

## Future Deployments

### Every Time You Make Changes:

```bash
# 1. Make your code changes in src/...

# 2. Increment build number
#    Edit: src/screens/SettingsScreen.tsx
#    Change: const BUILD_NUMBER = '3'; // was '2'

# 3. Deploy
./scripts/deploy_release_to_device.sh

# 4. Verify
#    Settings → Check version changed
```

### Troubleshooting

If deployment fails, see:
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Complete troubleshooting guide
- **[XCODE_SIGNING_SETUP.md](./XCODE_SIGNING_SETUP.md)** - Fix signing errors

---

## Quick Reference

| Task | Command |
|------|---------|
| Deploy to phone | `./scripts/deploy_release_to_device.sh` |
| Check device | `xcrun devicectl list devices` |
| Open in Xcode | `open ios/GolfTracker.xcworkspace` |
| Check version | Settings tab in app |

**Golden Rule**: Always increment `BUILD_NUMBER` before deploying, then verify it changed in the app!

---

## Current Status

✅ New putting flow code is ready  
✅ Xcode bundle script fixed to use latest code  
✅ Version tracking added  
✅ Deployment scripts created  
✅ Documentation complete  

⏳ **TODO**: 
1. Set up code signing in Xcode (follow XCODE_SIGNING_SETUP.md)
2. Deploy with `./scripts/deploy_release_to_device.sh`
3. Verify version changed in Settings
4. Test new putting flow



