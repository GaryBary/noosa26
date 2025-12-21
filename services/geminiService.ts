import { GoogleGenAI, Content } from "@google/genai";
import { Role } from '../types.ts';
import type { Message } from '../types.ts';
import { SYSTEM_INSTRUCTION, NOOSA_HEADS_COORDS } from '../constants.ts';

const getApiKey = () => {
  try {
    // @ts-ignore
    return (typeof process !== 'undefined' && process.env?.API_KEY) || "";
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
    
    // Create new instance right before making an API call
    const ai = new GoogleGenAI({ apiKey });
    
    const formattedHistory: Content[] = history.map((msg) => ({
      role: msg.role === Role.USER ? 'user' : 'model',
      parts: [{ text: msg.text }],
    }));

    const contextualMessage = localityContext && localityContext !== 'All Noosa' 
      ? `[Locality Focus: ${localityContext}] ${currentMessage}`
      : currentMessage;

    // Use gemini-3-flash-preview for high performance and responsiveness.
    // googleSearch is used for grounding as it reliably provides URLs for local venues.
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        ...formattedHistory,
        { role: 'user', parts: [{ text: contextualMessage }] }
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ googleSearch: {} }],
        temperature: 0.15,
      },
    });

    const text = response.text || "I'm having trouble retrieving coastal insights right now.";
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;

    return { text, groundingMetadata };

  } catch (error: any) {
    console.error("Gemini Service Error:", error);
    
    // Check for API key errors to trigger key selection bridge
    if (
      error.message?.includes("API_KEY_MISSING") || 
      error.message?.includes("API_KEY_ERROR") ||
      error.message?.includes("403") ||
      error.message?.includes("API key not valid")
    ) {
      throw new Error("API_KEY_ERROR");
    }

    throw error;
  }
};

export const transcribeAudio = async (base64Audio: string): Promise<string> => {
  // Mock transcription for demonstration
  return "What are the best dining spots on Hastings Street?";
};

export const generateSpeech = async (text: string): Promise<string | null> => {
  return null;
};
