import { Platform } from 'react-native';
import * as SMS from 'expo-sms';
import { GolfRound, MediaItem, GolfHole } from '../types';
import AIService from './ai';
import DatabaseService from './database';

interface RoundStats {
  totalScore: number;
  scoreVsPar: string;
  eagles: number;
  birdies: number;
  pars: number;
  bogeys: number;
  doubleBogeys: number;
  fairwaysHit: number;
  greensInRegulation: number;
  totalPutts: number;
  playedHoles: number;
}

interface Contact {
  name: string;
  phoneNumber: string;
  isActive: boolean;
}

class SMSService {
  async sendRoundSummary(
    round: GolfRound,
    mediaItems: MediaItem[]
  ): Promise<{ success: boolean; sent: boolean; errors: string[]; groupName?: string }> {
    const errors: string[] = [];

    try {
      // Generate AI analysis
      const aiAnalysis = await AIService.analyzeRound(round);
      
      // Calculate statistics
      const stats = this.calculateRoundStats(round);
      
      // Create message content
      const message = this.formatMessage(round, stats, aiAnalysis, mediaItems);

      // Load default recipients list from settings (comma or newline separated)
      const recipients = await this.getDefaultRecipients();
      const groupName = await DatabaseService.getPreference('default_sms_group_name') || 'your text group';

      // Open in-app SMS composer
      const result = await this.openSMS(recipients, message);

      if (!result.success) {
        errors.push('Failed to open SMS app');
      }

      return {
        success: result.success,
        sent: result.sent,
        errors,
        groupName,
      };
    } catch (error) {
      return {
        success: false,
        sent: false,
        errors: [`Failed to prepare message: ${error}`],
      };
    }
  }

  private async openSMS(
    recipients: string,
    body: string
  ): Promise<{ success: boolean; sent: boolean }> {
    try {
      // Check if SMS is available on this device
      const isAvailable = await SMS.isAvailableAsync();
      
      if (!isAvailable) {
        console.warn('SMS is not available on this device');
        return { success: false, sent: false };
      }

      // Parse recipients into array
      const recipientArray = recipients
        .split(/[\n,;]/)
        .map(r => r.trim())
        .filter(Boolean);

      // Open in-app SMS composer
      const result = await SMS.sendSMSAsync(recipientArray, body);

      // result.result can be 'sent', 'cancelled', or 'unknown'
      return {
        success: true,
        sent: result.result === 'sent',
      };
    } catch (error) {
      console.error('Error opening SMS:', error);
      return { success: false, sent: false };
    }
  }

  private calculateRoundStats(round: GolfRound) {
    // Only calculate stats for holes that have been played (strokes > 0)
    const playedHoles = round.holes.filter(hole => hole.strokes > 0);
    
    if (playedHoles.length === 0) {
      return {
        totalScore: 0,
        scoreVsPar: 'E',
        eagles: 0,
        birdies: 0,
        pars: 0,
        bogeys: 0,
        doubleBogeys: 0,
        fairwaysHit: 0,
        greensInRegulation: 0,
        totalPutts: 0,
      };
    }

    const totalPar = playedHoles.reduce((sum, hole) => sum + hole.par, 0);
    const totalStrokes = playedHoles.reduce((sum, hole) => sum + hole.strokes, 0);
    const score = totalStrokes - totalPar;

    let eagles = 0;
    let birdies = 0;
    let pars = 0;
    let bogeys = 0;
    let doubleBogeys = 0;

    playedHoles.forEach(hole => {
      const holeScore = hole.strokes - hole.par;
      if (holeScore <= -2) eagles++;
      else if (holeScore === -1) birdies++;
      else if (holeScore === 0) pars++;
      else if (holeScore === 1) bogeys++;
      else if (holeScore >= 2) doubleBogeys++;
    });

    return {
      totalScore: totalStrokes,
      scoreVsPar: score > 0 ? `+${score}` : score === 0 ? 'E' : score.toString(),
      eagles,
      birdies,
      pars,
      bogeys,
      doubleBogeys,
      fairwaysHit: round.fairwaysHit || 0,
      greensInRegulation: round.greensInRegulation || 0,
      totalPutts: round.totalPutts || 0,
      playedHoles: playedHoles.length,
    };
  }

