import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';
import { schema } from './schema';
import Round from './models/Round';
import Hole from './models/Hole';
import Tournament from './models/Tournament';
import Media from './models/Media';
import Contact from './models/Contact';

// Use LokiJS adapter for testing (works in Node environment)
// Use SQLite adapter for production (native performance)
const adapter = process.env.NODE_ENV === 'test'
  ? new LokiJSAdapter({
      schema,
      useWebWorker: false,
      useIncrementalIndexedDB: true,
    })
  : new SQLiteAdapter({
      schema,
      dbName: 'DaddyCaddy',
      jsi: true, // Use JSI for better performance
    });

export const database = new Database({
  adapter,
  modelClasses: [Round, Hole, Tournament, Media, Contact],
});

