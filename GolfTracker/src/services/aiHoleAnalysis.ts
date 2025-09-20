import OpenAI from 'openai';
import { GolfHole, HoleShotData, MediaItem } from '../types';
import Config from 'react-native-config';

class AIHoleAnalysisService {
  private openai: OpenAI | null = null;

  constructor() {
    if (Config.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: Config.OPENAI_API_KEY,
      });
    }
  }

  async analyzeHoleWithMedia(
    hole: GolfHole,
    mediaItems: MediaItem[]
  ): Promise<string> {
    if (!this.openai) {
      return this.generateBasicSummary(hole, mediaItems);
    }

    try {
      const shotNarrative = this.buildShotNarrative(hole);
      const mediaDescription = this.describeMedia(mediaItems);
      const performanceAnalysis = this.analyzePerformance(hole);

      const prompt = `
        Analyze this golf hole and create an engaging, conversational summary suitable for sharing with friends via text message.
        
        Hole ${hole.holeNumber} - Par ${hole.par}
        Score: ${hole.strokes} strokes (${this.getScoreName(hole)})
        
        Shot Sequence:
        ${shotNarrative}
        
        Performance Details:
        ${performanceAnalysis}
        
        Media Captured:
        ${mediaDescription}
        
        ${hole.notes ? `Personal Notes: ${hole.notes}` : ''}
        
        Create a brief, engaging summary (2-3 sentences) that:
        1. Tells the story of the hole in a conversational, exciting way
        2. Highlights any notable shots or moments
        3. Mentions if photos/videos were captured of key moments
        4. Includes any drama, success, or learning moments
        5. Uses golf terminology naturally but keeps it accessible
        6. Adds appropriate emojis for social sharing
        
        Keep it under 200 characters for SMS friendliness.
      `;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a golf buddy sharing exciting updates from the course. Be enthusiastic, use golf slang appropriately, and keep messages brief and engaging.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 150,
        temperature: 0.8,
      });

      return response.choices[0].message.content || this.generateBasicSummary(hole, mediaItems);
    } catch (error) {
      console.error('AI analysis error:', error);
      return this.generateBasicSummary(hole, mediaItems);
    }
  }

  private buildShotNarrative(hole: GolfHole): string {
    if (!hole.shotData) {
      return `Completed in ${hole.strokes} strokes`;
    }

    const shots: string[] = [];
    const data = hole.shotData;

    // Tee shot
    if (data.teeShot) {
      if (hole.par === 3) {
        shots.push(`Tee shot: ${data.teeShot}`);
      } else {
        shots.push(`Drive: ${data.teeShot}`);
      }
    }

    // Approach
    if (data.approach) {
      shots.push(`Approach: ${data.approach}`);
    }

    // Short game
    if (data.chip) {
      shots.push(`Chip: ${data.chip}`);
    }

    // Bunker shots
    if (data.greensideBunker) {
      shots.push(`Greenside bunker: ${data.greensideBunker}`);
    }
    if (data.fairwayBunker) {
      shots.push(`Fairway bunker: ${data.fairwayBunker}`);
    }

    // Trouble shot
    if (data.troubleShot) {
      shots.push(`Recovery: ${data.troubleShot}`);
    }

    // Putting
    if (data.putts && data.putts.length > 0) {
      const puttCount = data.putts.length;
      const puttDetails = data.putts.join(', ');
      if (puttCount === 1) {
        shots.push(`One putt: ${puttDetails}`);
      } else {
        shots.push(`${puttCount} putts: ${puttDetails}`);
      }
    }

    return shots.join('\n');
  }

  private analyzePerformance(hole: GolfHole): string {
    const analysis: string[] = [];
    const score = hole.strokes - hole.par;

    // Score analysis
    if (score <= -2) {
      analysis.push('Outstanding hole! Eagle or better');
    } else if (score === -1) {
      analysis.push('Great birdie');
    } else if (score === 0) {
      analysis.push('Solid par');
    } else if (score === 1) {
      analysis.push('Bogey - room for improvement');
    } else {
      analysis.push('Challenging hole');
    }

    // Shot analysis
    if (hole.shotData) {
      if (hole.par > 3 && hole.shotData.teeShot === 'Fairway') {
        analysis.push('Fairway hit off the tee');
      }
      if (hole.greenInRegulation) {
        analysis.push('Green in regulation');
      }
      if (hole.shotData.putts && hole.shotData.putts.length === 1) {
        analysis.push('One-putt finish!');
      }
    }

    // Stats
    if (hole.putts) {
      analysis.push(`${hole.putts} putt${hole.putts !== 1 ? 's' : ''}`);
    }

    return analysis.join('. ');
  }

  private describeMedia(mediaItems: MediaItem[]): string {
    if (mediaItems.length === 0) {
      return 'No media captured';
    }

    const photos = mediaItems.filter(m => m.type === 'photo').length;
    const videos = mediaItems.filter(m => m.type === 'video').length;

    const parts: string[] = [];
    if (photos > 0) {
      parts.push(`${photos} photo${photos !== 1 ? 's' : ''}`);
    }
    if (videos > 0) {
      parts.push(`${videos} video${videos !== 1 ? 's' : ''}`);
    }

    return `Captured ${parts.join(' and ')} showing key moments`;
  }

  private getScoreName(hole: GolfHole): string {
    const score = hole.strokes - hole.par;
    if (score <= -3) return 'Albatross! 🦅🦅';
    if (score === -2) return 'Eagle! 🦅';
    if (score === -1) return 'Birdie 🐦';
    if (score === 0) return 'Par ✅';
    if (score === 1) return 'Bogey';
    if (score === 2) return 'Double Bogey';
    if (score === 3) return 'Triple Bogey';
    return `+${score}`;
  }

  generateBasicSummary(hole: GolfHole, mediaItems: MediaItem[]): string {
    const score = this.getScoreName(hole);
    const mediaCount = mediaItems.length;
    
    let summary = `Hole ${hole.holeNumber}: ${score} `;
    
    if (hole.shotData) {
      const data = hole.shotData;
      
      // Add key shot details
      if (hole.par > 3 && data.teeShot === 'Fairway') {
        summary += '⛳ Fairway hit! ';
      } else if (hole.par === 3 && data.teeShot === 'On Green') {
        summary += '🎯 Green in one! ';
      }
      
      if (hole.greenInRegulation) {
        summary += '🟢 GIR ';
      }
      
      if (data.putts && data.putts.length === 1) {
        summary += '🏌️ One-putt! ';
      } else if (data.putts && data.putts.length > 2) {
        summary += `${data.putts.length} putts `;
      }
      
      // Add drama
      if (data.greensideBunker || data.fairwayBunker) {
        summary += '🏖️ Sand save ';
      }
      
      if (data.troubleShot) {
        summary += '💪 Great recovery ';
      }
    }
    
    if (mediaCount > 0) {
      summary += `📸 ${mediaCount} ${mediaCount === 1 ? 'shot' : 'shots'} captured`;
    }
    
    return summary.trim();
  }

  async generateMediaAnalysisPrompt(mediaItems: MediaItem[]): Promise<string> {
    // This would be enhanced with actual image analysis if using Vision API
    const photos = mediaItems.filter(m => m.type === 'photo');
    const videos = mediaItems.filter(m => m.type === 'video');
    
    let analysis = '';
    
    if (photos.length > 0) {
      analysis += `📸 ${photos.length} photo${photos.length !== 1 ? 's' : ''} showing`;
      if (photos.some(p => p.description?.includes('swing'))) {
        analysis += ' swing sequence';
      }
      if (photos.some(p => p.description?.includes('green'))) {
        analysis += ' approach to green';
      }
      if (photos.some(p => p.description?.includes('celebration'))) {
        analysis += ' celebration moment';
      }
    }
    
    if (videos.length > 0) {
      if (analysis) analysis += ' and ';
      analysis += `🎥 ${videos.length} video${videos.length !== 1 ? 's' : ''} capturing`;
      if (videos.some(v => v.description?.includes('swing'))) {
        analysis += ' full swing';
      }
      if (videos.some(v => v.description?.includes('putt'))) {
        analysis += ' putting stroke';
      }
    }
    
    return analysis || 'Visual moments from the hole';
  }
}

export default AIHoleAnalysisService;
