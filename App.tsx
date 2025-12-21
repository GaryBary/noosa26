import React, { useState, useEffect } from 'react';
import ChatInterface from './components/ChatInterface.tsx';
import { Sunset, Key, Compass, Waves, Trees, ShoppingBag, Navigation } from 'lucide-react';

const App: React.FC = () => {
  const [sessionKey, setSessionKey] = useState(0);
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [activeLocality, setActiveLocality] = useState<string>('All Noosa');

  useEffect(() => {
    let mounted = true;

    const checkKeyStatus = async () => {
      try {
        // Check if key is already in process.env (injected by bridge or environment)
        let envKeyAvailable = false;
        try {
          // @ts-ignore
          envKeyAvailable = !!(typeof process !== 'undefined' && process.env?.API_KEY);
        } catch (e) {}

        const wasConnected = localStorage.getItem('noosa_concierge_connected') === 'true';
        
        if (window.aistudio) {
          // Check if AI Studio platform already has a key selected
          const hasSelected = await Promise.race([
            window.aistudio.hasSelectedApiKey(),
            new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 1000))
          ]);
          if (mounted) setHasApiKey(hasSelected || wasConnected || envKeyAvailable);
        } else {
          if (mounted) setHasApiKey(envKeyAvailable || wasConnected);
        }
      } catch (err) {
        console.error("App: Auth check failed", err);
        if (mounted) setHasApiKey(false);
      }
    };
    
    // Safety fallback
    const fallback = setTimeout(() => {
      if (mounted && hasApiKey === null) setHasApiKey(false);
    }, 1500);

    checkKeyStatus();
    return () => {
      mounted = false;
      clearTimeout(fallback);
    };
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio) {
      try {
        await window.aistudio.openSelectKey();
        localStorage.setItem('noosa_concierge_connected', 'true');
        // Assume success and proceed
        setHasApiKey(true);
      } catch (err) {
        console.error("Key selection failed", err);
        setHasApiKey(true); 
      }
    } else {
      // If bridge isn't available, we just toggle the state so they can see the app 
      // (it will fail later when trying to call Gemini if no key is present)
      localStorage.setItem('noosa_concierge_connected', 'true');
      setHasApiKey(true);
    }
  };

  if (hasApiKey === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFCFB]">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-slate-100 border-t-slate-900 rounded-full animate-spin"></div>
          <span className="mt-6 text-slate-400 font-bold uppercase tracking-[0.3em] text-[9px]">Contacting Concierge...</span>
        </div>
      </div>
    );
  }

  if (hasApiKey === false) {
    return (
      <div className="min-h-screen bg-[#FDFCFB] flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto">
        <div className="relative mb-10">
          <div className="absolute -inset-4 bg-sky-100/50 rounded-full blur-2xl animate-pulse"></div>
          <div className="relative w-20 h-20 bg-slate-900 rounded-[2rem] flex items-center justify-center text-white shadow-2xl">
            <Sunset size={42} />
          </div>
        </div>

        <h1 style={{fontFamily: 'Playfair Display, serif'}} className="text-4xl md:text-5xl font-bold text-slate-950 mb-6 tracking-tight leading-tight">
          Noosa Awaits
        </h1>
        <p className="text-base md:text-lg text-slate-500 mb-10 leading-relaxed font-medium">
          Connect your holiday concierge to get elite insights on surf, dining, and secret spots.
        </p>
        
        <div className="w-full space-y-4">
          <button 
            onClick={handleSelectKey}
            className="w-full group px-8 py-5 bg-slate-900 text-white text-base font-bold rounded-full transition-all shadow-xl hover:shadow-sky-200 active:scale-95 flex items-center justify-center gap-3"
          >
            <Key size={18} className="text-sky-300" />
            <span>Connect Concierge</span>
          </button>
          <p className="text-[10px] text-slate-400 mt-4 px-8 leading-relaxed">
            Requires a Google Gemini API Key. <br/>
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="underline hover:text-sky-600">Learn about billing & keys</a>.
          </p>
        </div>
      </div>
    );
  }

  const regions = [
    { name: 'Hastings St', icon: <ShoppingBag size={14} /> },
    { name: 'Noosaville', icon: <Waves size={14} /> },
    { name: 'Sunshine Beach', icon: <Sunset size={14} /> },
    { name: 'Hinterland', icon: <Trees size={14} /> }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#FDFCFB]">
      <header className="sticky top-0 z-50 glass border-b border-slate-100 px-5 pt-4 pb-2 select-none shadow-sm">
        <div className="max-w-4xl mx-auto flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg">
                <Compass size={18} />
              </div>
              <div>
                <h1 style={{fontFamily: 'Playfair Display, serif'}} className="text-xl font-bold text-slate-900 leading-none">Noosa</h1>
                <p className="text-[8px] text-sky-600 font-bold tracking-[0.2em] uppercase mt-1">Elite Holiday Guide</p>
              </div>
            </div>
            <button 
              onClick={() => { if (window.confirm("Start new session?")) setSessionKey(k => k + 1); }}
              className="p-2.5 rounded-full bg-white text-slate-400 border border-slate-100 shadow-sm active:scale-90 transition-transform"
            >
              <Navigation size={18} />
            </button>
          </div>
          
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
            <button 
              onClick={() => setActiveLocality('All Noosa')}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border ${
                activeLocality === 'All Noosa' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-100 hover:border-sky-200'
              }`}
            >
              All Noosa
            </button>
            {regions.map((region) => (
              <button
                key={region.name}
                onClick={() => setActiveLocality(region.name)}
                className={`flex-shrink-0 flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border ${
                  activeLocality === region.name ? 'bg-sky-600 text-white border-sky-600 shadow-md shadow-sky-100' : 'bg-white text-slate-400 border-slate-100 hover:border-sky-200'
                }`}
              >
                {region.icon}
                {region.name}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <ChatInterface 
          key={sessionKey} 
          locality={activeLocality}
          onApiKeyError={() => {
            localStorage.removeItem('noosa_concierge_connected');
            setHasApiKey(false);
          }} 
        />
      </main>
    </div>
  );
};

export default App;