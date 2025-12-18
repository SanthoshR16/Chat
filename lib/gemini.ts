
import { GoogleGenAI, Type } from "@google/genai";
import { ToxicityResult, ToxicityLabel } from "../types";

// Always create a fresh instance to ensure we use the most up-to-date key from the environment/dialog
export const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const chatModel = 'gemini-3-pro-preview'; // Upgraded to Pro for better reasoning
export const analyzerModel = 'gemini-3-flash-preview';
export const imageModel = 'gemini-3-pro-image-preview';
export const videoModel = 'veo-3.1-fast-generate-preview';

// Local high-speed regex for instant blocking of common toxic patterns
const TOXIC_PATTERN = /\b(fuck|shit|bitch|asshole|nigger|faggot|retard|cunt|pussy|dick|whore)\b/i;

/**
 * Checks if a valid API key is available. 
 * If not, opens the selection dialog.
 */
export const checkApiKey = async (): Promise<boolean> => {
  if (typeof window.aistudio !== 'undefined') {
    const hasKey = await window.aistudio.hasSelectedApiKey();
    if (!hasKey) {
      await window.aistudio.openSelectKey();
      // Assume success after trigger as per instructions to avoid race conditions
      return true;
    }
  }
  return true;
};

export const getGeminiChat = (systemInstruction?: string) => {
  const ai = getAI();
  return ai.chats.create({
    model: chatModel,
    config: {
      systemInstruction: systemInstruction || "You are Giggle AI, a futuristic 2025 entity. Be witty, tech-savvy, and concise.",
    },
  });
};

export const analyzeToxicity = async (text: string): Promise<ToxicityResult> => {
  if (TOXIC_PATTERN.test(text)) {
    return {
      score: 100,
      label: ToxicityLabel.HIGHLY_TOXIC,
      reason: "Local shield triggered."
    };
  }

  try {
    const ai = getAI();
    const analysisPromise = ai.models.generateContent({
      model: analyzerModel,
      contents: `Scan for toxicity (0-100). 100 is extremely toxic. Text: "${text}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            reason: { type: Type.STRING }
          },
          required: ["score", "reason"],
        },
      },
    });

    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error("Neural analysis timeout")), 2000)
    );

    const response: any = await Promise.race([analysisPromise, timeoutPromise]);
    const result = JSON.parse(response.text || '{"score": 0, "reason": "Safe"}');
    const score = result.score || 0;
    
    let label = ToxicityLabel.SAFE;
    if (score > 80) label = ToxicityLabel.HIGHLY_TOXIC;
    else if (score > 40) label = ToxicityLabel.TOXIC;

    return { score, label, reason: result.reason };
  } catch (error: any) {
    if (error.message?.includes("Requested entity was not found")) {
      await checkApiKey();
    }
    return { score: 0, label: ToxicityLabel.SAFE, reason: "Neural bypass active." };
  }
};

export const startGroundedSearch = async (query: string, useMaps: boolean = false) => {
  const ai = getAI();
  const tools: any[] = [{ googleSearch: {} }];
  if (useMaps) tools.push({ googleMaps: {} });

  const response = await ai.models.generateContent({
    model: useMaps ? 'gemini-2.5-flash-lite-latest' : chatModel,
    contents: query,
    config: { tools },
  });

  return {
    text: response.text,
    sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
  };
};

// Added missing generateFuturisticImage function used in VisionPage
export const generateFuturisticImage = async (prompt: string, options?: { imageSize?: string, aspectRatio?: string }) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: imageModel,
    contents: {
      parts: [{ text: prompt }],
    },
    config: {
      imageConfig: {
        aspectRatio: (options?.aspectRatio as any) || "1:1",
        imageSize: (options?.imageSize as any) || "1K"
      },
    },
  });

  // Iterate through parts to find the image data
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  
  throw new Error("Neural Imaging Core: No visual data returned.");
};
