import { Linking, Platform } from 'react-native';
import { GolfRound, Contact, MediaItem } from '../types';
import AIService from './ai';

class SMSService {
  async sendRoundSummary(
    round: GolfRound,
    contacts: Contact[],
    mediaItems: MediaItem[]
  ): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      // Generate AI analysis
      const aiAnalysis = await AIService.analyzeRound(round);
      
      // Calculate statistics
      const stats = this.calculateRoundStats(round);
      
      // Create message content
      const message = this.formatMessage(round, stats, aiAnalysis, mediaItems);

      // Create recipients string
      const recipients = contacts.map(c => c.phoneNumber).join(',');

      // Open native SMS app with pre-filled message
      const success = await this.openSMS(recipients, message);

      if (!success) {
        errors.push('Failed to open SMS app');
      }

      return {
        success,
        errors,
      };
    } catch (error) {
      return {
        success: false,
        errors: [`Failed to prepare message: ${error}`],
      };
    }
  }

  private async openSMS(recipients: string, body: string): Promise<boolean> {
    try {
      const separator = Platform.OS === 'ios' ? '&' : '?';
      const url = Platform.OS === 'ios' 
        ? `sms:${recipients}${separator}body=${encodeURIComponent(body)}`
        : `sms:${recipients}${separator}body=${encodeURIComponent(body)}`;

      const canOpen = await Linking.canOpenURL(url);
      
      if (canOpen) {
        await Linking.openURL(url);
        return true;
      } else {
        console.warn('SMS app is not available');
        return false;
      }
    } catch (error) {
      console.error('Error opening SMS:', error);
      return false;
    }
  }

  private calculateRoundStats(round: GolfRound) {
    const totalPar = round.holes.reduce((sum, hole) => sum + hole.par, 0);
    const totalStrokes = round.holes.reduce((sum, hole) => sum + hole.strokes, 0);
    const score = totalStrokes - totalPar;

    let eagles = 0;
    let birdies = 0;
    let pars = 0;
    let bogeys = 0;
    let doubleBogeys = 0;

    round.holes.forEach(hole => {
      const holeScore = hole.strokes - hole.par;
      if (holeScore <= -2) eagles++;
      else if (holeScore === -1) birdies++;
      else if (holeScore === 0) pars++;
      else if (holeScore === 1) bogeys++;
      else if (holeScore >= 2) doubleBogeys++;
    });

    return {
      totalScore: totalStrokes,
      scoreVsPar: score > 0 ? `+${score}` : score.toString(),
      eagles,
      birdies,
      pars,
      bogeys,
      doubleBogeys,
      fairwaysHit: round.fairwaysHit || 0,
      greensInRegulation: round.greensInRegulation || 0,
      totalPutts: round.totalPutts || 0,
    };
  }

  private formatMessage(
    round: GolfRound,
    stats: any,
    aiAnalysis: string,
    mediaItems: MediaItem[]
  ): string {
    const date = round.date.toLocaleDateString();
    const mediaCount = mediaItems.length;

    let message = `🏌️ Golf Round Update - ${date}\n`;
    message += `📍 ${round.courseName}\n`;
    if (round.tournamentName) {
      message += `🏆 ${round.tournamentName}\n`;
    }
    message += `\n`;
    message += `⛳ Score: ${stats.totalScore} (${stats.scoreVsPar})\n`;
    message += `\n`;
    message += `📊 Round Stats:\n`;
    
    if (stats.eagles > 0) message += `🦅 Eagles: ${stats.eagles}\n`;
    if (stats.birdies > 0) message += `🐦 Birdies: ${stats.birdies}\n`;
    message += `✅ Pars: ${stats.pars}\n`;
    if (stats.bogeys > 0) message += `😐 Bogeys: ${stats.bogeys}\n`;
    if (stats.doubleBogeys > 0) message += `😔 Double+: ${stats.doubleBogeys}\n`;
    
    message += `\n`;
    message += `🎯 Fairways: ${stats.fairwaysHit}/14\n`;
    message += `🟢 GIR: ${stats.greensInRegulation}/18\n`;
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

    // Add hole-by-hole highlights
    const bestHole = round.holes.reduce((best, hole) => {
      const score = hole.strokes - hole.par;
      const bestScore = best.strokes - best.par;
      return score < bestScore ? hole : best;
    });

    const worstHole = round.holes.reduce((worst, hole) => {
      const score = hole.strokes - hole.par;
      const worstScore = worst.strokes - worst.par;
      return score > worstScore ? hole : worst;
    });

    message += `\n`;
    message += `🌟 Best Hole: #${bestHole.holeNumber} (${this.getScoreName(bestHole.strokes - bestHole.par)})\n`;
    message += `😅 Tough Hole: #${worstHole.holeNumber} (${this.getScoreName(worstHole.strokes - worstHole.par)})\n`;

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
    message: string,
    contacts: Contact[]
  ): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      // Create recipients string
      const recipients = contacts.map(c => c.phoneNumber).join(',');

      // Open native SMS app with pre-filled message
      const success = await this.openSMS(recipients, message);

      if (!success) {
        errors.push('Failed to open SMS app');
      }

      return {
        success,
        errors,
      };
    } catch (error) {
      return {
        success: false,
        errors: [`Failed to send message: ${error}`],
      };
    }
  }

  async sendHoleUpdate(
    hole: number,
    score: string,
    notes: string,
    contacts: Contact[]
  ): Promise<{ success: boolean; errors: string[] }> {
    const message = `⛳ Hole ${hole} Update\n🏌️ Score: ${score}\n${notes ? `📝 ${notes}` : ''}`;
    return this.sendQuickUpdate(message, contacts);
  }
}

export default new SMSService();