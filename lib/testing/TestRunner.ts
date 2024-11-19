import { AACTestAgent } from './AACTestAgent';
import { Metrics, TestConfig, ExperimentResult } from './types';

export class TestRunner {
  private testTexts: string[];
  private conditions: Array<{name: string; config: TestConfig}>;

  constructor() {
    this.testTexts = [
      "I would like a glass of water please",
      "Can you help me find my phone"
    ];

    this.conditions = [
      {
        name: "Baseline (No Prediction)",
        config: {
          typingSpeed: 20,
          errorRate: 0.1,
          predictionAcceptanceRate: 0
        }
      },
      {
        name: "Word Prediction",
        config: {
          typingSpeed: 20,
          errorRate: 0.1,
          predictionAcceptanceRate: 0.4
        }
      },
      {
        name: "Sentence Prediction",
        config: {
          typingSpeed: 20,
          errorRate: 0.1,
          predictionAcceptanceRate: 0.6
        }
      }
    ];
  }

  async runExperiment(iterations: number = 3): Promise<ExperimentResult[]> {
    const results: ExperimentResult[] = [];

    for (const condition of this.conditions) {
      console.log(`\nTesting: ${condition.name}`);
      const conditionMetrics: Metrics[] = [];

      for (let i = 0; i < iterations; i++) {
        console.log(`Iteration ${i + 1}/${iterations}`);
        const agent = new AACTestAgent(condition.config);
        
        for (const text of this.testTexts) {
          const metrics = await agent.simulateTyping(text);
          conditionMetrics.push(metrics);
        }
      }

      results.push({
        condition: condition.name,
        averageMetrics: this.calculateAverageMetrics(conditionMetrics),
        standardDeviation: this.calculateStandardDeviation(conditionMetrics)
      });
    }

    return results;
  }

  private calculateAverageMetrics(metrics: Metrics[]): Metrics {
    return metrics.reduce((acc, curr) => ({
      wpm: acc.wpm + curr.wpm / metrics.length,
      accuracy: acc.accuracy + curr.accuracy / metrics.length,
      predictionAcceptanceRate: acc.predictionAcceptanceRate + curr.predictionAcceptanceRate / metrics.length,
      timeToComplete: acc.timeToComplete + curr.timeToComplete / metrics.length,
      keystrokes: acc.keystrokes + curr.keystrokes / metrics.length,
      keystrokesSaved: acc.keystrokesSaved + curr.keystrokesSaved / metrics.length,
      predictionsOffered: acc.predictionsOffered + curr.predictionsOffered / metrics.length,
      predictionsAccepted: acc.predictionsAccepted + curr.predictionsAccepted / metrics.length,
      errorRate: acc.errorRate + curr.errorRate / metrics.length,
      corrections: acc.corrections + curr.corrections / metrics.length
    }), this.initializeMetrics());
  }

  private calculateStandardDeviation(metrics: Metrics[]): {wpm: number; accuracy: number; timeToComplete: number} {
    const avg = this.calculateAverageMetrics(metrics);
    return {
      wpm: this.stdDev(metrics.map(m => m.wpm), avg.wpm),
      accuracy: this.stdDev(metrics.map(m => m.accuracy), avg.accuracy),
      timeToComplete: this.stdDev(metrics.map(m => m.timeToComplete), avg.timeToComplete)
    };
  }

  private stdDev(values: number[], mean: number): number {
    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
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
}