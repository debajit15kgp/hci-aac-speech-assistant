'use client'

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Volume2, StopCircle, AlertTriangle } from "lucide-react"

const TextToSpeech = () => {
  const [text, setText] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState('');
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [isSupported, setIsSupported] = useState(true);
  const synthesis = window.speechSynthesis;

  // Check browser support and load voices
  useEffect(() => {
    if (!window.speechSynthesis) {
      setIsSupported(false);
      return;
    }

    const loadVoices = () => {
      const availableVoices = synthesis.getVoices();
      setVoices(availableVoices);
      if (availableVoices.length > 0) {
        setSelectedVoice(availableVoices[0].name);
      }
    };

    loadVoices();
    // Chrome requires this additional event listener
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = loadVoices;
    }

    // Cleanup on unmount
    return () => {
      if (synthesis) {
        synthesis.cancel();
      }
    };
  }, []);

  const handleSpeak = () => {
    if (text.trim() === '') return;

    // Stop any ongoing speech
    synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voices.find(voice => voice.name === selectedVoice);
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      setIsSpeaking(false);
    };

    synthesis.speak(utterance);
  };

  const handleStop = () => {
    synthesis.cancel();
    setIsSpeaking(false);
  };

  if (!isSupported) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Browser Not Supported</AlertTitle>
          <AlertDescription>
            Your browser doesn't support the Web Speech API. Please try using a modern browser like Chrome, Firefox, or Edge.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Text to Speech</CardTitle>
          <CardDescription>
            Customize and convert your text to speech
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Enter text to convert to speech..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-32 transition-all duration-200 focus:shadow-lg"
          />
          
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
                      {voice.name} ({voice.lang})
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
                min={0.5}
                max={2}
                step={0.1}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleSpeak}
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TextToSpeech;