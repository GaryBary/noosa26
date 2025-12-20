
import React from 'react';
import { Message, Role } from '../types.ts';
import { User, MapPin, ExternalLink, Globe, Mic, Waves, Compass, Share2 } from 'lucide-react';

interface ChatBubbleProps { message: Message; }

const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const isUser = message.role === Role.USER;
  const rawChunks = message.groundingMetadata?.groundingChunks || [];

  const handleShare = async (title: string, url: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Noosa Discovery: ${title}`,
          text: `Found this for our Noosa holiday: ${title}`,
          url: url,
        });
      } catch (err) {
        console.log('Sharing failed', err);
      }
    } else {
      window.open(url, '_blank');
    }
  };

  const seenUris = new Set<string>();
  const messageTextLower = message.text.toLowerCase();
  
  const filteredChunks = rawChunks.reduce((acc: any[], chunk) => {
    const uri = (chunk.maps?.uri || chunk.web?.uri || "").trim();
    const title = (chunk.maps?.title || chunk.web?.title || "").trim();
    const titleLower = title.toLowerCase();
    
    if (!uri || !title) return acc;
    if (seenUris.has(uri)) return acc;

    const keywords = titleLower.split(/[\s,.-]+/).filter(w => w.length > 3);
    const isMentioned = messageTextLower.includes(titleLower) || 
                       keywords.some(word => messageTextLower.includes(word));
    
    if (!isMentioned) return acc;

    const genericTerms = ['noosa', 'queensland', 'australia', 'google search'];
    if (genericTerms.includes(titleLower)) return acc;

    seenUris.add(uri);
    acc.push(chunk);
    return acc;
  }, []).slice(0, 4);

  const formatText = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, lineIdx) => {
      const parts = line.split(/(\*\*.*?\*\*|\[.*?\]\(.*?\))/g);
      return (
        <div key={lineIdx} className={`${line.trim().startsWith('*') || line.trim().startsWith('-') ? 'pl-4 -indent-4 mb-2' : 'mb-2'} leading-relaxed`}>
          {parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={i} className="font-bold text-sky-950">{part.slice(2, -2)}</strong>;
            }
            if (part.startsWith('[') && part.includes('](')) {
              const label = part.match(/\[(.*?)\]/)?.[1] || "Link";
              const url = part.match(/\((.*?)\)/)?.[1] || "#";
              return (
                <a 
                  key={i} 
                  href={url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="inline-flex items-center gap-1.5 px-3 py-1 mx-1.5 rounded-full bg-sky-50 text-sky-700 hover:bg-sky-100 no-underline text-[10px] font-bold uppercase tracking-wider transition-all border border-sky-100 shadow-sm whitespace-nowrap align-middle"
                >
                  {label === 'Map' ? <MapPin size={10} /> : <Globe size={10} />}
                  {label}
                  <ExternalLink size={10} className="opacity-40" />
                </a>
              );
            }
            return part;
          })}
        </div>
      );
    });
  };

  return (
    <div className={`flex w-full mb-6 message-enter ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[95%] md:max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start gap-3 md:gap-4`}>
        
        <div className={`flex-shrink-0 h-9 w-9 md:h-10 md:w-10 rounded-2xl flex items-center justify-center shadow-lg transform ${
          isUser ? 'bg-slate-800' : 'bg-sky-600'
        }`}>
          {isUser ? <User size={18} className="text-slate-100" /> : <Compass size={18} className="text-white" />}
        </div>

        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} w-full`}>
          <div className={`px-5 py-4 rounded-[1.8rem] shadow-sm text-sm md:text-base leading-relaxed tracking-tight ${
            isUser 
              ? 'bg-slate-900 text-slate-50 rounded-tr-none' 
              : 'glass text-slate-800 rounded-tl-none border-white/60'
          }`}>
            {message.audio && !message.text ? (
              <div className="flex items-center gap-3 text-slate-400 italic">
                <Mic size={16} className="animate-pulse" />
                <span className="text-xs">Processing audio...</span>
              </div>
            ) : (
              <div className="space-y-0.5">
                {formatText(message.text)}
              </div>
            )}
          </div>

          {!isUser && filteredChunks.length > 0 && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
              {filteredChunks.map((chunk, idx) => {
                const uri = chunk.maps?.uri || chunk.web?.uri;
                const title = chunk.maps?.title || chunk.web?.title || "Venue";
                if (!uri) return null;

                return (
                  <div key={idx} className="group flex flex-col p-3 rounded-2xl bg-white/70 border border-slate-100 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-start justify-between mb-2">
                      <span className="font-bold text-slate-900 text-[11px] leading-tight line-clamp-2 pr-2">{title}</span>
                      <button 
                        onClick={() => handleShare(title, uri)}
                        className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-sky-600 transition-colors"
                        title="Share with Family"
                      >
                        <Share2 size={12} />
                      </button>
                    </div>
                    <div className="flex gap-2 mt-auto">
                      <a href={uri} target="_blank" className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-slate-900 text-white text-[9px] font-bold uppercase tracking-wider hover:bg-black transition-colors">
                        <MapPin size={10} /> View
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          <span className="text-[9px] text-slate-400 mt-2 px-1 font-bold tracking-widest uppercase opacity-60">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ChatBubble;
