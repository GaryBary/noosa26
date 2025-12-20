import { GoogleGenAI, Content } from "@google/genai";
import { Role } from '../types.ts';
import type { Message } from '../types.ts';
import { SYSTEM_INSTRUCTION, NOOSA_HEADS_COORDS } from '../constants.ts';

const getApiKey = () => {
  try {
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
      // @ts-ignore
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
  localityContext?: string
): Promise<{ text: string; groundingMetadata?: any }> => {
  
  try {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API_KEY_MISSING");
    
    const ai = new GoogleGenAI({ apiKey });
    
    // Format history for Gemini
    const formattedHistory: Content[] = history.map((msg) => ({
      role: msg.role === Role.USER ? 'user' : 'model',
      parts: [{ text: msg.text }],
    }));

    // Inject locality context into the prompt if provided
    const contextualMessage = localityContext && localityContext !== 'All Noosa' 
      ? `[Current Locality Focus: ${localityContext}] ${currentMessage}`
      : currentMessage;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        ...formattedHistory,
        { role: 'user', parts: [{ text: contextualMessage }] }
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ googleMaps: {} }, { googleSearch: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: NOOSA_HEADS_COORDS
          }
        },
        temperature: 0.1,
      },
    });

    const text = response.text || "I'm having trouble retrieving coastal insights right now.";
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;

    return { text, groundingMetadata };

  } catch (error: any) {
    console.error("Gemini Service Error:", error);
    if (error.message?.includes("API_KEY_MISSING")) {
      throw new Error("API_KEY_ERROR");
    }
    throw error;
  }
};

/**
 * Note: Audio transcription and speech generation are currently stubbed 
 * until specific model support for those modalities is finalized in the environment.
 */
export const transcribeAudio = async (base64Audio: string): Promise<string> => {
  // Placeholder for audio-to-text functionality
  console.log("Transcribing audio...", base64Audio.substring(0, 20));
  return "What are the best surf spots in Noosa today?";
};

export const generateSpeech = async (text: string): Promise<string | null> => {
  // Placeholder for text-to-speech functionality
  console.log("Generating speech for:", text.substring(0, 20));
  return null;
};
