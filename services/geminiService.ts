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
    
    // Create new instance right before making an API call to ensure it uses the latest key
    const ai = new GoogleGenAI({ apiKey });
    
    const formattedHistory: Content[] = history.map((msg) => ({
      role: msg.role === Role.USER ? 'user' : 'model',
      parts: [{ text: msg.text }],
    }));

    const contextualMessage = localityContext && localityContext !== 'All Noosa' 
      ? `[Focus Locality: ${localityContext}] ${currentMessage}`
      : currentMessage;

    // Gemini 2.5 series models support both googleSearch and googleMaps grounding tools.
    // Ensure exact camelCase for tool names as expected by the latest SDK versions.
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
        temperature: 0.2,
      },
    });

    const text = response.text || "I'm having trouble retrieving coastal insights right now.";
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;

    return { text, groundingMetadata };

  } catch (error: any) {
    console.error("Gemini Service Error:", error);
    
    // Propagate API Key related errors back to the UI to trigger the key selection bridge
    if (error.message?.includes("API_KEY_MISSING") || error.message?.includes("API_KEY_ERROR")) {
      throw new Error("API_KEY_ERROR");
    }
    
    // Handle the specific "Requested entity was not found" error as per instructions
    if (error.message?.includes("Requested entity was not found")) {
      throw new Error("API_KEY_ERROR");
    }

    throw error;
  }
};

export const transcribeAudio = async (base64Audio: string): Promise<string> => {
  console.log("Transcribe request for audio data...");
  return "Tell me about the best surf spots in Noosa today.";
};

export const generateSpeech = async (text: string): Promise<string | null> => {
  console.log("Speech generation request...");
  return null;
};
