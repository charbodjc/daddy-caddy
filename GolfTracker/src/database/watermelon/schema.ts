import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'rounds',
      columns: [
        { name: 'course_name', type: 'string' },
        { name: 'tournament_id', type: 'string', isOptional: true },
        { name: 'tournament_name', type: 'string', isOptional: true },
        { name: 'date', type: 'number' },
        { name: 'total_score', type: 'number', isOptional: true },
        { name: 'total_putts', type: 'number', isOptional: true },
        { name: 'fairways_hit', type: 'number', isOptional: true },
        { name: 'greens_in_regulation', type: 'number', isOptional: true },
        { name: 'ai_analysis', type: 'string', isOptional: true },
        { name: 'is_finished', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    }),
    tableSchema({
      name: 'holes',
      columns: [
        { name: 'round_id', type: 'string', isIndexed: true },
        { name: 'hole_number', type: 'number' },
        { name: 'par', type: 'number' },
        { name: 'strokes', type: 'number' },
        { name: 'fairway_hit', type: 'boolean', isOptional: true },
        { name: 'green_in_regulation', type: 'boolean', isOptional: true },
        { name: 'putts', type: 'number', isOptional: true },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'shot_data', type: 'string', isOptional: true }, // JSON
      ]
    }),
    tableSchema({
      name: 'tournaments',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'course_name', type: 'string' },
        { name: 'start_date', type: 'number' },
        { name: 'end_date', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    }),
    tableSchema({
      name: 'media',
      columns: [
        { name: 'uri', type: 'string' },
        { name: 'type', type: 'string' },
        { name: 'round_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'hole_number', type: 'number', isOptional: true },
        { name: 'timestamp', type: 'number' },
        { name: 'description', type: 'string', isOptional: true },
      ]
    }),
    tableSchema({
      name: 'contacts',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'phone_number', type: 'string' },
        { name: 'is_active', type: 'boolean' },
      ]
    }),
  ]
});

