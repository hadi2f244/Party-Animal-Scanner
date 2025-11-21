
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
      await new Promise(r => setTimeout(r, 1500)); // Increased wait time slightly
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
            - "label": a very short visual description written in Persian (Farsi) language (e.g. "مرد با کلاه قرمز", "خانم سمت چپ").
            
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

  // Use the custom prompt from settings
  let prompt = `${customPrompt}`;
  
  // Global Style Enforcement (English instructions for better logic)
  prompt += `
  \nGLOBAL DIRECTIVE:
  1. TONE: You are a ROAST COMEDIAN. Be mean, funny, sarcastic, and creative. Do not be boring.
  2. LANGUAGE: The JSON output values MUST be in PERSIAN (FARSI).
  3. CONTENT: Make fun of the person's face, pose, clothes, or vibe. Use funny metaphors.
  `;

  if (focusOn.length > 0) {
    prompt += `
    
    FOCUS INSTRUCTION:
    Analyze ONLY the people matching these descriptions: ${focusOn.join(", ")}.
    Ignore other background people.
    If multiple people are selected, create a group title/description.`;
  } else {
    prompt += `
    
    FOCUS INSTRUCTION:
    Analyze the main subject(s) of the photo.`;
  }

  prompt += `
    Return strictly valid JSON with this schema:`;

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
              description: "Funny/Roast character title in Persian",
            },
            emoji: {
              type: Type.STRING,
              description: "Relevant emojis",
            },
            description: {
              type: Type.STRING,
              description: "Creative roast description in Persian (max 3 sentences)",
            },
            subtitle: {
              type: Type.STRING,
              description: "Short funny subtitle/nickname in Persian",
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
  const prompt = `
  You are a talented Persian voice actor.
  
  Input Script (Persian):
  """
  ${text}
  """

  Directives:
  1. ACTION 1: Read the Title with high energy. DO NOT read the word "Title".
  2. ACTION 2: Perform a SHORT VOCAL SOUND EFFECT relevant to the theme (e.g., grunt for caveman, jazz scat for mafia, drum roll).
  3. ACTION 3: Read the Description with this style: "${stylePrompt}".
  
  CRITICAL:
  - Do NOT speak English.
  - Do NOT say "Emoji" or describe emojis.
  - Focus on the comedy and acting.
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
    
    GLOBAL STORY RULES:
    1. TONE: Heavy Roast & Comedy. Make fun of the people in the photos.
    2. LANGUAGE: Output MUST be in Persian (Farsi).
    3. LOGIC: Link the photos into a funny, disastrous narrative.
    4. FORMAT: Valid JSON.
    
    JSON Structure:
    {
      "title": "Funny Persian Title",
      "pages": [
        { "imageIndex": 0, "text": "Persian story paragraph..." },
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
