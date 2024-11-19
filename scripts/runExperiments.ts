import { TestRunner } from '../lib/testing/TestRunner';

async function runExperiments(): Promise<void> {
  const runner = new TestRunner();
  console.log('Starting AAC experiments...');
  
  try {
    const results = await runner.runExperiment(3);
    
    console.log('\nResults Summary:');
    results.forEach(result => {
      console.log(`\n${result.condition}:`);
      console.log(`WPM: ${result.averageMetrics.wpm.toFixed(2)} (±${result.standardDeviation.wpm.toFixed(2)})`);
      console.log(`Accuracy: ${(result.averageMetrics.accuracy * 100).toFixed(1)}%`);
      console.log(`Prediction Usage: ${(result.averageMetrics.predictionAcceptanceRate * 100).toFixed(1)}%`);
      console.log(`Keystrokes Saved: ${result.averageMetrics.keystrokesSaved.toFixed(0)}`);
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

runExperiments();