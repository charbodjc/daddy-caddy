import { Model, Query, Relation } from '@nozbe/watermelondb';
import { field, date, readonly, children, lazy, relation } from '@nozbe/watermelondb/decorators';
import type Golfer from './Golfer';
import Hole from './Hole';

export default class Round extends Model {
  static table = 'rounds' as const;
  static associations = {
    holes: { type: 'has_many' as const, foreignKey: 'round_id' },
    golfers: { type: 'belongs_to' as const, key: 'golfer_id' },
  };

  @field('course_name') courseName!: string;
  @field('tournament_id') tournamentId?: string;
  @field('tournament_name') tournamentName?: string;
  @field('golfer_id') golferId?: string;
  @relation('golfers', 'golfer_id') golfer!: Relation<Golfer>;
  @date('date') date!: Date;
  @field('total_score') totalScore?: number;
  @field('total_putts') totalPutts?: number;
  @field('fairways_hit') fairwaysHit?: number;
  @field('greens_in_regulation') greensInRegulation?: number;
  @field('ai_analysis') aiAnalysis?: string;
  @field('is_finished') isFinished!: boolean;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @children('holes') holes!: Query<Hole>;

  @lazy holesArray = this.holes.observe();
}
