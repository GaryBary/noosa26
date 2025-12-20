import React, { useState, useEffect } from 'react';
import ChatInterface from './components/ChatInterface.tsx';
import { Sunset, PlusCircle, Key, Compass } from 'lucide-react';

const App: React.FC = () => {
  const [sessionKey, setSessionKey] = useState(0);
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);

  useEffect(() => {
    console.log('App: Checking Concierge Auth Status...');
    const checkKeyStatus = async () => {
      let envKey = false;
      try {
        // @ts-ignore
        envKey = !!(typeof process !== 'undefined' && process.env?.API_KEY);
      } catch (e) {
        envKey = false;
      }

      const wasConnected = localStorage.getItem('noosa_concierge_connected') === 'true';
      
      if (window.aistudio) {
        try {
          const hasKey = await window.aistudio.hasSelectedApiKey();
          setHasApiKey(hasKey || wasConnected || envKey);
        } catch (err) {
          setHasApiKey(wasConnected || envKey);
        }
      } else {
        setHasApiKey(envKey || wasConnected);
      }
    };
    checkKeyStatus();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio) {
      try {
        await window.aistudio.openSelectKey();
        localStorage.setItem('noosa_concierge_connected', 'true');
        setHasApiKey(true);
      } catch (err) {
        console.error("Key selection failed", err);
      }
    } else {
      localStorage.setItem('noosa_concierge_connected', 'true');
      setHasApiKey(true);
    }
  };

  if (hasApiKey === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFCFB]">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-sky-100 border-t-sky-600 rounded-full animate-spin"></div>
          <span className="mt-6 text-slate-400 font-bold uppercase tracking-[0.3em] text-[9px]">Loading Guide...</span>
        </div>
      </div>
    );
  }

  if (hasApiKey === false) {
    return (
      <div className="min-h-screen bg-[#FDFCFB] flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto overflow-hidden">
        <div className="relative mb-12">
          <div className="absolute -inset-4 bg-sky-100/50 rounded-full blur-2xl animate-pulse"></div>
          <div className="relative w-20 h-20 bg-slate-900 rounded-[2rem] flex items-center justify-center text-white shadow-2xl transform hover:scale-105 transition-transform">
            <Sunset size={42} />
          </div>
        </div>

        <h1 style={{fontFamily: 'Playfair Display, serif'}} className="text-5xl font-bold text-slate-950 mb-6 tracking-tight">
          Holiday Mode
        </h1>
        <p className="text-lg text-slate-500 mb-10 leading-relaxed font-medium">
          Welcome to Noosa. Your AI concierge is ready to help your family find the best surf, coffee, and sunset spots.
        </p>
        
        <div className="w-full space-y-4">
          <button 
            onClick={handleSelectKey}
            className="w-full group px-8 py-5 bg-slate-900 text-white text-base font-bold rounded-full transition-all shadow-xl hover:shadow-sky-200 active:scale-95 flex items-center justify-center gap-3"
          >
            <Key size={18} className="text-sky-300" />
            <span>Connect to Concierge</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col noosa-gradient">
      <header className="sticky top-0 z-50 glass border-b border-white/20 px-5 h-16 md:h-20 select-none">
        <div className="max-w-4xl mx-auto h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg">
              <Compass size={18} />
            </div>
            <div>
              <h1 style={{fontFamily: 'Playfair Display, serif'}} className="text-xl font-bold text-slate-900 leading-none">
                Noosa
              </h1>
              <p className="text-[8px] text-sky-600 font-bold tracking-[0.2em] uppercase mt-1">
                Family Holiday Concierge
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                if (window.confirm("Refresh the holiday journey?")) setSessionKey(k => k + 1);
              }}
              className="p-2.5 rounded-full bg-white text-slate-400 border border-slate-100 shadow-sm active:scale-90 transition-transform"
            >
              <PlusCircle size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <ChatInterface key={sessionKey} onApiKeyError={() => {
          localStorage.removeItem('noosa_concierge_connected');
          setHasApiKey(false);
        }} />
      </main>
    </div>
  );
};

export default App;