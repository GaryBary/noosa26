import { GoogleGenAI, Content, Modality } from "@google/genai";
import { Role } from '../types.ts';
import type { Message } from '../types.ts';
import { SYSTEM_INSTRUCTION, NOOSA_HEADS_COORDS } from '../constants.ts';

const getApiKey = () => {
  try {
    // Check for process and process.env safely
    if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
      return process.env.API_KEY;
    }
    return "";
  } catch (e) {
    return "";
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

    return { 
      text: response.text || "I'm having trouble retrieving coastal insights right now.", 
      groundingMetadata: response.candidates?.[0]?.groundingMetadata 
    };

  } catch (error: any) {
    console.error("Gemini Error:", error);
    throw error;
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
          { text: "Transcribe the audio accurately. Focus on Noosa place names." }
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