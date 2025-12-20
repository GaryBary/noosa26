
import { GoogleGenAI, Content, Modality } from "@google/genai";
import { Message, Role } from '../types';
import { SYSTEM_INSTRUCTION, NOOSA_HEADS_COORDS } from '../constants';

/**
 * PRODUCTION NOTE:
 * In a full production environment, this function would ideally point to your own 
 * backend endpoint (e.g. /api/chat) to keep the API_KEY hidden from the client browser.
 */
export const sendMessageToGemini = async (
  currentMessage: string,
  history: Message[],
  currentAudio?: string 
): Promise<{ text: string; groundingMetadata?: any }> => {
  
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("API_KEY_MISSING");
    
    const ai = new GoogleGenAI({ apiKey });

    // Filter history for API compliance (must start with user)
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

    // Use gemini-2.5-flash for Maps grounding support.
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
        temperature: 0.15, // Highly factual for concierge duties
      },
    });

    const candidate = response.candidates?.[0];
    let text = response.text || "";
    const groundingMetadata = candidate?.groundingMetadata;

    // Build smart response from grounding chunks if text is missing or poor
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

    // Final sanity check for local precision
    if (!text || text.trim().length < 5) {
      text = "As your Noosa concierge, I'm finding specific details for that request. It appears to be a unique local gem. I recommend checking **Signature Noosa** on Hastings Street for artisanal baked goods or **Bistro C** for a world-class dining experience.";
    }

    return { text, groundingMetadata };

  } catch (error: any) {
    console.error("Gemini Production Error:", error);
    
    // Bubble up auth errors to trigger API Key selection in this specific environment
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
    const apiKey = process.env.API_KEY;
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
    const apiKey = process.env.API_KEY;
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
