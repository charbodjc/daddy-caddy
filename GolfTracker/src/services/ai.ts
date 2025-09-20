import OpenAI from 'openai';
import { GolfRound, GolfHole, Statistics } from '../types';
import Config from 'react-native-config';

class AIService {
  private openai: OpenAI | null = null;

  constructor() {
    // Initialize with API key from environment
    if (Config.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: Config.OPENAI_API_KEY,
      });
    }
  }

  async analyzeRound(round: GolfRound): Promise<string> {
    if (!this.openai) {
      return 'AI analysis unavailable. Please configure OpenAI API key.';
    }

    try {
      const roundSummary = this.generateRoundSummary(round);
      const statistics = this.calculateStatistics([round]);

      const prompt = `
        Analyze this golf round and provide insights and recommendations:
        
        Course: ${round.courseName}
        Date: ${round.date.toLocaleDateString()}
        Total Score: ${round.totalScore || 'N/A'}
        
        Hole-by-hole performance:
        ${roundSummary}
        
        Statistics:
        - Total Putts: ${round.totalPutts || 'N/A'}
        - Fairways Hit: ${round.fairwaysHit || 'N/A'}/14
        - Greens in Regulation: ${round.greensInRegulation || 'N/A'}/18
        
        Please provide:
        1. Overall performance assessment
        2. Strengths identified in this round
        3. Areas for improvement
        4. Specific practice recommendations
        5. Mental game insights based on the scoring pattern
        
        Keep the analysis concise but insightful, focusing on actionable feedback.
      `;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a professional golf coach providing detailed analysis and recommendations based on round statistics.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 500,
        temperature: 0.7,
      });

      return response.choices[0].message.content || 'Unable to generate analysis';
    } catch (error) {
      console.error('AI analysis error:', error);
      return 'Error generating AI analysis. Please try again later.';
    }
  }

  private generateRoundSummary(round: GolfRound): string {
    return round.holes
      .map((hole) => {
        const score = hole.strokes - hole.par;
        let scoreText = '';
        if (score === -2) scoreText = 'Eagle';
        else if (score === -1) scoreText = 'Birdie';
        else if (score === 0) scoreText = 'Par';
        else if (score === 1) scoreText = 'Bogey';
        else if (score === 2) scoreText = 'Double Bogey';
        else if (score > 2) scoreText = `+${score}`;

        return `Hole ${hole.holeNumber}: ${scoreText} (${hole.strokes} strokes on par ${hole.par})${
          hole.notes ? ` - ${hole.notes}` : ''
        }`;
      })
      .join('\n');
  }

  calculateStatistics(rounds: GolfRound[]): Statistics {
    if (rounds.length === 0) {
      return {
        averageScore: 0,
        averagePutts: 0,
        fairwayAccuracy: 0,
        girPercentage: 0,
        bestRound: 0,
        worstRound: 0,
        totalRounds: 0,
        eaglesOrBetter: 0,
        birdies: 0,
        pars: 0,
        bogeys: 0,
        doubleBogeyOrWorse: 0,
      };
    }

    let totalScore = 0;
    let totalPutts = 0;
    let totalFairways = 0;
    let totalGIR = 0;
    let bestRound = Infinity;
    let worstRound = -Infinity;
    let eaglesOrBetter = 0;
    let birdies = 0;
    let pars = 0;
    let bogeys = 0;
    let doubleBogeyOrWorse = 0;

    rounds.forEach((round) => {
      if (round.totalScore) {
        totalScore += round.totalScore;
        bestRound = Math.min(bestRound, round.totalScore);
        worstRound = Math.max(worstRound, round.totalScore);
      }
      if (round.totalPutts) totalPutts += round.totalPutts;
      if (round.fairwaysHit) totalFairways += round.fairwaysHit;
      if (round.greensInRegulation) totalGIR += round.greensInRegulation;

      round.holes.forEach((hole) => {
        const score = hole.strokes - hole.par;
        if (score <= -2) eaglesOrBetter++;
        else if (score === -1) birdies++;
        else if (score === 0) pars++;
        else if (score === 1) bogeys++;
        else if (score >= 2) doubleBogeyOrWorse++;
      });
    });

    return {
      averageScore: totalScore / rounds.length,
      averagePutts: totalPutts / rounds.length,
      fairwayAccuracy: (totalFairways / (rounds.length * 14)) * 100,
      girPercentage: (totalGIR / (rounds.length * 18)) * 100,
      bestRound: bestRound === Infinity ? 0 : bestRound,
      worstRound: worstRound === -Infinity ? 0 : worstRound,
      totalRounds: rounds.length,
      eaglesOrBetter,
      birdies,
      pars,
      bogeys,
      doubleBogeyOrWorse,
    };
  }

  async generateShotRecommendation(
    holeNumber: number,
    par: number,
    distance?: number,
    conditions?: string
  ): Promise<string> {
    if (!this.openai) {
      return 'Shot recommendations unavailable.';
    }

    try {
      const prompt = `
        Provide a brief shot strategy for:
        Hole ${holeNumber}, Par ${par}
        ${distance ? `Distance: ${distance} yards` : ''}
        ${conditions ? `Conditions: ${conditions}` : ''}
        
        Give a concise recommendation (2-3 sentences) for club selection and shot strategy.
      `;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a golf caddie providing strategic advice.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 100,
        temperature: 0.7,
      });

      return response.choices[0].message.content || 'Unable to generate recommendation';
    } catch (error) {
      console.error('Shot recommendation error:', error);
      return 'Unable to generate recommendation';
    }
  }
}

export default new AIService();
