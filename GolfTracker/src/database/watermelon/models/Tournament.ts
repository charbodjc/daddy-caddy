import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export default class Tournament extends Model {
  static table = 'tournaments';

  @field('name') name!: string;
  @field('course_name') courseName!: string;
  @date('start_date') startDate!: Date;
  @date('end_date') endDate!: Date;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}

