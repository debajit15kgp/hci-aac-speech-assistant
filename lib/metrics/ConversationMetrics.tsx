export interface ConversationMetrics {
    typingToSpeechLatency: number;      // Time between typing and speech start
    averageWordDelay: number;           // Average delay between words
    conversationFlowScore: number;      // 0-1 score of natural flow
    typingSpeechOverlapRate: number;    // How often typing/speaking overlap
    predictiveAccuracy: number;         // How accurate predictions were
    interactionSpeed: number;           // Effective WPM
    predictionAcceptanceRate: number;   // How often predictions were used
    correctionRate: number;             // How often corrections were needed
    completionEfficiency: number;       // How much effort was saved
  }
  
  interface TimingData {
    typingStart: number;
    speechStart?: number;
    completed?: boolean;
  }
  
  export class ConversationAnalyzer {
    private startTime: number;
    private wordTimings: Map<string, TimingData>;
    private predictionsOffered: number;
    private predictionsAccepted: number;
    private correctPredictions: number;
    private totalWords: number;
    private corrections: number;
  
    constructor() {
      this.startTime = Date.now();
      this.wordTimings = new Map();
      this.predictionsOffered = 0;
      this.predictionsAccepted = 0;
      this.correctPredictions = 0;
      this.totalWords = 0;
      this.corrections = 0;
    }
  
    recordWordTypingStart(word: string) {
      if (!this.wordTimings.has(word)) {
        this.wordTimings.set(word, {
          typingStart: Date.now()
        });
        this.totalWords++;
      }
    }
  
    recordWordSpeechStart(word: string) {
      const timing = this.wordTimings.get(word);
      if (timing) {
        timing.speechStart = Date.now();
        timing.completed = true;
        this.wordTimings.set(word, timing);
      } else {
        // Handle case where speech starts without typing record
        this.wordTimings.set(word, {
          typingStart: Date.now(),
          speechStart: Date.now(),
          completed: true
        });
        this.totalWords++;
      }
    }
  
    recordPrediction(wasAccepted: boolean, wasCorrect: boolean) {
      this.predictionsOffered++;
      if (wasAccepted) {
        this.predictionsAccepted++;
        if (wasCorrect) {
          this.correctPredictions++;
        }
      }
    }
  
    recordCorrection() {
      this.corrections++;
    }
  
    calculateMetrics(): ConversationMetrics {
      const completedWords = Array.from(this.wordTimings.values())
        .filter(timing => timing.completed);
  
      // Calculate latency between typing and speech
      const latencies = completedWords
        .filter(timing => timing.speechStart)
        .map(timing => (timing.speechStart || 0) - timing.typingStart);
      
      const avgLatency = latencies.length > 0
        ? latencies.reduce((a, b) => a + b, 0) / latencies.length
        : 0;
  
      // Calculate delays between words
      const wordDelays: number[] = [];
      const timings = Array.from(this.wordTimings.entries())
        .sort((a, b) => a[1].typingStart - b[1].typingStart);
  
      for (let i = 1; i < timings.length; i++) {
        const prevWord = timings[i-1][1];
        const currentWord = timings[i][1];
        if (prevWord.speechStart && currentWord.speechStart) {
          wordDelays.push(currentWord.speechStart - prevWord.speechStart);
        }
      }
  
      const avgWordDelay = wordDelays.length > 0
        ? wordDelays.reduce((a, b) => a + b, 0) / wordDelays.length
        : 0;
  
      // Calculate overlap rate
      const overlappingWords = completedWords.filter(timing => {
        const nextWord = Array.from(this.wordTimings.values())
          .find(t => t.typingStart > timing.typingStart && t.typingStart < (timing.speechStart || 0));
        return nextWord !== undefined;
      });
  
      const overlapRate = completedWords.length > 0
        ? overlappingWords.length / completedWords.length
        : 0;
  
      // Calculate WPM
      const totalTimeMinutes = (Date.now() - this.startTime) / 60000;
      const effectiveWPM = this.totalWords / totalTimeMinutes;
  
      // Calculate prediction metrics
      const predAcceptanceRate = this.predictionsOffered > 0
        ? this.predictionsAccepted / this.predictionsOffered
        : 0;
  
      const predAccuracy = this.predictionsAccepted > 0
        ? this.correctPredictions / this.predictionsAccepted
        : 0;
  
      // Calculate correction rate
      const correctionRate = this.totalWords > 0
        ? this.corrections / this.totalWords
        : 0;
  
      // Calculate conversation flow score
      const flowScore = Math.min(1, Math.max(0,
        1 - (avgLatency / 2000) +        // Lower latency is better
        (overlapRate * 0.5) +            // More overlap is better
        (predAcceptanceRate * 0.3) -     // More prediction use is better
        (correctionRate * 0.2)           // Fewer corrections is better
      ));
  
      // Calculate completion efficiency
      const completionEfficiency = Math.min(1, Math.max(0,
        (this.predictionsAccepted * 5) / (this.totalWords * 7) + // Assume average word length of 7
        (overlapRate * 0.3) +
        ((1 - correctionRate) * 0.2)
      ));
  
      return {
        typingToSpeechLatency: avgLatency,
        averageWordDelay: avgWordDelay,
        conversationFlowScore: flowScore,
        typingSpeechOverlapRate: overlapRate,
        predictiveAccuracy: predAccuracy,
        interactionSpeed: effectiveWPM,
        predictionAcceptanceRate: predAcceptanceRate,
        correctionRate: correctionRate,
        completionEfficiency: completionEfficiency
      };
    }
  
    // Helper method to get detailed breakdown
    getDetailedReport(): string {
      const metrics = this.calculateMetrics();
      return `
  Conversation Analysis Report
  --------------------------
  Total Words: ${this.totalWords}
  Elapsed Time: ${((Date.now() - this.startTime) / 1000).toFixed(1)}s
  
  Timing Metrics:
  - Average Typing to Speech Delay: ${metrics.typingToSpeechLatency.toFixed(0)}ms
  - Average Delay Between Words: ${metrics.averageWordDelay.toFixed(0)}ms
  - Speech-Typing Overlap Rate: ${(metrics.typingSpeechOverlapRate * 100).toFixed(1)}%
  
  Prediction Performance:
  - Predictions Offered: ${this.predictionsOffered}
  - Predictions Accepted: ${this.predictionsAccepted}
  - Prediction Accuracy: ${(metrics.predictiveAccuracy * 100).toFixed(1)}%
  - Acceptance Rate: ${(metrics.predictionAcceptanceRate * 100).toFixed(1)}%
  
  Efficiency Metrics:
  - Interaction Speed: ${metrics.interactionSpeed.toFixed(1)} WPM
  - Error Rate: ${(metrics.correctionRate * 100).toFixed(1)}%
  - Completion Efficiency: ${(metrics.completionEfficiency * 100).toFixed(1)}%
  
  Overall Flow Score: ${(metrics.conversationFlowScore * 100).toFixed(1)}%
      `;
    }
  }