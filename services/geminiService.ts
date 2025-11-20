import { GoogleGenAI, Type } from "@google/genai";
import { AnimalResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzePartyGuest = async (base64Image: string): Promise<AnimalResult> => {
  // Clean the base64 string if it has the header
  const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64
            }
          },
          {
            text: `You are a funny party entertainer. Look at this person's photo. 
            Decide what animal they resemble based on their expression, vibe, or physical features. 
            Be humorous, witty, and slightly "roasting" (make fun of them playfully) but keep it friendly for a party. 
            Language: Persian (Farsi).
            
            Return the result in this strict JSON structure:`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            animal: {
              type: Type.STRING,
              description: "The name of the animal in Persian",
            },
            emoji: {
              type: Type.STRING,
              description: "A single emoji representing the animal",
            },
            description: {
              type: Type.STRING,
              description: "A funny, 2-sentence explanation of why they look like this animal, written in casual, funny Persian slang.",
            },
            roastLevel: {
              type: Type.STRING,
              description: "A short funny label for how bad the roast is (e.g., 'Mild', 'Spicy', 'Burned') in Persian",
            }
          },
          required: ["animal", "emoji", "description", "roastLevel"],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response text from Gemini");
    
    return JSON.parse(text) as AnimalResult;

  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    throw error;
  }
};
