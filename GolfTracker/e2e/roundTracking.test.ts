import { device, element, by, expect as detoxExpect } from 'detox';

describe('Round Tracking E2E', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      permissions: { camera: 'YES', photos: 'YES' }
    });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should start and complete a golf round', async () => {
    // Navigate to Scoring tab
    await element(by.text('Scoring')).tap();
    
    // Start a new round
    await element(by.id('course-name-input')).typeText('Pebble Beach');
    await element(by.id('start-round-button')).tap();
    
    // Should show round tracker screen
    await detoxExpect(element(by.text('Pebble Beach'))).toBeVisible();
    
    // Select hole 1
    await element(by.id('hole-card-1')).tap();
    
    // Select par 4
    await element(by.text('Par 4')).tap();
    
    // Should navigate to shot tracking
    await detoxExpect(element(by.text('Hole 1'))).toBeVisible();
    
    // Quick score of 4
    await element(by.text('4')).tap();
    
    // Should return to round tracker
    await detoxExpect(element(by.id('hole-card-1'))).toBeVisible();
    
    // Verify score is displayed
    await detoxExpect(element(by.text('4'))).toBeVisible();
  });

  it('should navigate to statistics', async () => {
    await element(by.text('Stats')).tap();
    
    await detoxExpect(element(by.text('Statistics'))).toBeVisible();
  });

  it('should navigate to tournaments', async () => {
    await element(by.text('Tournaments')).tap();
    
    await detoxExpect(element(by.text('Tournaments'))).toBeVisible();
  });

  it('should create a tournament', async () => {
    await element(by.text('Tournaments')).tap();
    
    // Tap create tournament button
    await element(by.id('create-tournament-button')).tap();
    
    // Fill in tournament details
    await element(by.id('tournament-name-input')).typeText('Test Tournament');
    await element(by.id('course-name-input')).typeText('Test Course');
    
    // Create
    await element(by.text('Create')).tap();
    
    // Should show in list
    await detoxExpect(element(by.text('Test Tournament'))).toBeVisible();
  });

  it('should handle navigation flow', async () => {
    // Home
    await element(by.text('Home')).tap();
    await detoxExpect(element(by.text('Daddy Caddy'))).toBeVisible();
    
    // Scoring
    await element(by.text('Scoring')).tap();
    
    // Stats
    await element(by.text('Stats')).tap();
    await detoxExpect(element(by.text('Statistics'))).toBeVisible();
    
    // Settings
    await element(by.text('Settings')).tap();
    await detoxExpect(element(by.text('Settings'))).toBeVisible();
    
    // Back to Home
    await element(by.text('Home')).tap();
    await detoxExpect(element(by.text('Daddy Caddy'))).toBeVisible();
  });
});

