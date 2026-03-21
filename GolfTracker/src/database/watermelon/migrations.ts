import {
  schemaMigrations,
  createTable,
  addColumns,
  unsafeExecuteSql,
} from '@nozbe/watermelondb/Schema/migrations';

export const migrations = schemaMigrations({
  migrations: [
    {
      toVersion: 2,
      steps: [
        createTable({
          name: 'golfers',
          columns: [
            { name: 'name', type: 'string' },
            { name: 'handicap', type: 'number', isOptional: true },
            { name: 'color', type: 'string' },
            { name: 'is_default', type: 'boolean' },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
        addColumns({
          table: 'rounds',
          columns: [
            { name: 'golfer_id', type: 'string', isOptional: true },
          ],
        }),
        // addColumns cannot create indexes, so we add it via raw SQL.
        // Without this, all golfer-filtered queries on rounds do full table scans.
        unsafeExecuteSql(
          'create index if not exists rounds_golfer_id on rounds (golfer_id);',
        ),
      ],
    },
    {
      toVersion: 3,
      steps: [
        addColumns({
          table: 'golfers',
          columns: [
            { name: 'sms_contacts', type: 'string', isOptional: true },
          ],
        }),
        unsafeExecuteSql('DROP TABLE IF EXISTS contacts;'),
      ],
    },
    {
      toVersion: 4,
      steps: [
        addColumns({
          table: 'golfers',
          columns: [
            { name: 'emoji', type: 'string', isOptional: true },
          ],
        }),
      ],
    },
  ],
});
