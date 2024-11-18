import React, { useState, useRef } from 'react';
import { Textarea } from "@/components/ui/textarea";

// Common phrases bank organized by categories
const phraseBank = {
  Greetings: [
    "Hello, how are you?",
    "Good morning",
    "Good afternoon",
    "Good evening",
    "Nice to meet you"
  ],
  Courtesy: [
    "Thank you very much",
    "You're welcome",
    "Excuse me",
    "I'm sorry",
    "Please help me"
  ],
  Common: [
    "Could you repeat that?",
    "I don't understand",
    "What time is it?",
    "Where is the bathroom?",
    "How much does this cost?"
  ],
  Emergency: [
    "I need help",
    "Call an ambulance",
    "Is there a doctor?",
    "It's an emergency",
    "Please call the police"
  ]
};

const commonWords = [
  "the", "be", "to", "of", "and", "a", "in", "that", "have",
  "please", "help", "thank", "need", "want", "like", "can", "could",
  "hello", "goodbye", "yes", "no", "maybe", "sorry", "okay", "fine",
  "good", "bad", "happy", "sad", "tired", "hungry", "thirsty"
];

interface AutocompleteProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  className?: string;
  onWordComplete?: (word: string) => void;
  totalWords: number;  
}

const AutocompleteInput: React.FC<AutocompleteProps> = ({ 
  value, 
  onChange, 
  placeholder, 
  className,
  onWordComplete,
  totalWords
}) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [selectedCategory, setSelectedCategory] = useState<string>("Greetings");
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(0);
  const [voice, setVoice] = useState("en-US-Standard-A (en-US)");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const speechSynthesis = typeof window !== 'undefined' ? window.speechSynthesis : null;

  const getSuggestions = (text: string): string[] => {
    const lastWord = text.split(/\s+/).pop()?.toLowerCase() || '';
    if (!lastWord || lastWord.length < 2) return [];

    return commonWords
      .filter(word => word.toLowerCase().startsWith(lastWord))
      .slice(0, 5);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    onChange(e);
    const newSuggestions = getSuggestions(newText);
    setSuggestions(newSuggestions);
    setSelectedIndex(-1);
  };

  const speakText = (text: string) => {
    if (speechSynthesis) {
      // Cancel any ongoing speech
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = rate;
      utterance.pitch = pitch;
      speechSynthesis.speak(utterance);
    }
  };

  const handlePhraseClick = (phrase: string) => {
    onChange({ target: { value: phrase } } as React.ChangeEvent<HTMLTextAreaElement>);
    speakText(phrase);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev <= 0 ? suggestions.length - 1 : prev - 1));
    } else if (e.key === 'Tab' || e.key === 'Enter') {
      if (selectedIndex >= 0) {
        e.preventDefault();
        applySuggestion(suggestions[selectedIndex]);
      }
    }
  };

  const applySuggestion = (suggestion: string) => {
    const words = value.split(/\s+/);
    words.pop();
    const newText = [...words, suggestion, ''].join(' ');
    onChange({ target: { value: newText } } as React.ChangeEvent<HTMLTextAreaElement>);
    setSuggestions([]);
    setSelectedIndex(-1);
    if (onWordComplete) onWordComplete(suggestion);
  };
    return (
        <div className="w-full min-w-[300px] max-w-full mx-auto p-6">
        <div className="space-y-4 p-6 bg-white rounded-xl border border-gray-200 shadow-sm">
            {/* Main content area - changed from flex to flex-col */}
            <div className="flex flex-col gap-4">
            {/* Textarea container */}
            <div className="w-full">
                <Textarea
                ref={textareaRef}
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="w-full min-h-[150px]"
                />
                
                {/* Suggestions dropdown */}
                {suggestions.length > 0 && (
                <div className="absolute mt-1 bg-white border rounded-md shadow-lg z-10">
                    {suggestions.map((suggestion, index) => (
                    <div
                        key={suggestion}
                        className={`px-4 py-2 cursor-pointer ${
                        index === selectedIndex ? 'bg-blue-100' : 'hover:bg-gray-100'
                        }`}
                        onClick={() => applySuggestion(suggestion)}
                    >
                        {suggestion}
                    </div>
                    ))}
                </div>
                )}
            </div>

            {/* Phrase Bank - modified width and layout */}
            <div className="w-full bg-white border rounded-lg shadow-sm">
                <div className="p-4">
                <h3 className="text-base font-medium mb-3">Common Phrases</h3>
                
                {/* Category buttons */}
                <div className="flex flex-wrap gap-2 mb-3">
                    {Object.keys(phraseBank).map((category) => (
                    <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={`px-3 py-1 rounded-full text-sm ${
                        selectedCategory === category
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        }`}
                    >
                        {category}
                    </button>
                    ))}
                </div>

                {/* Phrases grid - changed to grid layout for better space usage */}
                <div className="grid grid-cols-2 gap-2">
                    {phraseBank[selectedCategory as keyof typeof phraseBank].map((phrase) => (
                    <button
                        key={phrase}
                        onClick={() => handlePhraseClick(phrase)}
                        className="text-left px-3 py-2 text-sm rounded hover:bg-gray-100 truncate"
                    >
                        {phrase}
                    </button>
                    ))}
                </div>
                </div>
            </div>
            </div>
        </div>
        </div>
    );
};

export default AutocompleteInput;