# Golf Tracker - iPhone App

A comprehensive golf round tracking app for iPhone that helps you monitor your performance, capture media, and share updates with friends and family via SMS.

## Features

### 🏌️ Round Tracking
- **Hole-by-hole scoring** - Track strokes, putts, fairways hit, and greens in regulation
- **Quick score entry** - Fast input for each hole with detailed tracking options
- **Notes and observations** - Add notes for each hole to remember key moments
- **Real-time statistics** - See your score vs par as you play

### 📊 Performance Analytics
- **Comprehensive statistics** - Average score, putts, fairway accuracy, GIR percentage
- **Score distribution** - Track eagles, birdies, pars, bogeys, and double bogeys
- **Trend analysis** - Monitor improvement over time with 30-day and 90-day views
- **Round history** - Access all your previous rounds with detailed scorecards

### 🏆 Tournament Management
- **Create tournaments** - Organize multiple rounds under tournament events
- **Track tournament rounds** - Associate rounds with specific tournaments
- **Tournament status** - See active, upcoming, and completed tournaments
- **Multi-round tracking** - Perfect for club championships and multi-day events

### 📸 Media Integration
- **Photo capture** - Take photos during your round
- **Video recording** - Record swing videos for analysis
- **Gallery import** - Add existing photos and videos from your library
- **Hole-specific media** - Associate media with specific holes

### 🤖 AI Analysis
- **Round analysis** - Get AI-powered insights on your performance
- **Improvement suggestions** - Receive personalized practice recommendations
- **Pattern recognition** - Identify strengths and areas for improvement
- **Shot recommendations** - Get strategic advice for course management

### 📱 SMS Notifications
- **Native SMS integration** - Uses your phone's SMS capabilities
- **Contact management** - Maintain a list of recipients for round updates
- **Automated summaries** - Send comprehensive round summaries with stats
- **AI insights included** - Share AI analysis with your contacts
- **Media count** - Include information about photos/videos captured

## Setup Instructions

### Prerequisites
- macOS with Xcode installed (for iOS development)
- Node.js 18 or higher
- npm or yarn package manager
- CocoaPods (will be installed if not present)

### Installation Steps

1. **Navigate to the project directory:**
   ```bash
   cd /Users/dancharbonneau/projects/daddy-caddy/GolfTracker
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **iOS Setup:**
   ```bash
   cd ios
   pod install
   cd ..
   ```

4. **Configure OpenAI (Optional):**
   - Create a `.env` file in the root directory
   - Add your OpenAI API key:
     ```
     OPENAI_API_KEY=your_api_key_here
     ```
   - This enables AI analysis features

### Running the App

#### iOS Simulator
```bash
npm run ios
```

#### iOS Device
1. Open `ios/GolfTracker.xcworkspace` in Xcode
2. Select your device from the device list
3. Click the Run button or press Cmd+R

#### Android (if needed)
```bash
npm run android
```

## App Structure

```
GolfTracker/
├── src/
│   ├── navigation/      # Navigation configuration
│   ├── screens/         # All app screens
│   │   ├── HomeScreen.tsx
│   │   ├── RoundTrackerScreen.tsx
│   │   ├── HoleDetailsScreen.tsx
│   │   ├── StatsScreen.tsx
│   │   ├── ContactsScreen.tsx
│   │   ├── TournamentsScreen.tsx
│   │   ├── RoundSummaryScreen.tsx
│   │   └── CameraScreen.tsx
│   ├── services/        # Business logic
│   │   ├── database.ts  # SQLite database operations
│   │   ├── ai.ts       # OpenAI integration
│   │   └── sms.ts      # SMS functionality
│   └── types/          # TypeScript type definitions
├── ios/                # iOS native code
├── android/           # Android native code
└── App.tsx           # Main app component
```

## Usage Guide

### Starting a New Round
1. Tap "New Round" on the home screen
2. Enter the course name
3. Optionally associate with a tournament
4. Begin tracking hole by hole

### Recording Scores
1. Select the hole number
2. Enter your strokes using the quick buttons
3. Optionally add:
   - Number of putts
   - Fairway hit (Yes/No)
   - Green in regulation (Yes/No)
   - Notes about the hole
4. Take photos or videos if desired

### Viewing Statistics
1. Navigate to the Stats tab
2. Choose time period (All Time, 30 Days, 90 Days)
3. Review:
   - Scoring averages
   - Accuracy percentages
   - Score distribution
   - Recent round trends

### Managing Contacts
1. Go to the Contacts tab
2. Add recipients for SMS updates
3. Enter name and phone number
4. Contacts will receive your round summaries

### Sending Round Summaries
1. Complete your round
2. View the round summary
3. Tap "Send SMS Summary"
4. Your phone's SMS app will open with:
   - Pre-filled recipients
   - Comprehensive round statistics
   - AI analysis insights
   - Media count information

## Troubleshooting

### Build Issues
- Clean build folder: `cd ios && xcodebuild clean`
- Reset Metro bundler: `npx react-native start --reset-cache`
- Reinstall pods: `cd ios && pod deintegrate && pod install`

### Database Issues
- The app uses SQLite for local storage
- Data persists between app launches
- To reset: Delete and reinstall the app

### SMS Not Working
- Ensure the app has permission to access SMS
- Check that phone numbers are formatted correctly
- SMS functionality requires a real device (not simulator)

## Privacy & Data

- All data is stored locally on your device
- No data is sent to external servers (except OpenAI if configured)
- Photos and videos remain on your device
- SMS messages are sent through your carrier

## Future Enhancements

Potential features for future versions:
- Cloud sync and backup
- Social features and leaderboards
- GPS course mapping
- Weather integration
- Handicap calculation
- Shot tracking with distances
- Apple Watch companion app
- Export to CSV/PDF

## Support

For issues or questions about the Golf Tracker app, please check the troubleshooting section above or create an issue in the project repository.

## License

This app is for personal use. All rights reserved.

---

Built with React Native, TypeScript, and ❤️ for golf