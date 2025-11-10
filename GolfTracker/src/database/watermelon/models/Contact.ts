import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export default class Contact extends Model {
  static table = 'contacts';

  @field('name') name!: string;
  @field('phone_number') phoneNumber!: string;
  @field('is_active') isActive!: boolean;
}

