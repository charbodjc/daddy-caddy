# STARTING dev server
kill -9 $(lsof -ti :3000) 2>/dev/null || true
npm run dev

# Starting EXPO server
cd mobile
kill -9 $(lsof -ti :8081) 2>/dev/null || true
npx expo start --clear

# Kill whatever is on port 8081
kill -9 $(lsof -ti :8081) 2>/dev/null || true

# BUILD
cd mobile
npx eas-cli login
npx eas-cli build:configure
npx eas-cli build --profile production --platform ios --clear-cache
npx eas-cli submit --platform ios         # submits to the testflight app store at Apple
npx eas-cli build --profile production --platform ios --clear-cache --non-interactive --auto-submit-with-profile production  # all in one

# Reset metro cache
./reset-metro-cache.sh

# Build for Android production
npx eas-cli build --platform android --profile production

# Submit to Google Play
npx eas-cli submit --platform android --latest

# OTA UPDATES

# Interactive update (guides you through options)
./scripts/push-update.sh

# Or quick update to production
./scripts/quick-update.sh prod "Fixed trainer menu issue"
cd mobile

# Push to production
npx eas-cli update --branch production --message "Fix: Resolved trainer authentication"

# Push to preview for testing
npx eas-cli update --branch preview --message "Test: New diagnostic features"

# Check update status
./scripts/quick-update.sh status

# Or directly
npx eas-cli update:list --branch production --limit 5

# TESTS
npm test              # Run all tests
npm test -- --coverage  # With coverage report
npm test -- --watch    # Watch mode for development

# PERFORMANCE
npm run analyze:performance

# Stripe Local Dev Server
stripe listen \
  --forward-to localhost:3000/api/webhooks/stripe \
  --api-key 2025-06-30.basil