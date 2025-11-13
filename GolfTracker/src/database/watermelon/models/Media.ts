import { Model, Relation } from '@nozbe/watermelondb';
import { field, date, relation } from '@nozbe/watermelondb/decorators';
import Round from './Round';

export default class Media extends Model {
  static table = 'media';
  static associations = {
    rounds: { type: 'belongs_to', key: 'round_id' },
  };

  @field('uri') uri!: string;
  @field('type') type!: 'photo' | 'video';
  @field('round_id') roundId?: string;
  @field('hole_number') holeNumber?: number;
  @date('timestamp') timestamp!: Date;
  @field('description') description?: string;

  @relation('rounds', 'round_id') round?: Relation<Round>;
}

