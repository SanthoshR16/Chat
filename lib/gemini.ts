
import { GoogleGenAI, Type } from "@google/genai";
import { ToxicityResult, ToxicityLabel } from "../types";

export const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });
export const analyzerModel = 'gemini-3-flash-preview';

// Missing exports for Cinema, Vision, and Intelligence pages
// General Video Generation model as per guidelines
export const videoModel = 'veo-3.1-fast-generate-preview';

/**
 * Perform a search with grounding (Google Search or Google Maps).
 * Maps grounding is only supported in Gemini 2.5 series.
 */
export const startGroundedSearch = async (query: string, isMaps: boolean = false) => {
  const ai = getAI();
  // Maps grounding requires 2.5 series; standard search uses gemini-3-flash-preview
  const model = isMaps ? 'gemini-2.5-flash-lite-latest' : 'gemini-3-flash-preview';
  
  const response = await ai.models.generateContent({
    model,
    contents: query,
    config: {
      // Maps grounding can be used with search, but here we toggle based on mode
      tools: [isMaps ? { googleMaps: {} } : { googleSearch: {} }]
    }
  });

  return {
    text: response.text || "",
    // Grounding chunks contain the source URLs (web or maps)
    sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
  };
};

/**
 * Generate high-quality images using Gemini 3 Pro.
 * Adheres to iterating through all parts to find the image payload.
 */
export const generateFuturisticImage = async (prompt: string, config?: { imageSize?: string }) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: { parts: [{ text: prompt }] },
    config: {
      imageConfig: {
        aspectRatio: "1:1",
        imageSize: (config?.imageSize || "1K") as any
      }
    }
  });
  
  // Find the image part in the response candidates as it may contain mixed modalities
  if (response.candidates?.[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  }
  throw new Error("No image content found in neural response.");
};

const TOXIC_PATTERN = /\b(fuck|shit|bitch|asshole|ass|nigger|faggot|retard|cunt|pussy|dick|whore|slut|bastard|damn|hell|crap|piss|bloody|bugger|bollocks|anal|porn|sex|kike|dyke|fag|tranny|rape|murder|kill|die|suicide|clit|cock|jizz|nigga)\b/i;

export const analyzeToxicity = async (text: string): Promise<ToxicityResult> => {
  if (TOXIC_PATTERN.test(text)) {
    return {
      score: 100,
      label: ToxicityLabel.HIGHLY_TOXIC,
      reason: "Restricted terminology violation."
    };
  }

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: analyzerModel,
      contents: `Moderation Mode: Analyze for toxicity/hate/harassment/slurs. Return JSON score 0-100 and reason. Be very strict. Text: "${text}"`,
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

    // Extracting text as a property, not a method, per guidelines
    const result = JSON.parse(response.text || '{"score": 0, "reason": "Clear"}');
    const score = result.score || 0;
    
    let label = ToxicityLabel.SAFE;
    if (score >= 60) label = ToxicityLabel.HIGHLY_TOXIC;
    else if (score >= 30) label = ToxicityLabel.TOXIC;
    else if (score >= 10) label = ToxicityLabel.LOW_TOXICITY;

    return { score, label, reason: result.reason };
  } catch (error: any) {
    return { score: 0, label: ToxicityLabel.SAFE, reason: "Neural bypass." };
  }
};

export const checkApiKey = async () => {
  if (typeof window !== 'undefined' && (window as any).aistudio) {
    const hasKey = await (window as any).aistudio.hasSelectedApiKey();
    if (!hasKey) {
      await (window as any).aistudio.openSelectKey();
    }
  }
};

export const getGeminiChat = () => {
  const ai = getAI();
  return ai.chats.create({
    model: 'gemini-3-pro-preview',
    config: {
      systemInstruction: 'You are Giggle AI, a witty digital assistant for the year 2025.'
    }
  });
};
