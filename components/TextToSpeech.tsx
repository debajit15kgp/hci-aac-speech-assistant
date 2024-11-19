'use client'

import React, { useState, useEffect, useRef, useCallback  } from 'react';
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Volume2, StopCircle, AlertTriangle, Play } from "lucide-react"
import AutocompleteInput from './autocomplete';
import { ConversationAnalyzer } from '@/lib/metrics/ConversationMetrics';
import MetricsDashboard from '@/components/MetricsDashboard';

class AACPredictor {
  constructor() {
    this.speakingRate = 150;
    this.secondsPerSpokenWord = 60 / this.speakingRate;
    this.lastSpokenIndex = -1;
    this.typingStartTime = Date.now();
    this.wordTimestamps = [];
    this.audioCache = new Map();
  }

  speakingRate: number;
  secondsPerSpokenWord: number;
  lastSpokenIndex: number;
  typingStartTime: number;
  wordTimestamps: number[];
  audioCache: Map<string, number>;

  static countCompletedWords(text: string): number {
    const matches = text.match(/\S+[\s.,!?;:]+/g);
    return matches ? matches.length : 0;
  }

  getCompletedWords(text: string): string[] {
    const matches = text.match(/\S+[\s.,!?;:]+/g);
    return matches || [];
  }

  getNewCompletedWords(text: string): string | null {
    const words = this.getCompletedWords(text);
    if (words.length <= this.lastSpokenIndex + 1) return null;

    const newWords = words.slice(this.lastSpokenIndex + 1);
    this.lastSpokenIndex = words.length - 1;
    
    return newWords.join(' ');
  }

  shouldStartSpeaking(completedWords: string[], wordDurations: Map<string, number>, wpm: number, assumedSentenceLength: number): boolean {
    if (completedWords.length < 2) return false;

    // Calculate remaining typing time
    const remainingWords = assumedSentenceLength - completedWords.length;
    const timeToFinishTyping = remainingWords * 60 / wpm;

    // Sum up the actual speech durations of completed words
    let totalSpeechTime = 0;
    for (const word of completedWords) {
      const duration = wordDurations.get(word);
      if (duration === undefined) {
        console.warn('Missing duration for word:', word);
        return false;
      }
      totalSpeechTime += duration;
    }

    const timeDifference = Math.abs(timeToFinishTyping - totalSpeechTime);
    
    console.log('Prediction stats:', {
      completedWordsCount: completedWords.length,
      remainingWords,
      timeToFinishTyping,
      totalSpeechTime,
      timeDifference,
    });
    console.log(timeDifference)
    return (timeDifference <= 4 || completedWords.length >= Math.ceil(assumedSentenceLength * 0.8));
  }

  recordWordCompletion() {
    const now = Date.now();
    this.wordTimestamps.push(now);
    if (this.wordTimestamps.length > 3) {
      this.wordTimestamps.shift();
    }
  }

  setWordDuration(word: string, duration: number) {
    this.audioCache.set(word.trim(), duration);
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
  const predictor = useRef(new AACPredictor());
  const audioQueue = useRef<HTMLAudioElement[]>([]);
  const isPlaying = useRef(false);
  const [showMetrics, setShowMetrics] = useState(false);
  const metricsAnalyzer = useRef(new ConversationAnalyzer());
  const wordDurations = useRef(new Map<string, number>());

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
  
    metricsAnalyzer.current.recordWordSpeechStart(text);

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
    predictor.current = new AACPredictor();

    handleStop();
    metricsAnalyzer.current = new ConversationAnalyzer();
    console.log('Started predicting mode. Target words:', totalWords);
  };

  const generateWordAudio = useCallback(async (word: string): Promise<number> => {
    try {
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: word,
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
      
      return new Promise((resolve) => {
        audio.addEventListener('loadedmetadata', () => {
          resolve(audio.duration);
        });
      });
    } catch (err) {
      console.error('Error generating audio for word:', word, err);
      throw err;
    }
  }, [selectedVoice, pitch, rate]);

  useEffect(() => {
    let mounted = true;

    const processNewWords = async (newWords: string[]) => {
      if (!mounted) return;

      for (const word of newWords) {
        if (!wordDurations.current.has(word)) {
          try {
            const duration = await generateWordAudio(word);
            if (mounted) {
              wordDurations.current.set(word, duration);
            }
          } catch (err) {
            console.error('Failed to generate audio for word:', word);
          }
        }
      }

      if (!mounted) return;

      // Check if we should start speaking
      if (!predictiveStarted) {
        const currentWords = predictor.current.getCompletedWords(text);
        const shouldStart = predictor.current.shouldStartSpeaking(currentWords, wordDurations.current, wpm, totalWords);
        
        if (shouldStart) {
          console.log('Starting predictive speech');
          setPredictiveStarted(true);
          // queueForSpeaking(currentWords.join(''));
        }
      }
    };

    if (isPredicting) {
      const currentWords = predictor.current.getCompletedWords(text);
      processNewWords(currentWords);
    }

    return () => {
      mounted = false;
    };
  }, [text, isPredicting, generateWordAudio]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setText(newText);
    
    if (!isPredicting) return;

    const previousWords = predictor.current.getCompletedWords(text);
    const currentWords = predictor.current.getCompletedWords(newText);
    
    if (currentWords.length > previousWords.length) {
      predictor.current.recordWordCompletion();
    }

    if (predictiveStarted && currentWords.length > predictor.current.lastSpokenIndex + 1) {
      const newWords = currentWords.slice(predictor.current.lastSpokenIndex + 1);
      predictor.current.lastSpokenIndex = currentWords.length - 1;
      if (newWords.length > 0) {
        queueForSpeaking(newWords.join(''));
      }
    }

    if (currentWords.length >= totalWords) {
      setIsPredicting(false);
      setPredictiveStarted(false);
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
      <Card className="w-full min-w-[400px] max-w-4xl">
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
          <div className="flex justify-end mt-4">
            <Button
              variant="outline"
              onClick={() => setShowMetrics(!showMetrics)}
            >
              {showMetrics ? 'Hide Metrics' : 'Show Metrics'}
            </Button>
          </div>
        </CardContent>
      </Card>
      {showMetrics && (
        <Card className="mt-4 w-full min-w-[500px] max-w-4xl">
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <MetricsDashboard 
              metrics={metricsAnalyzer.current.calculateMetrics()}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TextToSpeech;