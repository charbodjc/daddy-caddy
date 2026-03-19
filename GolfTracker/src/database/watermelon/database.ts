import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';
import { schema } from './schema';
import { migrations } from './migrations';
import Golfer from './models/Golfer';
import Round from './models/Round';
import Hole from './models/Hole';
import Tournament from './models/Tournament';
import Media from './models/Media';
// Use LokiJS adapter for testing (works in Node environment)
// Use SQLite adapter for production (native performance)
const adapter = process.env.NODE_ENV === 'test'
  ? new LokiJSAdapter({
      schema,
      migrations,
      useWebWorker: false,
      useIncrementalIndexedDB: false,
    })
  : new SQLiteAdapter({
      schema,
      migrations,
      dbName: 'DaddyCaddy',
      jsi: true,
      // CRITICAL: migrations param must be present for existing databases to be
      // migrated from v1 to v2. Without it, WatermelonDB recreates the DB from scratch.
    });

export const database = new Database({
  adapter,
  modelClasses: [Golfer, Round, Hole, Tournament, Media],
});

