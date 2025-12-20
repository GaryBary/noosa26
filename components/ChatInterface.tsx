import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Mic, Volume2, VolumeX, XCircle, Loader2 } from 'lucide-react';
import ChatBubble from './ChatBubble.tsx';
import { Role } from '../types.ts';
import type { Message } from '../types.ts';
import { sendMessageToGemini, generateSpeech, transcribeAudio } from '../services/geminiService.ts';
import { SUGGESTED_QUESTIONS } from '../constants.ts';
import { decodeBase64, decodeAudioData, recordAudio } from '../utils/audio.ts';

interface ChatInterfaceProps {
  locality: string;
  onApiKeyError?: () => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ locality, onApiKeyError }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: Role.MODEL,
      text: "Welcome to Noosa Heads. 🌊 I am your personalized concierge for Hastings Street and beyond. Whether you're seeking the perfect break, a coastal massage, or a world-class bistro, I am here to guide you.",
      timestamp: Date.now()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceResponseEnabled, setVoiceResponseEnabled] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const stopRecordingRef = useRef<(() => Promise<string>) | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    return () => {
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  const handleVoiceToggle = async () => {
    if (isRecording) {
      if (stopRecordingRef.current) {
        setIsRecording(false);
        setIsTranscribing(true);
        try {
          const base64Audio = await stopRecordingRef.current();
          const transcription = await transcribeAudio(base64Audio);
          if (transcription) {
            setInputText(prev => prev ? `${prev} ${transcription}` : transcription);
          }
        } catch (e) {
          console.error("Transcription failed", e);
        } finally {
          setIsTranscribing(false);
          stopRecordingRef.current = null;
        }
      }
    } else {
      try {
        const { stop } = await recordAudio();
        stopRecordingRef.current = stop;
        setIsRecording(true);
      } catch (e) {
        console.error("Mic access denied", e);
      }
    }
  };

  const playAudioChunk = async (base64Audio: string) => {
    if (!audioContextRef.current) {
       audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') await ctx.resume();
    try {
        const audioBuffer = await decodeAudioData(decodeBase64(base64Audio), ctx, 24000);
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        const now = ctx.currentTime;
        if (nextStartTimeRef.current < now) nextStartTimeRef.current = now;
        source.start(nextStartTimeRef.current);
        nextStartTimeRef.current += audioBuffer.duration;
    } catch (e) { console.error(e); }
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading || isRecording) return;
    
    const userMsg: Message = { 
      id: Date.now().toString(), 
      role: Role.USER, 
      text: text, 
      timestamp: Date.now() 
    };
    
    const historyForService = [...messages];
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await sendMessageToGemini(text, historyForService, locality);
      const botMsg: Message = { 
        id: (Date.now() + 1).toString(), 
        role: Role.MODEL, 
        text: response.text, 
        groundingMetadata: response.groundingMetadata, 
        timestamp: Date.now() 
      };
      setMessages(prev => [...prev, botMsg]);
      
      if (voiceResponseEnabled && response.text) {
         const ttsAudio = await generateSpeech(response.text);
         if (ttsAudio) playAudioChunk(ttsAudio);
      }
    } catch (e: any) {
      console.error("Chat Error:", e);
      if (e.message === "API_KEY_ERROR") {
        onApiKeyError?.();
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto relative px-4">
      <div className="flex-1 overflow-y-auto pt-8 pb-32 space-y-4 no-scrollbar">
        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} />
        ))}
        {isLoading && (
          <div className="flex justify-start w-full mb-8">
             <div className="flex flex-row items-center gap-4">
              <div className="h-10 w-10 rounded-2xl bg-sky-100 flex items-center justify-center">
                 <Sparkles size={18} className="text-sky-500 animate-spin" />
              </div>
              <div className="flex gap-1">
                {[0,1,2].map(i => (
                  <span key={i} className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce" style={{animationDelay: `${i*0.2}s`}}></span>
                ))}
              </div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="absolute bottom-6 left-0 right-0 px-4 space-y-4">
        <div className={`glass shadow-2xl rounded-[2.5rem] p-2 transition-all duration-500 border-white/80 ${
          isRecording ? 'bg-sky-50/90 ring-4 ring-sky-100/50' : ''
        }`}>
          <div className="flex items-center">
            <button
              onClick={handleVoiceToggle}
              disabled={isLoading || isTranscribing}
              className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                isRecording 
                  ? 'bg-red-500 text-white shadow-lg shadow-red-200 animate-pulse' 
                  : 'bg-slate-100 text-slate-500 hover:bg-sky-100 hover:text-sky-600'
              }`}
            >
              {isRecording ? <XCircle size={24} /> : (isTranscribing ? <Loader2 size={22} className="animate-spin text-sky-600" /> : <Mic size={22} />)}
            </button>
            {isRecording ? (
               <div className="flex-1 px-6 flex items-center gap-3">
                 <div className="voice-wave">
                   <span></span><span></span><span></span><span></span><span></span>
                 </div>
                 <span className="text-sky-700 font-bold text-sm uppercase tracking-widest">Recording...</span>
               </div>
            ) : (
              <>
                <div className="flex-1 relative flex items-center">
                  <input
                    ref={inputRef}
                    type="text"
                    className={`w-full bg-transparent px-4 py-3 focus:outline-none text-slate-800 placeholder-slate-400 font-medium ${isTranscribing ? 'opacity-40' : ''}`}
                    placeholder={isTranscribing ? "Transcribing voice..." : `Ask about ${locality}...`}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(inputText)}
                    disabled={isLoading || isTranscribing}
                  />
                </div>
                <button
                  onClick={() => setVoiceResponseEnabled(!voiceResponseEnabled)}
                  className={`mx-2 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    voiceResponseEnabled ? 'text-sky-600 bg-sky-50' : 'text-slate-300 hover:text-slate-500'
                  }`}
                >
                  {voiceResponseEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                </button>
                <button
                  onClick={() => handleSendMessage(inputText)}
                  disabled={!inputText.trim() || isLoading || isTranscribing}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                    inputText.trim() && !isLoading && !isTranscribing
                      ? 'bg-slate-900 text-white shadow-xl hover:scale-105 active:scale-95'
                      : 'bg-slate-50 text-slate-200'
                  }`}
                >
                  <Send size={20} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;