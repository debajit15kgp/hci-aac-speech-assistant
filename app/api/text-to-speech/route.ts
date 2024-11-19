import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { NextResponse } from 'next/server';

// Add logging for initialization
console.log('API Route: Checking credentials...');
console.log('Project ID:', process.env.GOOGLE_PROJECT_ID);
console.log('Client Email:', process.env.GOOGLE_CLIENT_EMAIL);
console.log('Private Key exists:', !!process.env.GOOGLE_PRIVATE_KEY);

const client = new TextToSpeechClient({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  projectId: process.env.GOOGLE_PROJECT_ID,
});

export async function POST(req: Request) {
  try {
    // console.log('API Route: Received request');
    const body = await req.json();
    // console.log('Request body:', body);

    const { text, voice, pitch, speakingRate } = body;

    // Validate input
    if (!text) {
      console.error('API Route: No text provided');
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    // console.log('API Route: Sending request to Google Cloud', {
    //   text,
    //   voice,
    //   pitch,
    //   speakingRate,
    // });

    const [response] = await client.synthesizeSpeech({
      input: { text },
      voice: {
        name: voice,
        languageCode: 'en-US',
      },
      audioConfig: {
        audioEncoding: 'MP3',
        pitch: pitch,
        speakingRate: speakingRate,
      },
    });

    console.log('API Route: Received response from Google Cloud');
    console.log('Audio content exists:', !!response.audioContent);

    const audioContent = response.audioContent;
    if (!audioContent) {
      console.error('API Route: No audio content generated');
      return NextResponse.json(
        { error: 'No audio content generated' },
        { status: 500 }
      );
    }

    return new NextResponse(audioContent, {
      headers: {
        'Content-Type': 'audio/mpeg',
      },
    });
  } catch (error) {
    console.error('API Route: Error details:', error);
    // Log the full error object for debugging
    console.error('Full error:', JSON.stringify(error, null, 2));
    
    return NextResponse.json(
      { 
        error: 'Failed to generate speech',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}