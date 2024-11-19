export interface Metrics {
    wpm: number;
    accuracy: number;
    predictionAcceptanceRate: number;
    timeToComplete: number;
    keystrokes: number;
    keystrokesSaved: number;
    predictionsOffered: number;
    predictionsAccepted: number;
    errorRate: number;
    corrections: number;
  }
  
  export interface TestConfig {
    typingSpeed: number;
    errorRate: number;
    predictionAcceptanceRate: number;
  }
  
  export interface ExperimentResult {
    condition: string;
    averageMetrics: Metrics;
    standardDeviation: {
      wpm: number;
      accuracy: number;
      timeToComplete: number;
    };
  }