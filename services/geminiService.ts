
import { GoogleGenAI, Content, Modality } from "@google/genai";
import { Message, Role } from '../types.ts';
import { SYSTEM_INSTRUCTION, NOOSA_HEADS_COORDS } from '../constants.ts';

const getApiKey = () => {
  try {
    // @ts-ignore
    return typeof process !== 'undefined' ? process.env.API_KEY : undefined;
  } catch (e) {
    return undefined;
  }
};

export const sendMessageToGemini = async (
  currentMessage: string,
  history: Message[],
  currentAudio?: string 
): Promise<{ text: string; groundingMetadata?: any }> => {
  
  try {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API_KEY_MISSING");
    
    const ai = new GoogleGenAI({ apiKey });

    const firstUserIdx = history.findIndex(m => m.role === Role.USER);
    const validHistory = firstUserIdx !== -1 ? history.slice(firstUserIdx, -1) : [];

    const formattedHistory: Content[] = validHistory.map((msg) => ({
      role: msg.role === Role.USER ? 'user' : 'model',
      parts: [
        ...(msg.text ? [{ text: msg.text }] : []),
        ...(msg.audio ? [{ inlineData: { mimeType: 'audio/webm', data: msg.audio } }] : [])
      ],
    }));

    const currentParts: any[] = [];
    if (currentMessage) currentParts.push({ text: currentMessage });
    if (currentAudio) {
      currentParts.push({ inlineData: { mimeType: 'audio/webm', data: currentAudio } });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        ...formattedHistory,
        { role: 'user', parts: currentParts }
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ googleMaps: {} }, { googleSearch: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: NOOSA_HEADS_COORDS
          }
        },
        temperature: 0.15,
      },
    });

    const candidate = response.candidates?.[0];
    let text = response.text || "";
    const groundingMetadata = candidate?.groundingMetadata;

    const chunks = groundingMetadata?.groundingChunks || [];
    if ((!text || text.length < 25) && chunks.length > 0) {
      const results: {title: string, uri: string}[] = [];
      const seen = new Set();
      
      chunks.forEach((c: any) => {
        const title = c.maps?.title || c.web?.title;
        const uri = c.maps?.uri || c.web?.uri;
        if (title && uri && !seen.has(title)) {
          seen.add(title);
          results.push({title, uri});
        }
      });

      if (results.length > 0) {
        text = `I have curated the finest locations matching your request in Noosa:\n\n` +
               results.map(r => `- **${r.title}**: A premier local destination. [Map](${r.uri}) [Website](${r.uri})`).join('\n');
      }
    }

    if (!text || text.trim().length < 5) {
      text = "As your Noosa concierge, I'm finding specific details for that request. It appears to be a unique local gem. I recommend checking **Signature Noosa** on Hastings Street for artisanal baked goods or **Bistro C** for a world-class dining experience.";
    }

    return { text, groundingMetadata };

  } catch (error: any) {
    console.error("Gemini Production Error:", error);
    if (error.message?.includes("403") || error.message?.includes("not found")) {
      throw error;
    }
    return { 
      text: "I'm currently unable to access the coastal network. Please ensure you are connected and try again shortly.",
      groundingMetadata: undefined 
    };
  }
};

export const transcribeAudio = async (base64Audio: string): Promise<string> => {
  try {
    const apiKey = getApiKey();
    if (!apiKey) return "";
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: 'audio/webm', data: base64Audio } },
          { text: "Transcribe the audio accurately. Focus on Noosa place names like Hastings Street, Gympie Terrace, or Noosa Woods." }
        ]
      }
    });

    return response.text?.trim() || "";
  } catch (error) {
    return "";
  }
};

export const generateSpeech = async (text: string): Promise<string | null> => {
  try {
    const apiKey = getApiKey();
    if (!apiKey) return null;
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
  } catch (error) {
    return null;
  }
};