  private formatMessage(
    round: GolfRound,
    stats: RoundStats,
    aiAnalysis: string,
    mediaItems: MediaItem[]
  ): string {
    const date = round.date.toLocaleDateString();
    const mediaCount = mediaItems.length;

    let message = `Golf Round Update - ${date}\n`;
    message += `📍 ${round.courseName}\n`;
    if (round.tournamentName) {
      message += `🏆 ${round.tournamentName}\n`;
    }
    message += `\n`;
    message += `Score: ${stats.totalScore} (${stats.scoreVsPar})\n`;
    message += `\n`;
    message += `📊 Round Stats:\n`;
    
    if (stats.eagles > 0) message += `🦅 Eagles: ${stats.eagles}\n`;
    if (stats.birdies > 0) message += `🐦 Birdies: ${stats.birdies}\n`;
    message += `✅ Pars: ${stats.pars}\n`;
    if (stats.bogeys > 0) message += `😐 Bogeys: ${stats.bogeys}\n`;
    if (stats.doubleBogeys > 0) message += `😔 Double+: ${stats.doubleBogeys}\n`;
    
    message += `\n`;
    const holesPlayed = stats.playedHoles || round.holes.filter(h => h.strokes > 0).length;
    const par3Count = round.holes.filter(h => h.par === 3 && h.strokes > 0).length;
    const fairwayHoles = Math.max(0, holesPlayed - par3Count);
    
    if (fairwayHoles > 0) {
      message += `🎯 Fairways: ${stats.fairwaysHit}/${fairwayHoles}\n`;
    }
    message += `🟢 GIR: ${stats.greensInRegulation}/${holesPlayed}\n`;
    message += `🏌️ Putts: ${stats.totalPutts}\n`;
    
    if (mediaCount > 0) {
      message += `\n`;
      message += `📸 ${mediaCount} photos/videos captured\n`;
    }

    // Add AI insights (truncated for SMS)
    if (aiAnalysis && aiAnalysis !== 'AI analysis unavailable. Please configure OpenAI API key.') {
      message += `\n`;
      message += `🤖 AI Insights:\n`;
      // Take first 300 characters of AI analysis for SMS
      const truncatedAnalysis = aiAnalysis.substring(0, 300);
      message += truncatedAnalysis;
      if (aiAnalysis.length > 300) {
        message += '...';
      }
    }

    // Add hole-by-hole highlights only for played holes
    const playedHoles = round.holes.filter(hole => hole.strokes > 0);
    
    if (playedHoles.length > 0) {
      const bestHole = playedHoles.reduce((best, hole) => {
        const score = hole.strokes - hole.par;
        const bestScore = best.strokes - best.par;
        return score < bestScore ? hole : best;
      });

      const worstHole = playedHoles.reduce((worst, hole) => {
        const score = hole.strokes - hole.par;
        const worstScore = worst.strokes - worst.par;
        return score > worstScore ? hole : worst;
      });

      message += `\n`;
      message += `🌟 Best Hole: #${bestHole.holeNumber} (${this.getScoreName(bestHole.strokes - bestHole.par)})\n`;
      message += `😅 Tough Hole: #${worstHole.holeNumber} (${this.getScoreName(worstHole.strokes - worstHole.par)})\n`;
    }

    return message;
  }

  private getScoreName(score: number): string {
    if (score <= -3) return 'Albatross';
    if (score === -2) return 'Eagle';
    if (score === -1) return 'Birdie';
    if (score === 0) return 'Par';
    if (score === 1) return 'Bogey';
    if (score === 2) return 'Double Bogey';
    if (score === 3) return 'Triple Bogey';
    return `+${score}`;
  }

