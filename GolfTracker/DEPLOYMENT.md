# iOS Deployment Guide for Daddy Caddy

Complete guide for deploying React Native changes to your iPhone.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Understanding Debug vs Release](#understanding-debug-vs-release)
3. [Why Old UI Appears](#why-old-ui-appears)
4. [Deployment Workflows](#deployment-workflows)
5. [Troubleshooting](#troubleshooting)
6. [Version Tracking](#version-tracking)

---

## Quick Start

### Daily Development (Release Build to Device)

```bash
# Increment BUILD_NUMBER in src/screens/SettingsScreen.tsx first!
./scripts/deploy_release_to_device.sh
```

**After deployment:**
1. Open app on iPhone
2. Go to Settings
3. **Verify version number changed** - this proves your code deployed!

### Production Archive (for TestFlight/App Store)

```bash
# 1. Increment build number in Xcode:
#    Xcode → GolfTracker target → General → Build

# 2. Run archive script:
./scripts/deploy_archive.sh

# 3. Distribute via Xcode Organizer
```

---

## Understanding Debug vs Release

### Debug Builds (NOT USED - We only do Release)

- ❌ Loads JavaScript from Metro server (localhost:8081) at runtime
- ❌ Requires Mac nearby and Metro running
- ❌ Can show "new" code in dev but "old" code in standalone builds
- ❌ **We don't use these to avoid confusion**

### Release Builds (WHAT WE USE)

- ✅ JavaScript is **bundled into the .app** at build time
- ✅ Works standalone without Mac or Metro
- ✅ Exactly what users will get from App Store
- ✅ **This is our standard deployment method**

**Key Point**: Release builds run the "Bundle React Native code and images" Xcode script during build, which compiles your JavaScript into the app.

---

## Why Old UI Appears After Deploy

If you see old UI even after "deploying", it's one of these:

### 1. JavaScript Wasn't Bundled (Most Common)

**Cause**: Xcode didn't run the bundling script
**Fix**:
- Verify "Bundle React Native code and images" in Xcode Build Phases
- Script must be enabled for Release configuration
- Clean build folder: Xcode → Product → Clean Build Folder (⇧⌘K)

### 2. Cached Build Artifacts

**Cause**: Old builds cached in DerivedData or Metro
**Fix**:
```bash
# Clear all caches
watchman watch-del-all
rm -rf $TMPDIR/metro-* $TMPDIR/react-*
rm -rf ~/Library/Developer/Xcode/DerivedData/GolfTracker-*
```

### 3. App Has Cached Bundle

**Cause**: iOS cached the old JavaScript bundle
**Fix**: Delete app from iPhone and reinstall

### 4. Wrong Configuration Built

**Cause**: Accidentally built Debug instead of Release
**Fix**: Always specify `--configuration Release` or use our scripts

---

## Deployment Workflows

### Workflow 1: Quick Release to Device

**When**: Testing changes on your iPhone  
**Time**: ~5-10 minutes  
**Output**: App on your phone with latest code

```bash
# 1. Make your code changes
# Edit files in src/...

# 2. Increment build number
# Edit src/screens/SettingsScreen.tsx
# Change: const BUILD_NUMBER = '2'; // was '1'

# 3. Run deployment script
./scripts/deploy_release_to_device.sh

# 4. Verify on phone
# Open app → Settings → Check version number changed
```

### Workflow 2: Archive for Distribution

**When**: Sending to TestFlight or App Store  
**Time**: ~10-15 minutes  
**Output**: .xcarchive file ready to upload

```bash
# 1. Test Release build on device FIRST
./scripts/deploy_release_to_device.sh

# 2. Verify app works correctly on phone

# 3. Bump build number in Xcode
# Xcode → GolfTracker target → General → Build
# Increment: 1 → 2 → 3 → etc.

# 4. Create archive
./scripts/deploy_archive.sh

# 5. Distribute via Xcode
# Xcode → Window → Organizer → Distribute App
```

---

## Deployment Scripts

### `scripts/deploy_release_to_device.sh`

**What it does:**
1. Clears all caches (Metro, Xcode, watchman)
2. Installs CocoaPods dependencies
3. Checks if charboMAX is connected
4. Builds Release configuration
5. Installs to your iPhone
6. JavaScript is bundled into app - no Metro needed

**When to use:** Every time you make code changes and want to test on your phone

**How to use:**
```bash
cd /Users/dancharbonneau/projects/daddy-caddy/GolfTracker
./scripts/deploy_release_to_device.sh
```

### `scripts/deploy_archive.sh`

**What it does:**
1. Clears all caches
2. Installs dependencies
3. Prompts you to test first
4. Cleans Xcode build folder
5. Creates .xcarchive for distribution

**When to use:** Preparing for TestFlight or App Store release

**How to use:**
```bash
cd /Users/dancharbonneau/projects/daddy-caddy/GolfTracker
./scripts/deploy_archive.sh
```

---

## Version Tracking

### Why Version Numbers Matter

**The Problem**: Without visible version info, you can't tell if your deploy actually worked.

**The Solution**: We display the version in Settings:
- `v1.0.0 (build 2) • 2025-01-09`
- If this changes after deploy → code deployed ✅
- If this stays same → something failed ❌

### How to Update Version

**Before each deploy**, edit `src/screens/SettingsScreen.tsx`:

```typescript
const APP_VERSION = '1.0.0';  // Major.Minor.Patch (semantic versioning)
const BUILD_NUMBER = '2';      // INCREMENT THIS with each deploy!
const BUILD_DATE = '2025-01-09'; // Today's date
```

**Versioning Strategy:**
- `BUILD_NUMBER`: Increment for every deploy (1, 2, 3, 4...)
- `APP_VERSION`: Bump for feature releases (1.0.0 → 1.1.0 → 2.0.0)
- `BUILD_DATE`: Update to today's date

### Checking Version After Deploy

1. Deploy with script
2. Open app on iPhone
3. Navigate to **Settings** tab
4. Look at top of screen under "Settings" header
5. **Verify build number increased**

---

## Troubleshooting

### "Old UI still showing after deploy"

```bash
# 1. Did version number change in Settings?
# NO → Bundle script didn't run

# 2. Clear everything and try again
watchman watch-del-all
rm -rf ~/Library/Developer/Xcode/DerivedData/GolfTracker-*
rm -rf ios/build

# 3. Check Xcode Build Phases
# Xcode → GolfTracker target → Build Phases
# Verify "Bundle React Native code and images" exists and is enabled

# 4. Rebuild
./scripts/deploy_release_to_device.sh
```

### "Build failed with provisioning error"

```bash
# Release builds need code signing
# Fix in Xcode:

# 1. Open GolfTracker.xcworkspace in Xcode
# 2. Select GolfTracker target
# 3. Signing & Capabilities tab
# 4. Make sure:
#    - Team is selected
#    - "Automatically manage signing" is checked
#    - Provisioning Profile shows valid profile

# 5. Try building in Xcode first (⌘R)
# 6. Once that works, use scripts
```

### "Device not found"

```bash
# Check device connection:
xcrun devicectl list devices

# Should show:
# charboMAX ... connected

# If shows "unavailable":
# 1. Unlock iPhone
# 2. Trust this computer if prompted
# 3. Make sure USB cable is connected

# If not listed at all:
# 1. Unplug and replug USB cable
# 2. Restart iPhone
# 3. Restart Xcode
```

### "Metro errors during build"

```bash
# Metro shouldn't be needed for Release builds
# But sometimes interferes. Kill it:

lsof -ti:8081 | xargs kill -9

# Then rebuild:
./scripts/deploy_release_to_device.sh
```

---

## Xcode Build Phases Verification

### Required: "Bundle React Native code and images"

This script must exist and run for Release builds:

1. Open Xcode → `ios/GolfTracker.xcworkspace`
2. Select **GolfTracker** target (left sidebar)
3. Click **Build Phases** tab
4. Find **"Bundle React Native code and images"** script
5. Verify it contains:

```bash
export NODE_BINARY=node
../node_modules/react-native/scripts/react-native-xcode.sh
```

6. Make sure:
   - ✅ Script is enabled (checkbox checked)
   - ✅ Runs for Release configuration
   - ✅ Positioned below "Headers" but above "Compile Sources"

**This script is CRITICAL** - it bundles your JavaScript into the app!

---

## Cache Locations

Understanding where caches live helps debug issues:

### Metro Cache
- **Location**: `$TMPDIR/metro-*` and `$TMPDIR/react-*`
- **What**: Transformed JavaScript modules
- **When to clear**: After major code changes
- **How**: `rm -rf $TMPDIR/metro-* $TMPDIR/react-*`

### Xcode DerivedData
- **Location**: `~/Library/Developer/Xcode/DerivedData/GolfTracker-*`
- **What**: Compiled native code, build artifacts
- **When to clear**: When build seems stale or broken
- **How**: `rm -rf ~/Library/Developer/Xcode/DerivedData/GolfTracker-*`
- **Or**: Xcode → Settings → Locations → DerivedData → Delete

### Watchman (if installed)
- **Location**: Watchman's internal database
- **What**: File watching cache
- **When to clear**: When Metro doesn't detect file changes
- **How**: `watchman watch-del-all`

### iOS Build Folder
- **Location**: `ios/build/`
- **What**: Xcode build products
- **When to clear**: Before clean builds
- **How**: `rm -rf ios/build/`

---

## Best Practices

### Before Every Deploy

1. ✅ Make your code changes
2. ✅ Test locally if possible
3. ✅ **Increment BUILD_NUMBER** in SettingsScreen.tsx
4. ✅ Run deployment script
5. ✅ **Verify version on device** - if it didn't change, deploy failed!

### When to Use Each Script

| Script | Use When | Output |
|--------|----------|--------|
| `deploy_release_to_device.sh` | Daily development, testing changes | App on your iPhone |
| `deploy_archive.sh` | Ready for TestFlight/App Store | .xcarchive file |

### Version Number Strategy

```
v1.0.0 (build 47) • 2025-01-09
  │     │       │        │
  │     │       │        └─ Build date
  │     │       └─────────── Build number (increment EVERY deploy)
  │     └─────────────────── Patch version (bug fixes)
  └───────────────────────── Major.Minor version (features)
```

- **BUILD_NUMBER**: Increment for EVERY deploy (even if just testing)
- **APP_VERSION**: Bump when releasing new features to users
- **BUILD_DATE**: Update to today when deploying

---

## Common Commands Reference

### Check Device Connection
```bash
xcrun devicectl list devices
# Look for: charboMAX ... connected
```

### Kill Metro (if running)
```bash
lsof -ti:8081 | xargs kill -9
```

### Clear All Caches
```bash
watchman watch-del-all
rm -rf $TMPDIR/metro-* $TMPDIR/react-*
rm -rf ~/Library/Developer/Xcode/DerivedData/GolfTracker-*
rm -rf ios/build/
```

### Install Pods
```bash
cd ios && pod install && cd ..
```

### Build Release Locally
```bash
npx react-native run-ios --configuration Release --device "charboMAX"
```

---

## FAQ

### Q: Why do I only want Release builds?

**A**: Release builds bundle JavaScript into the app, so:
- App works without Mac nearby (standalone)
- Same experience as App Store builds
- No confusion between dev Metro code and production code
- Version tracking actually works

### Q: Do I need Metro running?

**A**: For Release builds - **NO!** The JavaScript is bundled into the app at build time. Metro is only needed for Debug builds.

### Q: How do I know my code actually deployed?

**A**: Check the version number in Settings! Increment `BUILD_NUMBER` before each deploy, then verify it changed in the app. If it didn't change, your code didn't deploy.

### Q: The build succeeded but UI hasn't changed?

**A**: The Bundle script probably didn't run:
1. Check Xcode Build Phases for "Bundle React Native code and images"
2. Verify it's enabled for Release configuration
3. Clean build folder and try again
4. Check version number - if it changed, code deployed but maybe wrong file?

### Q: When should I bump build numbers?

**A**:
- `BUILD_NUMBER`: Increment for EVERY deploy, even testing
- `APP_VERSION`: Bump for user-facing releases (1.0.0 → 1.1.0)
- Xcode Build number: Bump for TestFlight/App Store uploads

### Q: My phone shows "unavailable" in devicectl

**A**:
1. Unlock your iPhone
2. Accept "Trust This Computer?" prompt
3. Check Settings → Privacy & Security → Developer Mode is ON
4. Reconnect USB cable

---

## Pre-Deploy Checklist

Use this before every deployment:

- [ ] Code changes complete and tested
- [ ] `BUILD_NUMBER` incremented in `SettingsScreen.tsx`
- [ ] `BUILD_DATE` updated to today
- [ ] iPhone connected via USB
- [ ] iPhone unlocked and trusted
- [ ] Metro killed (if running): `lsof -ti:8081 | xargs kill -9`
- [ ] Run deployment script
- [ ] **Verify version changed in app Settings**

---

## File Locations Reference

```
GolfTracker/
├── src/
│   └── screens/
│       └── SettingsScreen.tsx          ← Version display + BUILD_NUMBER
├── scripts/
│   ├── deploy_release_to_device.sh     ← Daily deployment
│   └── deploy_archive.sh               ← Production archives
├── ios/
│   ├── GolfTracker.xcworkspace         ← Open this in Xcode
│   └── build/
│       └── GolfTracker.xcarchive       ← Created by deploy_archive.sh
└── DEPLOYMENT.md                       ← This file
```

---

## For New Team Members

### First Time Setup

1. Clone the repo
2. Install dependencies: `npm install --legacy-peer-deps`
3. Install CocoaPods: `cd ios && pod install && cd ..`
4. Connect iPhone via USB
5. Open Xcode → Open `ios/GolfTracker.xcworkspace`
6. Configure Signing & Capabilities with your Apple ID
7. Run first build from Xcode (⌘R) to verify setup
8. After that, use deployment scripts

### Daily Workflow

1. Make code changes
2. Increment `BUILD_NUMBER` in SettingsScreen.tsx
3. Run `./scripts/deploy_release_to_device.sh`
4. Check version in app Settings to verify deploy
5. Test the changes

---

## Quick Reference Card

**Make changes → Increment BUILD_NUMBER → Deploy → Verify version changed**

| Task | Command |
|------|---------|
| Deploy to iPhone | `./scripts/deploy_release_to_device.sh` |
| Create archive | `./scripts/deploy_archive.sh` |
| Check device | `xcrun devicectl list devices` |
| Kill Metro | `lsof -ti:8081 \| xargs kill -9` |
| Clear caches | See "Clear All Caches" above |
| Open in Xcode | `open ios/GolfTracker.xcworkspace` |

**Always verify**: Settings screen version number changed after deploy!

---

## Support

If deployment fails:

1. Check version number in app - did it change?
2. Read error messages carefully
3. Clear all caches and try again
4. Try building in Xcode to see detailed errors
5. Check this troubleshooting guide

**Remember**: The version number in Settings is your source of truth. If it changed, your code deployed!


