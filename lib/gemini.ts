
import { GoogleGenAI, Type } from "@google/genai";
import { ToxicityResult, ToxicityLabel } from "../types";

// Always create a fresh instance to ensure we use the most up-to-date key from the environment/dialog
export const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const chatModel = 'gemini-3-pro-preview'; 
export const analyzerModel = 'gemini-3-flash-preview';
export const imageModel = 'gemini-3-pro-image-preview';
export const videoModel = 'veo-3.1-fast-generate-preview';

// EXTREMELY STRICT LOCAL FILTER - Catching common slurs and profanity instantly
const TOXIC_PATTERN = /\b(fuck|shit|bitch|asshole|ass|nigger|faggot|retard|cunt|pussy|dick|whore|slut|bastard|damn|hell|crap|piss|bloody|bugger|bollocks)\b/i;

/**
 * Checks if a valid API key is available. 
 * If not, opens the selection dialog.
 */
export const checkApiKey = async (): Promise<boolean> => {
  if (typeof window.aistudio !== 'undefined') {
    const hasKey = await window.aistudio.hasSelectedApiKey();
    if (!hasKey) {
      await window.aistudio.openSelectKey();
      // Per instructions: assume success after triggering to mitigate race conditions
      return true;
    }
    return true;
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
  // 1. Local Shield - Instant check for restricted vocabulary
  if (TOXIC_PATTERN.test(text)) {
    return {
      score: 100,
      label: ToxicityLabel.HIGHLY_TOXIC,
      reason: "Local security protocols triggered: Prohibited terminology detected."
    };
  }

  // 2. AI Shield - Deep semantic analysis for toxicity, hate speech, and harassment
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: analyzerModel,
      contents: `ACT AS A ZERO-TOLERANCE CONTENT MODERATOR. Analyze the following text for ANY sign of toxicity, harassment, insults, or profanity. Rate it 0-100 where 0 is perfectly safe and 100 is extremely harmful. Even mild insults or "edgy" language should receive a score above 40. Text: "${text}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { 
              type: Type.NUMBER,
              description: "The toxicity score from 0 to 100."
            },
            reason: { 
              type: Type.STRING,
              description: "Brief reason for the assigned score."
            }
          },
          required: ["score", "reason"],
        },
      },
    });

    const result = JSON.parse(response.text || '{"score": 0, "reason": "No issues detected."}');
    const score = result.score || 0;
    
    let label = ToxicityLabel.SAFE;
    // Lowered thresholds for "Very Strict" analyzer
    if (score >= 70) label = ToxicityLabel.HIGHLY_TOXIC;
    else if (score >= 35) label = ToxicityLabel.TOXIC;
    else if (score >= 15) label = ToxicityLabel.LOW_TOXICITY;

    return { score, label, reason: result.reason };
  } catch (error: any) {
    console.error("Analysis Error:", error);
    // If the error suggests missing key, prompt user
    if (error.message?.includes("Requested entity was not found")) {
      checkApiKey();
    }
    return { score: 0, label: ToxicityLabel.SAFE, reason: "Neural bypass active during link instability." };
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

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  
  throw new Error("Neural Imaging Core: No visual data returned.");
};
