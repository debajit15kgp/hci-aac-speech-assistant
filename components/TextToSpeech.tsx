'use client'

import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Volume2, StopCircle, AlertTriangle, Play } from "lucide-react"
import AutocompleteInput from './autocomplete';

class AACPredictor {
  constructor(wpm: number) {
    this.wpm = wpm;
    this.secondsPerWord = 60 / wpm;
    this.speakingRate = 150;
    this.secondsPerSpokenWord = 60 / this.speakingRate;
    this.lastSpokenIndex = -1;
  }

  wpm: number;
  secondsPerWord: number;
  speakingRate: number;
  secondsPerSpokenWord: number;
  lastSpokenIndex: number;

  static countCompletedWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  getCompletedWords(text: string): string[] {
    return text.trim().split(/\s+/).filter(word => word.length > 0);
  }

  getNewCompletedWords(text: string): string | null {
    const words = this.getCompletedWords(text);
    if (words.length <= this.lastSpokenIndex + 1) return null;

    const newWords = words.slice(this.lastSpokenIndex + 1);
    this.lastSpokenIndex = words.length - 1;
    
    return newWords.join(' ');
  }

  shouldStartSpeaking(completedWords: number, totalWords: number): boolean {
    // Start speaking when 40% of words are completed
    return completedWords >= Math.ceil(totalWords * 0.4);
  }

  reset(): void {
    this.lastSpokenIndex = -1;
  }
}

