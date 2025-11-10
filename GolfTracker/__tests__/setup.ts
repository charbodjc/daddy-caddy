import { database } from '../src/database/watermelon/database';

// Setup test database
export const setupTestDatabase = async () => {
  // Reset database before each test
  await database.write(async () => {
    await database.unsafeResetDatabase();
  });
};

// Cleanup after tests
export const cleanupTestDatabase = async () => {
  await database.write(async () => {
    await database.unsafeResetDatabase();
  });
};

// Global test setup
beforeEach(async () => {
  await setupTestDatabase();
});

afterEach(async () => {
  await cleanupTestDatabase();
});

