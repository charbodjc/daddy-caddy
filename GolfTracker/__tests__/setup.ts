import { database } from '../src/database/watermelon/database';

// Setup test database — uses LokiJS in-memory adapter (see database.ts)
export const setupTestDatabase = async () => {
  await database.write(async () => {
    await database.unsafeResetDatabase();
  });
};

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
