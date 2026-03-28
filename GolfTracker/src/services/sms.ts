import { Platform, Linking } from 'react-native';
import * as SMS from 'expo-sms';
import type { SMSAttachment } from 'expo-sms';
import RNFS from 'react-native-fs';
import { GolfHole, SmsContact, MediaItem, SHOT_TYPES } from '../types';
import { database } from '../database/watermelon/database';
import Golfer from '../database/watermelon/models/Golfer';
import Round from '../database/watermelon/models/Round';
import { parseGolferContacts } from '../stores/golferStore';
import { getScoreName } from '../utils/scoreColors';

const MIME_BY_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
  '.gif': 'image/gif',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.m4v': 'video/x-m4v',
};

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

  /**
   * Resolve SMS recipients via a round's associated golfer.
   * Returns an empty array if the round has no golfer or the golfer has no contacts.
   */
  async getRecipientsForRound(roundId: string): Promise<SmsContact[]> {
    try {
      const round = await database.collections.get<Round>('rounds').find(roundId);
      if (!round.golferId) return [];
      return this.getRecipientsForGolfer(round.golferId);
    } catch {
      return [];
    }
  }

  private mimeTypeFromUri(uri: string, fallbackType: 'photo' | 'video'): string {
    const ext = uri.substring(uri.lastIndexOf('.')).toLowerCase();
    return MIME_BY_EXT[ext] ?? (fallbackType === 'video' ? 'video/mp4' : 'image/jpeg');
  }

  private mediaItemToAttachment(item: MediaItem): SMSAttachment {
    const mimeType = this.mimeTypeFromUri(item.uri, item.type);
    const filename = item.uri.split('/').pop() ?? `${item.type}_${item.id}.${item.type === 'video' ? 'mp4' : 'jpg'}`;
    return { uri: item.uri, mimeType, filename };
  }

  private async buildValidAttachments(items: MediaItem[]): Promise<SMSAttachment[]> {
    const attachments: SMSAttachment[] = [];
    for (const item of items) {
      const exists = await RNFS.exists(item.uri);
      if (exists) {
        attachments.push(this.mediaItemToAttachment(item));
      }
    }
    return attachments;
  }

  async sendHoleSummary(
    hole: GolfHole,
    aiSummary: string,
    golferId: string,
    runningStatsText?: string,
    mediaItems?: MediaItem[],
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
          let puttCount: number;
          if (parsed.version === 2) {
            puttCount = parsed.shots.filter(
              (s: { lie: string }) => s.lie === 'green',
            ).length;
          } else {
            puttCount = parsed.shots.filter(
              (s: { type: string }) =>
                s.type?.toLowerCase() === SHOT_TYPES.PUTT.toLowerCase(),
            ).length;
          }
          if (puttCount > 0) {
            message += `Putts: ${puttCount}\n`;
          }
        }
      } catch {
        // shotData not parseable, skip putt count
      }
    }

    const attachments = mediaItems?.length
      ? await this.buildValidAttachments(mediaItems)
      : [];

    if (attachments.length > 0) {
      const photos = attachments.filter((a) => a.mimeType.startsWith('image/')).length;
      const videos = attachments.filter((a) => a.mimeType.startsWith('video/')).length;
      message += `\n📸 Media: `;
      if (photos > 0) message += `${photos} photo${photos !== 1 ? 's' : ''}`;
      if (photos > 0 && videos > 0) message += ' & ';
      if (videos > 0) message += `${videos} video${videos !== 1 ? 's' : ''}`;
      message += ' attached';
    }

    if (runningStatsText) {
      message += runningStatsText;
    }

    const phoneNumbers = recipients.map((c) => c.phoneNumber);
    const result = await this.openSMS(phoneNumbers, message, attachments.length > 0 ? attachments : undefined);
    return {
      success: result.success,
      sent: result.sent,
      errors: result.success ? [] : ['Failed to open SMS app'],
    };
  }

  private async openSMS(
    recipients: string[],
    body: string,
    attachments?: SMSAttachment[],
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
        const smsOptions = attachments?.length ? { attachments } : undefined;
        const result = await SMS.sendSMSAsync(recipients, body, smsOptions);
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
