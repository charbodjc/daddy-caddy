import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schema } from './schema';
import Round from './models/Round';
import Hole from './models/Hole';
import Tournament from './models/Tournament';
import Media from './models/Media';
import Contact from './models/Contact';

const adapter = new SQLiteAdapter({
  schema,
  dbName: 'DaddyCaddy',
  jsi: true, // Use JSI for better performance
});

export const database = new Database({
  adapter,
  modelClasses: [Round, Hole, Tournament, Media, Contact],
});

