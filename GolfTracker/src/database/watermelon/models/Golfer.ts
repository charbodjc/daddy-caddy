import { Model, Query } from '@nozbe/watermelondb';
import { field, date, readonly, children } from '@nozbe/watermelondb/decorators';
import Round from './Round';

export default class Golfer extends Model {
  static table = 'golfers' as const;
  static associations = {
    rounds: { type: 'has_many' as const, foreignKey: 'golfer_id' },
  };

  @field('name') name!: string;
  @field('handicap') handicap?: number;
  @field('color') color!: string;
  @field('emoji') emoji?: string;
  @field('avatar_uri') avatarUri?: string;
  @field('is_default') isDefault!: boolean;
  @field('sms_contacts') smsContactsRaw?: string;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @children('rounds') rounds!: Query<Round>;
}
