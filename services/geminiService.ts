
import { GoogleGenAI, Type, Modality, GenerateContentResponse } from "@google/genai";
import { AnalysisResult, PersonDetected, StoryResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Simple retry utility for API calls
const retry = async <T>(fn: () => Promise<T>, retries = 2): Promise<T> => {
  try {
    return await fn();
  } catch (e) {
    if (retries > 0) {
      console.warn(`API Call Failed. Retrying... Attempts left: ${retries}`, e);
      await new Promise(r => setTimeout(r, 1000));
      return retry(fn, retries - 1);
    }
    throw e;
  }
};

export const detectPeopleInImage = async (base64Image: string): Promise<PersonDetected[]> => {
  const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

  try {
    const response = await retry<GenerateContentResponse>(() => ai.models.generateContent({
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
    }));

    const text = response.text;
    if (!text) return [];
    const json = JSON.parse(text);
    return json.people || [];

  } catch (error) {
    console.error("Face Detection Failed:", error);
    return [];
  }
};

export const analyzeCharacter = async (base64Image: string, focusOn: string[], customPrompt: string): Promise<AnalysisResult> => {
  // Clean the base64 string if it has the header
  const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

  // Use the custom prompt as the base instructions
  let prompt = `${customPrompt}`;
  
  if (focusOn.length > 0) {
    prompt += `
    
    IMPORTANT INSTRUCTION:
    FOCUS ONLY on these specific people described here: ${focusOn.join(", ")}.
    Ignore anyone else in the background.
    
    Since there are multiple selected people (or a specific subset):
    Assign a collective Title and Description for the group based on the persona/theme.`;
  } else {
    prompt += `
    
    IMPORTANT INSTRUCTION:
    Analyze the main subject(s) in the frame.`;
  }

  prompt += `
    Return the result in this strict JSON structure:`;

  try {
    const response = await retry<GenerateContentResponse>(() => ai.models.generateContent({
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
            characterTitle: {
              type: Type.STRING,
              description: "The name of the character, animal, or role assigned to the person (in Persian)",
            },
            emoji: {
              type: Type.STRING,
              description: "One or more emojis representing the character",
            },
            description: {
              type: Type.STRING,
              description: "A short, creative explanation connecting visual features to the character role. Use casual Persian.",
            },
            subtitle: {
              type: Type.STRING,
              description: "A short label, status, power level, or roast level in Persian",
            }
          },
          required: ["characterTitle", "emoji", "description", "subtitle"],
        },
      },
    }));

    const text = response.text;
    if (!text) throw new Error("No response text from Gemini");
    
    return JSON.parse(text) as AnalysisResult;

  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    throw error;
  }
};

export const generateRoastAudio = async (text: string, stylePrompt: string, voiceName: string = 'Kore'): Promise<string> => {
  // We include the text directly in the prompt to be read.
  const prompt = `
  ${stylePrompt}
  
  Here is the text to read:
  "${text}"
  `;

  try {
    const response = await retry<GenerateContentResponse>(() => ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName },
          },
        },
      },
    }));

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio data returned");
    
    return base64Audio;
  } catch (error) {
    console.error("Audio Generation Failed:", error);
    throw error;
  }
};

export const generatePartyStory = async (base64Images: string[], customPrompt: string): Promise<StoryResult> => {
  // Prepare parts: images + prompt
  const parts: any[] = [];
  
  base64Images.forEach(img => {
    const cleanBase64 = img.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
    parts.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: cleanBase64
      }
    });
  });

  const prompt = `
    ${customPrompt}

    I have provided ${base64Images.length} photos in order.
    
    Rules:
    1. Create a Title for the story.
    2. For EACH photo, visually identify the Character/Role based on the theme.
    3. Write a paragraph of the story (in Persian) centered around this character.
    4. The story must flow logically from photo 1 to photo 2.
    
    Return JSON:
    {
      "title": "Story Title",
      "pages": [
        { "imageIndex": 0, "text": "Story part for first photo..." },
        ...
      ]
    }
  `;
  
  parts.push({ text: prompt });

  try {
    const response = await retry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            pages: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  imageIndex: { type: Type.INTEGER },
                  text: { type: Type.STRING }
                },
                required: ["imageIndex", "text"]
              }
            }
          },
          required: ["title", "pages"]
        }
      }
    }));

    const text = response.text;
    if (!text) throw new Error("No response text");
    return JSON.parse(text) as StoryResult;

  } catch (error) {
    console.error("Story Generation Failed:", error);
    throw error;
  }
};
