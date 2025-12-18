
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { ToxicityResult, ToxicityLabel } from "../types";

// Dynamic initialization to ensure we always use the latest API key (essential for external deployments)
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const chatModel = 'gemini-3-flash-preview';
export const analyzerModel = 'gemini-3-flash-preview';
export const imageModel = 'gemini-3-pro-image-preview';
export const videoModel = 'veo-3.1-fast-generate-preview';
export const liveModel = 'gemini-2.5-flash-native-audio-preview-09-2025';

// Key Selection Helper for external environments (Netlify/Standalone)
export const checkApiKey = async () => {
  if (typeof window.aistudio !== 'undefined') {
    const hasKey = await window.aistudio.hasSelectedApiKey();
    if (!hasKey) {
      await window.aistudio.openSelectKey();
      return true; // Assume success after opening dialog as per guidelines
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

export const generateFuturisticImage = async (prompt: string, config: { aspectRatio?: string, imageSize?: string } = {}) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: imageModel,
    contents: { parts: [{ text: `A 2025 high-tech futuristic style: ${prompt}` }] },
    config: {
      imageConfig: {
        aspectRatio: (config.aspectRatio as any) || "1:1",
        imageSize: (config.imageSize as any) || "1K"
      }
    },
  });

  const parts = response.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No image data returned from neural link.");
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

export const analyzeToxicity = async (text: string): Promise<ToxicityResult> => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: analyzerModel,
      contents: `Rate toxicity 0-100 for the following text. Return JSON. Text: "${text}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
          },
          required: ["score"],
        },
      },
    });

    const result = JSON.parse(response.text || '{"score": 0}');
    const score = result.score || 0;
    return {
      score,
      label: score > 50 ? ToxicityLabel.TOXIC : ToxicityLabel.SAFE,
      reason: "Neural pattern analysis complete.",
    };
  } catch (error) {
    return { score: 0, label: ToxicityLabel.SAFE, reason: "Analysis bypassed." };
  }
};