  async sendQuickUpdate(
    message: string
  ): Promise<{ success: boolean; sent: boolean; errors: string[]; groupName?: string }> {
    const errors: string[] = [];

    try {
      const recipients = await this.getDefaultRecipients();
      const groupName = await DatabaseService.getPreference('default_sms_group_name') || 'your text group';

      // Open in-app SMS composer
      const result = await this.openSMS(recipients, message);

      if (!result.success) {
        errors.push('Failed to open SMS app');
      }

      return {
        success: result.success,
        sent: result.sent,
        errors,
        groupName,
      };
    } catch (error) {
      return {
        success: false,
        sent: false,
        errors: [`Failed to send message: ${error}`],
      };
    }
  }

  async sendHoleUpdate(
    hole: number,
    score: string,
    notes: string,
  ): Promise<{ success: boolean; sent: boolean; errors: string[]; groupName?: string }> {
    const message = `⛳ Hole ${hole} Update\n🏌️ Score: ${score}\n${notes ? `📝 ${notes}` : ''}`;
    return this.sendQuickUpdate(message);
  }

  async sendHoleSummary(
    hole: GolfHole,
    aiSummary: string,
    mediaCount: { photos: number; videos: number },
    contacts?: Contact[]
  ): Promise<{ success: boolean; sent: boolean; errors: string[]; groupName?: string }> {
    // Create message with AI summary
    let message = `Hole ${hole.holeNumber} Update\n`;
    message += `${aiSummary}\n\n`;
    
    // Add stats
    const diff = hole.strokes - hole.par;
    let scoreText = '';
    if (diff === 0) scoreText = 'Par';
    else if (diff === -3) scoreText = 'Albatross!';
    else if (diff === -2) scoreText = 'Eagle!';
    else if (diff === -1) scoreText = 'Birdie';
    else if (diff === 1) scoreText = 'Bogey';
    else if (diff === 2) scoreText = 'Double Bogey';
    else if (diff === 3) scoreText = 'Triple Bogey';
    else scoreText = diff > 0 ? `+${diff}` : diff.toString();
    
    message += `Score: ${hole.strokes} (${scoreText})\n`;
    
    if (hole.shotData?.putts) {
      message += `Putts: ${hole.shotData.putts.length}\n`;
    }
    
    // Add media info
    const totalMedia = mediaCount.photos + mediaCount.videos;
    if (totalMedia > 0) {
      message += `\n📸 Media: `;
      if (mediaCount.photos > 0) message += `${mediaCount.photos} photo${mediaCount.photos !== 1 ? 's' : ''}`;
      if (mediaCount.photos > 0 && mediaCount.videos > 0) message += ' & ';
      if (mediaCount.videos > 0) message += `${mediaCount.videos} video${mediaCount.videos !== 1 ? 's' : ''}`;
      message += ' attached';
    }
    
    if (contacts && contacts.length > 0) {
      // Use specified contacts
      const phoneNumbers = contacts.map(c => c.phoneNumber).join(',');
      const groupName = 'selected contacts';
      const result = await this.openSMS(phoneNumbers, message);
      return {
        success: result.success,
        sent: result.sent,
        errors: result.success ? [] : ['Failed to open SMS app'],
        groupName,
      };
    }
    
    // Use default recipients
    return this.sendQuickUpdate(message);
  }

  private async getDefaultRecipients(): Promise<string> {
    const raw = await DatabaseService.getPreference('default_sms_group');
    if (!raw) return '';
    
    try {
      // Try to parse as JSON first (new format with names and numbers)
      const contacts: Contact[] = JSON.parse(raw);
      if (Array.isArray(contacts)) {
        // Extract phone numbers from contact objects
        const phoneNumbers = contacts
          .map((c: Contact) => c.phoneNumber)
          .filter(Boolean)
          .join(',');
        console.log(`📱 Loaded ${contacts.length} contacts from JSON: ${contacts.map((c: Contact) => c.name).join(', ')}`);
        return phoneNumbers;
      }
    } catch {
      // Fallback: Parse old format (comma-separated phone numbers only)
      console.log('📱 Using legacy format (numbers only)');
    }
    
    // Normalize separators to commas (legacy format)
    return raw
      .split(/[\n,;]/)
      .map(s => s.trim())
      .filter(Boolean)
      .join(',');
  }
}

export default new SMSService();