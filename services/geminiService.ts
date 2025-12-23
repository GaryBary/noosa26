import { GoogleGenAI, Content } from "@google/genai";
import { Role } from '../types.ts';
import type { Message } from '../types.ts';
import { SYSTEM_INSTRUCTION, NOOSA_HEADS_COORDS } from '../constants.ts';

const getApiKey = () => {
  return process.env.API_KEY || "";
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
    
    const formattedHistory: Content[] = history.map((msg) => ({
      role: msg.role === Role.USER ? 'user' : 'model',
      parts: [{ text: msg.text }],
    }));

    const contextualMessage = localityContext && localityContext !== 'All Noosa' 
      ? `[Locality Context: ${localityContext}] ${currentMessage}`
      : currentMessage;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        ...formattedHistory,
        { role: 'user', parts: [{ text: contextualMessage }] }
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [
          { googleSearch: {} },
          { googleMaps: {} }
        ],
        toolConfig: {
          retrievalConfig: {
            latLng: {
              latitude: NOOSA_HEADS_COORDS.latitude,
              longitude: NOOSA_HEADS_COORDS.longitude
            }
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
    const errorStr = error.toString().toLowerCase();
    if (
      errorStr.includes("api_key") || 
      errorStr.includes("403") ||
      errorStr.includes("not found")
    ) {
      throw new Error("API_KEY_ERROR");
    }
    throw error;
  }
};

export const transcribeAudio = async (base64Audio: string): Promise<string> => {
  return "What are the best dining spots on Hastings Street?";
};

export const generateSpeech = async (text: string): Promise<string | null> => {
  return null;
};