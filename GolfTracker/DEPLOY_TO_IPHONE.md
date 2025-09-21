# 📱 How to Get Golf Tracker on Your iPhone

## Option 1: TestFlight (Easiest for Testing)
This is the best way to test your app on your personal iPhone without publishing to the App Store.

### Prerequisites:
- Apple Developer Account ($99/year) - Required for installing on physical devices
- Your iPhone
- Xcode (already installed ✅)

### Steps:

#### 1. Set Up Apple Developer Account
1. Go to [developer.apple.com](https://developer.apple.com)
2. Sign in with your Apple ID
3. Enroll in the Apple Developer Program ($99/year)

#### 2. Configure Your Project in Xcode
1. Open Xcode with your project:
   ```bash
   open /Users/dancharbonneau/projects/daddy-caddy/GolfTracker/ios/GolfTracker.xcworkspace
   ```

2. Select "GolfTracker" in the project navigator
3. In the "Signing & Capabilities" tab:
   - Check "Automatically manage signing"
   - Select your Team (your Apple Developer account)
   - Bundle Identifier should be unique (e.g., `com.yourname.GolfTracker`)

#### 3. Build for Release
1. In Xcode, select "Any iOS Device" as the destination (not a simulator)
2. Go to Product → Archive
3. Wait for the build to complete (this takes a few minutes)

#### 4. Upload to TestFlight
1. When Archive completes, the Organizer window opens
2. Select your archive and click "Distribute App"
3. Choose "App Store Connect" → Next
4. Choose "Upload" → Next
5. Follow the prompts to upload

#### 5. Set Up TestFlight
1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Select your app
3. Go to TestFlight tab
4. Add your email as an Internal Tester
5. Once the build is processed (usually 10-30 minutes), you'll get an email

#### 6. Install on Your iPhone
1. Download TestFlight from the App Store on your iPhone
2. Open the TestFlight invitation email on your iPhone
3. Tap "View in TestFlight"
4. Install the app!

---

## Option 2: Direct Installation (Developer Mode)
For immediate testing without TestFlight.

### Steps:

#### 1. Enable Developer Mode on iPhone
1. On your iPhone: Settings → Privacy & Security
2. Scroll down to "Developer Mode"
3. Toggle it ON
4. Restart your iPhone when prompted

#### 2. Connect iPhone to Mac
1. Connect your iPhone via USB cable
2. Trust the computer when prompted on your iPhone

#### 3. Build and Run from Xcode
1. In Xcode, select your iPhone from the device list (top bar)
2. Press Cmd+R or click the Play button
3. The app will install and launch on your iPhone!

---

## Option 3: Ad Hoc Distribution (Share with Friends)
To share with a small group without the App Store.

### Steps:
1. Follow Option 1 steps 1-3
2. In the Organizer, choose "Ad Hoc" distribution
3. Select provisioning profile with the devices you want
4. Export the .ipa file
5. Share via services like Diawi.com or Apple Configurator

---

## 🚀 Quick Start (If You Already Have Developer Account)

```bash
# 1. Open Xcode
open /Users/dancharbonneau/projects/daddy-caddy/GolfTracker/ios/GolfTracker.xcworkspace

# 2. Select your iPhone in Xcode's device menu
# 3. Press Cmd+R to build and run!
```

---

## ⚠️ Important Notes:

1. **Free Apple Developer Account**: You can run apps on your device for 7 days without paying
2. **Paid Developer Account**: Apps stay on your device indefinitely
3. **TestFlight**: Best for ongoing testing, apps expire after 90 days
4. **App Updates**: Use the same method to install updates

---

## 🛠 Troubleshooting:

### "Untrusted Developer" Error
1. On iPhone: Settings → General → VPN & Device Management
2. Tap your developer profile
3. Tap "Trust [Your Name]"

### "Device Not Eligible" Error
1. Update your iPhone to iOS 15 or later
2. Update Xcode to the latest version

### Build Errors
1. Clean build folder: Cmd+Shift+K in Xcode
2. Delete derived data: `rm -rf ~/Library/Developer/Xcode/DerivedData`
3. Restart Xcode

---

## 📞 Need Help?
- [Apple Developer Forums](https://developer.apple.com/forums/)
- [React Native Docs](https://reactnative.dev/docs/running-on-device)