const TextToSpeech = () => {
  const [text, setText] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('en-US-Standard-A');
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(0);
  const [totalWords, setTotalWords] = useState(0);
  const [wpm, setWpm] = useState(30);
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictiveStarted, setPredictiveStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const predictor = useRef(new AACPredictor(wpm));
  const audioQueue = useRef<HTMLAudioElement[]>([]);
  const isPlaying = useRef(false);

  const voices = [
    { name: 'en-US-Standard-A', language: 'en-US' },
    { name: 'en-US-Standard-B', language: 'en-US' },
    { name: 'en-US-Standard-C', language: 'en-US' },
    { name: 'en-US-Standard-D', language: 'en-US' },
    { name: 'en-US-Standard-E', language: 'en-US' },
    { name: 'en-US-Standard-F', language: 'en-US' },
  ];

  const playNextInQueue = async () => {
    if (audioQueue.current.length === 0) {
      isPlaying.current = false;
      setIsSpeaking(false);
      return;
    }

    isPlaying.current = true;
    setIsSpeaking(true);
    
    const audio = audioQueue.current.shift();
    if (!audio) return;

    try {
      await audio.play();
      await new Promise(resolve => {
        audio.onended = resolve;
      });
    } catch (err) {
      console.error('Audio playback error:', err);
    }

    playNextInQueue();
  };

  const queueForSpeaking = async (text: string) => {
    if (!text?.trim()) return;
    console.log('Queuing for speaking:', text);
  
    try {
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text.trim(),
          voice: selectedVoice,
          pitch,
          speakingRate: rate,
        }),
      });
  
      if (!response.ok) {
        throw new Error('Failed to generate speech');
      }
  
      const audioData = await response.blob();
      const audio = new Audio(URL.createObjectURL(audioData));
      
      audio.onerror = (e) => {
        console.error('Audio loading error:', e);
        setError('Failed to load audio');
      };
  
      audioQueue.current.push(audio);
  
      if (!isPlaying.current) {
        playNextInQueue();
      }
    } catch (err) {
      console.error('Speech generation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate speech');
    }
  };


  const handleStop = () => {
    audioQueue.current = [];
    isPlaying.current = false;
    setIsSpeaking(false);
  };
  
  const handleStartPredicting = () => {
    setText('');
    setIsPredicting(true);
    setPredictiveStarted(false);
    predictor.current = new AACPredictor(wpm);
    predictor.current.reset();
    handleStop();
    console.log('Started predicting mode. Target words:', totalWords);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setText(newText);
    
    if (!isPredicting) return;
  
    const isWordCompleted = newText.endsWith(' ');
    const completedWords = AACPredictor.countCompletedWords(newText);
    
    console.log(`Completed words: ${completedWords}/${totalWords}`);
  
    // Check if we should start speaking
    if (!predictiveStarted) {
      const shouldSpeak = predictor.current.shouldStartSpeaking(completedWords, totalWords);
      
      if (shouldSpeak && isWordCompleted) {
        console.log('Starting predictive speaking');
        setPredictiveStarted(true);
        
        // Get and speak just the last word
        const words = predictor.current.getCompletedWords(newText);
        const currentWord = words[predictor.current.lastSpokenIndex + 1];
        
        if (currentWord) {
          console.log('Speaking word:', currentWord);
          // queueForSpeaking(currentWord);
        }
      }
    } else if (isWordCompleted) {
      // Speak only new completed words
      const newWord = predictor.current.getNewCompletedWords(newText);
      if (newWord) {
        console.log('Speaking new word:', newWord);
        queueForSpeaking(newWord);
      }
    }
  
    if (completedWords >= totalWords) {
      setIsPredicting(false);
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert> 
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <Card className="w-full min-w-[500px] max-w-4xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Predictive Text to Speech</CardTitle>
              <CardDescription>
                Type naturally while speech begins at the optimal moment
              </CardDescription>
            </div>
            {isPredicting && (
              <span className={`px-2 py-1 rounded-full text-sm ${
                isSpeaking ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
              }`}>
                {isSpeaking ? "Speaking" : "Waiting"}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isPredicting && (
            <div className="flex items-center space-x-4 mb-4">
              <input
                type="number"
                placeholder="Total words"
                value={totalWords || ''}
                onChange={(e) => setTotalWords(parseInt(e.target.value) || 0)}
                className="w-32 px-3 py-2 border rounded-md"
              />
              <input
                type="number"
                placeholder="WPM"
                value={wpm}
                onChange={(e) => setWpm(parseInt(e.target.value) || 30)}
                className="w-32 px-3 py-2 border rounded-md"
              />
              <Button
                onClick={handleStartPredicting}
                disabled={totalWords <= 0}
              >
                <Play className="mr-2 h-4 w-4" />
                Start
              </Button>
            </div>
          )}

          {isPredicting && (
            <div className="text-sm text-gray-500 mb-2">
              Words: {AACPredictor.countCompletedWords(text)} / {totalWords}
            </div>
          )}

          <AutocompleteInput
            value={text}
            onChange={handleTextChange}
            placeholder={isPredicting ? "Start typing..." : "Enter text or set up predictive typing..."}
            className="min-h-32 transition-all duration-200 focus:shadow-lg"
            onWordComplete={(word) => {
              if (isPredicting && predictiveStarted) {
                queueForSpeaking(word);
              }
            }}
            totalWords={totalWords}
          />

          {/* <AutocompleteInput
            value={text}
            onChange={handleChange}
            placeholder="Type something..."
            className="w-full"
            totalWords={10}
            onWordComplete={(word) => console.log('Completed word:', word)}
          /> */}


          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Voice</label>
              <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a voice" />
                </SelectTrigger>
                <SelectContent>
                  {voices.map((voice) => (
                    <SelectItem key={voice.name} value={voice.name}>
                      {voice.name} ({voice.language})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Rate: {rate}x</label>
              <Slider
                value={[rate]}
                onValueChange={([newRate]) => setRate(newRate)}
                min={0.5}
                max={2}
                step={0.1}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Pitch: {pitch}</label>
              <Slider
                value={[pitch]}
                onValueChange={([newPitch]) => setPitch(newPitch)}
                min={-10}
                max={10}
                step={1}
              />
            </div>

            {!isPredicting && (
              <div className="flex gap-2">
                <Button
                  onClick={() => queueForSpeaking(text)}
                  disabled={isSpeaking || !text.trim()}
                  className="w-full"
                >
                  <Volume2 className="mr-2 h-4 w-4" />
                  Speak
                </Button>
                {isSpeaking && (
                  <Button
                    onClick={handleStop}
                    variant="destructive"
                    className="w-full"
                  >
                    <StopCircle className="mr-2 h-4 w-4" />
                    Stop
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TextToSpeech;