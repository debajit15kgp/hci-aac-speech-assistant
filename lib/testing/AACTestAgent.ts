import { EventEmitter } from 'events';
import { Metrics, TestConfig } from './types';

interface TypingError {
  intended: string;
  actual: string;
  position: number;
}

export class AACTestAgent extends EventEmitter {
  private metrics: Metrics;
  private config: TestConfig;
  private typingErrors: TypingError[] = [];
  
  // Keyboard layout for realistic typos
  private nearbyKeys: { [key: string]: string[] } = {
    'a': ['q', 'w', 's', 'z'],
    's': ['a', 'w', 'd', 'x'],
    'd': ['s', 'e', 'f', 'c'],
    'f': ['d', 'r', 'g', 'v'],
    'g': ['f', 't', 'h', 'b'],
    'h': ['g', 'y', 'j', 'n'],
    'i': ['u', 'o', 'k', 'l'],
    'j': ['h', 'u', 'k', 'm'],
    'k': ['j', 'i', 'l'],
    'l': ['k', 'o', 'p'],
    'm': ['n', 'j', 'k'],
    'n': ['b', 'h', 'j', 'm'],
    'o': ['i', 'p', 'l'],
    'p': ['o', 'l'],
    'q': ['w', 'a', '1'],
    'r': ['e', 'f', 't'],
    't': ['r', 'g', 'y'],
    'u': ['y', 'j', 'i'],
    'v': ['c', 'f', 'g'],
    'w': ['q', 's', 'e'],
    'x': ['z', 's', 'd'],
    'y': ['t', 'h', 'u'],
    'z': ['a', 's', 'x']
  };

  constructor(config: TestConfig) {
    super();
    this.config = config;
    this.metrics = this.initializeMetrics();
  }

  private initializeMetrics(): Metrics {
    return {
      wpm: 0,
      accuracy: 0,
      predictionAcceptanceRate: 0,
      timeToComplete: 0,
      keystrokes: 0,
      keystrokesSaved: 0,
      predictionsOffered: 0,
      predictionsAccepted: 0,
      errorRate: 0,
      corrections: 0
    };
  }

  private getTypingMistake(intendedChar: string): string {
    const char = intendedChar.toLowerCase();
    if (this.nearbyKeys[char]) {
      const nearby = this.nearbyKeys[char];
      return nearby[Math.floor(Math.random() * nearby.length)];
    }
    return intendedChar; // If no nearby keys defined, return original
  }

  private calculateAccuracy(totalCharacters: number): number {
    const errorCount = this.typingErrors.length;
    return Math.max(0, (totalCharacters - errorCount) / totalCharacters);
  }

  async simulateTyping(text: string): Promise<Metrics> {
    const startTime = Date.now();
    const words = text.split(' ');
    let totalCharacters = 0;
    let typedText = '';
    this.typingErrors = [];

    // Calculate realistic typing time based on WPM
    const msPerChar = 60000 / (this.config.typingSpeed * 5);

    for (const word of words) {
      // Simulate typing each character
      for (const intendedChar of word) {
        totalCharacters++;
        this.metrics.keystrokes++;

        // Simulate potential typing error
        if (Math.random() < this.config.errorRate) {
          const actualChar = this.getTypingMistake(intendedChar);
          typedText += actualChar;
          
          if (actualChar !== intendedChar) {
            this.typingErrors.push({
              intended: intendedChar,
              actual: actualChar,
              position: totalCharacters - 1
            });

            // Simulate correction (backspace and retype)
            if (Math.random() < 0.7) { // 70% chance to correct error
              this.metrics.corrections++;
              this.metrics.keystrokes += 2; // Backspace and retype
              typedText = typedText.slice(0, -1) + intendedChar;
              await new Promise(resolve => setTimeout(resolve, msPerChar * 2)); // Extra time for correction
            }
          }
        } else {
          typedText += intendedChar;
        }

        await new Promise(resolve => setTimeout(resolve, msPerChar));
      }
      
      // Add space between words
      totalCharacters++;
      this.metrics.keystrokes++;
      typedText += ' ';
      await new Promise(resolve => setTimeout(resolve, msPerChar));
      
      // Handle word prediction
      if (words.indexOf(word) >= 3) {
        this.metrics.predictionsOffered++;
        if (Math.random() < this.config.predictionAcceptanceRate) {
          this.metrics.predictionsAccepted++;
          this.metrics.keystrokesSaved += word.length;
        }
      }
    }

    const elapsedTime = Date.now() - startTime;
    const elapsedMinutes = elapsedTime / 60000;
    const accuracy = this.calculateAccuracy(totalCharacters);

    return {
      ...this.metrics,
      wpm: words.length / elapsedMinutes,
      accuracy: accuracy,
      timeToComplete: elapsedTime,
      predictionAcceptanceRate: this.metrics.predictionsAccepted / this.metrics.predictionsOffered || 0,
      errorRate: this.typingErrors.length / totalCharacters
    };
  }

  // Method to get detailed error analysis if needed
  getTypingErrorDetails(): TypingError[] {
    return this.typingErrors;
  }
}