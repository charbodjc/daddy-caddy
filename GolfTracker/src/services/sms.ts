import { Platform, Linking } from 'react-native';
import * as SMS from 'expo-sms';
import { GolfHole, SmsContact, SHOT_TYPES } from '../types';
import { database } from '../database/watermelon/database';
import Golfer from '../database/watermelon/models/Golfer';
import { parseGolferContacts } from '../stores/golferStore';
import { getScoreName } from '../utils/scoreColors';

class SMSService {
  /**
   * Resolve SMS recipients for a golfer from their WatermelonDB record.
   * Returns an empty array if the golfer has no contacts configured.
   */
  async getRecipientsForGolfer(golferId: string): Promise<SmsContact[]> {
    try {
      const golfer = await database.collections.get<Golfer>('golfers').find(golferId);
      return parseGolferContacts(golfer.smsContactsRaw);
    } catch {
      return [];
    }
  }

  async sendHoleSummary(
    hole: GolfHole,
    aiSummary: string,
    mediaCount: { photos: number; videos: number },
    golferId: string,
    runningStatsText?: string,
  ): Promise<{ success: boolean; sent: boolean; errors: string[] }> {
    const recipients = await this.getRecipientsForGolfer(golferId);
    if (recipients.length === 0) {
      return { success: false, sent: false, errors: ['No SMS contacts configured'] };
    }

    let message = `Hole ${hole.holeNumber} Update\n`;
    message += `${aiSummary}\n\n`;

    const diff = hole.strokes - hole.par;
    message += `Score: ${hole.strokes} (${getScoreName(diff)})\n`;

    if (hole.shotData) {
      try {
        const parsed =
          typeof hole.shotData === 'string' ? JSON.parse(hole.shotData) : hole.shotData;
        if (parsed?.shots && Array.isArray(parsed.shots)) {
          const puttCount = parsed.shots.filter(
            (s: { type: string }) =>
              s.type?.toLowerCase() === SHOT_TYPES.PUTT.toLowerCase(),
          ).length;
          if (puttCount > 0) {
            message += `Putts: ${puttCount}\n`;
          }
        }
      } catch {
        // shotData not parseable, skip putt count
      }
    }

    const totalMedia = mediaCount.photos + mediaCount.videos;
    if (totalMedia > 0) {
      message += `\n📸 Media: `;
      if (mediaCount.photos > 0)
        message += `${mediaCount.photos} photo${mediaCount.photos !== 1 ? 's' : ''}`;
      if (mediaCount.photos > 0 && mediaCount.videos > 0) message += ' & ';
      if (mediaCount.videos > 0)
        message += `${mediaCount.videos} video${mediaCount.videos !== 1 ? 's' : ''}`;
      message += ' attached';
    }

    if (runningStatsText) {
      message += runningStatsText;
    }

    const phoneNumbers = recipients.map((c) => c.phoneNumber);
    const result = await this.openSMS(phoneNumbers, message);
    return {
      success: result.success,
      sent: result.sent,
      errors: result.success ? [] : ['Failed to open SMS app'],
    };
  }

  private async openSMS(
    recipients: string[],
    body: string,
  ): Promise<{ success: boolean; sent: boolean }> {
    try {
      if (recipients.length === 0) {
        return { success: false, sent: false };
      }

      // Use expo-sms sendSMSAsync which passes the message body directly to the
      // native SMS composer without URL encoding. The Linking.openURL approach with
      // sms: URLs causes iOS to display raw percent-encoded text (%20, %0A, etc.)
      const isAvailable = await SMS.isAvailableAsync();
      if (isAvailable) {
        const result = await SMS.sendSMSAsync(recipients, body);
        const wasSent = result.result === 'sent' || result.result === 'unknown';
        return { success: true, sent: wasSent };
      }

      // Fallback to sms: URL scheme if expo-sms is not available
      const addresses = recipients.join(',');
      const encodedBody = encodeURIComponent(body);
      const separator = Platform.OS === 'ios' ? '&' : '?';
      const smsUrl = `sms:${addresses}${separator}body=${encodedBody}`;

      const canOpen = await Linking.canOpenURL(smsUrl);
      if (canOpen) {
        await Linking.openURL(smsUrl);
        return { success: true, sent: true };
      }

      return { success: false, sent: false };
    } catch {
      return { success: false, sent: false };
    }
  }
}

export default new SMSService();
