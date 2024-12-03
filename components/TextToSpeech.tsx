'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { NoBadWordsLogitsProcessor } from '@xenova/transformers/types/utils/generation';

class AACPredictor {
  constructor() {
    this.speakingRate = 150;
    this.secondsPerSpokenWord = 60 / this.speakingRate;
    this.lastSpokenIndex = -1;
    this.typingStartTime = Date.now();
    this.wordTimestamps = [];
  }

  speakingRate: number;
  secondsPerSpokenWord: number;
  lastSpokenIndex: number;
  typingStartTime: number;
  wordTimestamps: number[];

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

  shouldStartSpeaking(wordCount: number, wpm: number, assumedSentenceLength: number): boolean {
    if (wordCount < 2) return false;

    const remainingWords = assumedSentenceLength - wordCount;
    const timeToFinishTyping = remainingWords * 60 / wpm;
    
    console.log('Prediction stats:', {
        wordCount,
        remainingWords,
        timeToFinishTyping
    });

    return (wordCount >= Math.ceil(assumedSentenceLength * 0.8));
  }

  recordWordCompletion() {
    const now = Date.now();
    this.wordTimestamps.push(now);
    if (this.wordTimestamps.length > 3) {
      this.wordTimestamps.shift();
    }
  }
}

const TextToSpeech = () => {
  const [text, setText] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(0);
  const [totalWords, setTotalWords] = useState(0);
  const [wpm, setWpm] = useState(30);
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictiveStarted, setPredictiveStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMetrics, setShowMetrics] = useState(false);

  const predictor = useRef(new AACPredictor());
  const synth = useRef<SpeechSynthesis | null>(null);
  const currentUtterance = useRef<SpeechSynthesisUtterance | null>(null);
  const metricsAnalyzer = useRef(new ConversationAnalyzer());
  const [boundryWordIndex, setboundryWordIndex] = useState(0);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      synth.current = window.speechSynthesis;
      
      const loadVoices = () => {
        const availableVoices = synth.current?.getVoices() || [];
        setVoices(availableVoices);
        if (availableVoices.length > 0) {
          setSelectedVoice(availableVoices[0].name);
        }
      };

      loadVoices();
      if (synth.current.onvoiceschanged !== undefined) {
        synth.current.onvoiceschanged = loadVoices;
      }
    }
  }, []);

  const queueForSpeaking = async (text: string[]) => {
      if (!synth.current) return;
      console.log('Adding to speech queue:', text);
      let utterance = currentUtterance.current;


      if (!utterance) {
        utterance = new SpeechSynthesisUtterance();
        const selectedVoiceObj = voices.find(voice => voice.name === selectedVoice);
        if (selectedVoiceObj) {
          utterance.voice = selectedVoiceObj;
        }
        utterance.rate = rate;
        utterance.pitch = pitch;
        currentUtterance.current = utterance;
      }

      if (!synth.current.speaking) {
          utterance.text = text.join(' ');
          const boundryChar = text.join(' ').length;
          utterance.addEventListener('boundary', evt => {
            if (evt.charIndex >= boundryChar - 1) {
              synth.current?.cancel();
            }
          })
  
          currentUtterance.current = utterance;
          synth.current.speak(utterance);
      } else if(text.length == totalWords) {
          // Update the current utterance with all words
          //console.log("adding words: ", text.slice(boundryWordIndex));
          utterance.text = text.slice(boundryWordIndex).join('');
          synth.current.speak(utterance);
          setIsSpeaking(false);
      }
  };

  const handleStop = () => {
    if (synth.current) {
      synth.current.cancel();
    }
    currentUtterance.current = null;
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

const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
  const newText = e.target.value;
  setText(newText);
  
  if (!isPredicting) return;

  const previousWords = predictor.current.getCompletedWords(text);
  const currentWords = predictor.current.getCompletedWords(newText);
  
  if (currentWords.length > previousWords.length) {
      predictor.current.recordWordCompletion();
      console.log('New word completed', { previousWords, currentWords });

      // Check if we should start predicting
      if (!predictiveStarted) {
          const shouldStart = predictor.current.shouldStartSpeaking(
              currentWords.length, 
              wpm, 
              totalWords
          );
          
          if (shouldStart) {
              console.log('Starting predictive speech with words:', currentWords);
              setPredictiveStarted(true);
              predictor.current.lastSpokenIndex = currentWords.length - 1;
              queueForSpeaking(currentWords);
          }
      } else {
          // We're already speaking, so speak the new word
          console.log('Speaking new word in ongoing speech');
          queueForSpeaking(currentWords);
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
                queueForSpeaking([word]);
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
                  onClick={() => queueForSpeaking([text])}
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