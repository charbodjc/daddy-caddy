/**
 * ShotTrackingScreen tests
 *
 * The screen was fully rewritten during the WatermelonDB migration.
 * It now loads hole data by ID from WatermelonDB instead of receiving
 * a full GolfHole object via route params.
 *
 * These tests need to be rewritten to match the new architecture.
 * See: https://github.com/charbodjc/daddy-caddy/issues (future work)
 */

describe('ShotTrackingScreen', () => {
  it.todo('should load hole data from WatermelonDB by holeId');
  it.todo('should display shot type selection buttons');
  it.todo('should add shots and increment stroke counter');
  it.todo('should auto-advance shot type after each shot');
  it.todo('should save shot data via roundStore.updateHole');
  it.todo('should navigate to HoleSummary on Done');
  it.todo('should support undo last shot');
  it.todo('should show putt distance input for putt shots');
});
