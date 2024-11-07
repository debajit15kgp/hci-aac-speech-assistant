export class TextPredictor {
    private lastSpokenIndex: number;
    private wordsPerMinute: number;
  
    constructor(wordsPerMinute: number = 30) {
      this.lastSpokenIndex = -1;
      this.wordsPerMinute = wordsPerMinute;
    }
  
    public getWords(text: string): string[] {
      return text.match(/\S+/g) || [];
    }
  
    public getNewWords(text: string): string | null {
      const words = this.getWords(text);
      if (words.length <= this.lastSpokenIndex + 1) return null;
  
      const newWords = words.slice(this.lastSpokenIndex + 1);
      this.lastSpokenIndex = words.length - 1;
      
      return newWords.join(' ');
    }
  
    public reset(): void {
      this.lastSpokenIndex = -1;
    }
  
    public shouldStartSpeaking(currentWords: number, totalWords: number): boolean {
      if (currentWords === 0) return false;
      if (currentWords >= totalWords) return true;
      
      // Start speaking when we're about 25% through typing
      return currentWords >= Math.floor(totalWords * 0.25);
    }
  }