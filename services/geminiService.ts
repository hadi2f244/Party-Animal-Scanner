import { GoogleGenAI, Type } from "@google/genai";
import { AnimalResult, PersonDetected } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const detectPeopleInImage = async (base64Image: string): Promise<PersonDetected[]> => {
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
            text: `Analyze this image and identify all distinct humans visible.
            Return a JSON object with a "people" array.
            Each item should have:
            - "id": a unique short string (e.g. "p1", "p2")
            - "label": a very short visual description in Persian to help the user identify them (e.g. "مرد با کلاه قرمز", "خانم سمت چپ", "کودک خندان").
            
            If no people are clearly visible, return an empty array.`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            people: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  label: { type: Type.STRING }
                },
                required: ["id", "label"]
              }
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    const json = JSON.parse(text);
    return json.people || [];

  } catch (error) {
    console.error("Face Detection Failed:", error);
    return [];
  }
};

export const analyzePartyGuest = async (base64Image: string, focusOn: string[] = []): Promise<AnimalResult> => {
  // Clean the base64 string if it has the header
  const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

  let prompt = `You are a funny party entertainer. Look at this photo.`;
  
  if (focusOn.length > 0) {
    prompt += `
    FOCUS ONLY on these specific people described here: ${focusOn.join(", ")}.
    Ignore anyone else in the background.
    
    Since there are multiple selected people (or a specific subset):
    Describe them as a group or pair. Assign a collective animal theme (e.g. "Monkey Troupe", "The Hyena Squad") or a combo name.
    In the description, briefly roast these specific people based on their visual traits.`;
  } else {
    prompt += `
    If there is ONE person:
    Decide what animal they resemble based on their expression, vibe, or physical features.
    
    If there are MULTIPLE people:
    Describe them as a group. Assign a collective animal theme.`;
  }

  prompt += `
    Tone: Humorous, witty, and slightly "roasting" (make fun of them playfully) but keep it friendly for a party. 
    Language: Persian (Farsi).
    
    Return the result in this strict JSON structure:`;

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
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            animal: {
              type: Type.STRING,
              description: "The name of the animal or group name (e.g. 'Gorilla Team') in Persian",
            },
            emoji: {
              type: Type.STRING,
              description: "One or more emojis representing the person or group members (e.g. '🦁' or '🦁🐯')",
            },
            description: {
              type: Type.STRING,
              description: "A funny explanation of why they look like this. If multiple people, mention them individually within the text.",
            },
            roastLevel: {
              type: Type.STRING,
              description: "A short funny label for how bad the roast is (e.g., 'Mild', 'Spicy', 'Nuclear') in Persian",
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