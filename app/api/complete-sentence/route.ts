import { NextResponse } from 'next/server';
import { pipeline } from '@xenova/transformers';

// Use a singleton pattern to maintain the model instance
let generator: any = null;

async function initializeGenerator() {
  if (!generator) {
    console.log('Initializing text generation model...');
    // Using a small model suitable for text generation
    generator = await pipeline('text-generation', 'Xenova/LaMini-Flan-T5-77M', {
      quantized: true // Use quantized model for better performance
    });
    console.log('Model initialized');
  }
  return generator;
}

export async function POST(req: Request) {
  try {
    console.log('Received completion request');
    const body = await req.json();
    const { text, targetWords = 0 } = body;

    // Create an appropriate prompt based on target words
    const prompt = targetWords > 0 
      ? `Complete this sentence naturally in about ${targetWords} total words: ${text}`
      : `Complete this sentence naturally: ${text}`;

    console.log('Getting model...');
    const model = await initializeGenerator();
    
    console.log('Generating completion...');
    const result = await model(prompt, {
      max_new_tokens: 50,
      temperature: 0.7,
      repetition_penalty: 1.1,
      num_beams: 4,
      no_repeat_ngram_size: 3
    });

    let suggestion = '';
    if (result && result[0]?.generated_text) {
      // Extract just the completion part, removing the input prompt
      suggestion = result[0].generated_text
        .slice(prompt.length)
        .split('.')
        .shift()
        ?.trim() || '';
    }

    console.log('Completion generated:', suggestion);
    return NextResponse.json({ completion: suggestion });
  } catch (error) {
    console.error('Sentence completion error:', error);
    return NextResponse.json(
      { error: 'Failed to complete sentence' },
      { status: 500 }
    );
  }
}