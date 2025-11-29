
import { GoogleGenAI, Type, Modality, GenerateContentResponse } from "@google/genai";
import { AnalysisResult, PersonDetected, StoryResult, StoryFocusMode } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Simple retry utility for API calls
const retry = async <T>(fn: () => Promise<T>, retries = 2): Promise<T> => {
  try {
    return await fn();
  } catch (e) {
    if (retries > 0) {
      console.warn(`API Call Failed. Retrying... Attempts left: ${retries}`, e);
      await new Promise(r => setTimeout(r, 1500)); 
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

export const analyzeScene = async (base64Image: string, customPrompt: string): Promise<AnalysisResult> => {
  const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
  
  // Extract the ROLE from the custom prompt to maintain the Persona, but override the task.
  let prompt = `${customPrompt}`;
  
  prompt += `
  \nGLOBAL DIRECTIVE FOR SCENE ANALYSIS:
  1. TASK: Ignore instructions to focus on a specific person. Instead, analyze the ENTIRE SCENE (The room, the objects, the mess, the decor, AND the people).
  2. TONE: You are still a ROAST COMEDIAN in the character defined above. Roast the ENVIRONMENT.
  3. LANGUAGE: Output JSON values in PERSIAN (FARSI).
  4. OBSERVATION: Find funny details in the background (e.g. "Ugly curtains", "Cheap furniture", "Dirty plates").
  
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
              description: "Funny Title for the Scene/Location in Persian",
            },
            emoji: {
              type: Type.STRING,
              description: "Relevant emojis for the environment/objects",
            },
            description: {
              type: Type.STRING,
              description: "Creative roast description of the room, objects, and overall vibe in Persian.",
            },
            subtitle: {
              type: Type.STRING,
              description: "Short funny subtitle for the atmosphere in Persian",
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
    console.error("Gemini Scene Analysis Failed:", error);
    throw error;
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

  // Improved Logic for Single vs Multi-Person Analysis
  if (focusOn.length > 1) {
    prompt += `
    
    FOCUS INSTRUCTION (MULTI-PERSON MODE):
    You have selected ${focusOn.length} specific people: [ ${focusOn.join(" AND ")} ].
    
    CRITICAL RULES FOR GROUPS:
    1. SYNTHESIS: You MUST describe/roast ALL selected people in the 'description'. Name them if possible (e.g. "The one on the left... while the one on the right...").
    2. TITLE: Create a collective plural title for the group (e.g., "The Partners in Crime", "Dumb & Dumber", "The Lost Tourists").
    3. DYNAMIC: Comment on how they look *together* or interact (e.g., "One looks confused, while the other is trying too hard").
    4. ROAST: Roast them as a team. Do NOT ignore any selected person.
    `;
  } else if (focusOn.length === 1) {
    prompt += `
    
    FOCUS INSTRUCTION:
    Analyze ONLY the person matching this description: ${focusOn[0]}.
    Ignore other people in the background unless they are doing something hilarious.`;
  } else {
    prompt += `
    
    FOCUS INSTRUCTION:
    Analyze the main subject(s) of the photo. If multiple people are central, roast them as a group.`;
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
              description: "Funny/Roast character title (or Group Title) in Persian",
            },
            emoji: {
              type: Type.STRING,
              description: "Relevant emojis (multiple if group)",
            },
            description: {
              type: Type.STRING,
              description: "Creative roast description in Persian. MUST cover all selected people if a group.",
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
  // STRICT Prompt to prevent the model from reading instructions
  const prompt = `
  TASK: You are a professional voice actor.
  INSTRUCTION: Read the provided text below in Persian (Farsi).
  
  STYLE RULES:
  1. Voice Tone: ${stylePrompt}
  2. ACTION: Start with a 3-second vocal sound effect (like a drum roll, heavy breathing, jazz scat, or dramatic gasp) fitting the tone, THEN read the text.
  3. RESTRICTION: Do NOT read any labels like "Title:" or "Description:". Do NOT say "Here is the audio". Just perform.
  
  TEXT TO READ:
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

    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts || parts.length === 0) {
        throw new Error("Empty response from TTS model");
    }

    const audioPart = parts.find(p => p.inlineData?.data);
    
    if (audioPart && audioPart.inlineData && audioPart.inlineData.data) {
        return audioPart.inlineData.data;
    }
    
    const textPart = parts.find(p => p.text);
    if (textPart && textPart.text) {
        console.warn("TTS Error (Model returned text):", textPart.text);
        throw new Error(`TTS generation failed: ${textPart.text}`);
    }

    throw new Error("No audio data returned");
  } catch (error) {
    console.error("Audio Generation Failed:", error);
    throw error;
  }
};

export const generatePartyStory = async (base64Images: string[], customPrompt: string, focusMode: StoryFocusMode = 'mixed_env'): Promise<StoryResult> => {
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

  let pageLimitInstruction = "";
  if (base64Images.length === 1) {
      pageLimitInstruction = "RESTRICTION: Since there is only 1 image, create ONLY 1 story page. Do not repeat the image multiple times.";
  }

  // Focus Mode Instruction
  let focusInstruction = "";
  if (focusMode === 'people_only') {
      focusInstruction = "STORY FOCUS: Focus strictly on the PEOPLE, their expressions, dialogue, and actions. Ignore inanimate objects unless necessary.";
  } else {
      focusInstruction = "STORY FOCUS: You MUST incorporate the ENVIRONMENT, OBJECTS, and BACKGROUND into the plot. Roast the furniture, the walls, and the mess as much as the people.";
  }

  const prompt = `
    ${customPrompt}
    
    GLOBAL STORY RULES:
    1. TONE: Heavy Roast & Comedy.
    2. LANGUAGE: Output MUST be in Persian (Farsi).
    3. LOGIC: Link the photos into a funny, disastrous narrative.
    4. FORMAT: Valid JSON.
    ${focusInstruction}
    ${pageLimitInstruction}
    
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
