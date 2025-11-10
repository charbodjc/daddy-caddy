import { Model, Relation } from '@nozbe/watermelondb';
import { field, relation, immutableRelation } from '@nozbe/watermelondb/decorators';
import Round from './Round';

export default class Hole extends Model {
  static table = 'holes';
  static associations = {
    rounds: { type: 'belongs_to', key: 'round_id' },
  };

  @field('round_id') roundId!: string;
  @field('hole_number') holeNumber!: number;
  @field('par') par!: number;
  @field('strokes') strokes!: number;
  @field('fairway_hit') fairwayHit?: boolean;
  @field('green_in_regulation') greenInRegulation?: boolean;
  @field('putts') putts?: number;
  @field('notes') notes?: string;
  @field('shot_data') shotData?: string; // JSON string

  @immutableRelation('rounds', 'round_id') round!: Relation<Round>;
}

