
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

  // Use the custom prompt from settings (which is now in Persian)
  let prompt = `${customPrompt}`;
  
  if (focusOn.length > 0) {
    prompt += `
    
    تذکر مهم: فقط روی این افراد تمرکز کن: ${focusOn.join(", ")}.
    بقیه افراد در پس‌زمینه را نادیده بگیر.
    اگر چند نفر انتخاب شده‌اند، یک عنوان و توصیف گروهی برایشان بساز.`;
  } else {
    prompt += `
    
    سوژه اصلی (یا سوژه‌های اصلی) عکس را تحلیل کن.`;
  }

  prompt += `
    خروجی را دقیقاً با فرمت JSON زیر برگردان:`;

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
              description: "عنوان نقش یا شخصیت (به فارسی)",
            },
            emoji: {
              type: Type.STRING,
              description: "یک یا چند ایموجی مرتبط",
            },
            description: {
              type: Type.STRING,
              description: "توضیح خلاقانه که ویژگی‌های ظاهری و محیط عکس را به نقش ربط می‌دهد (به فارسی)",
            },
            subtitle: {
              type: Type.STRING,
              description: "یک زیرنویس کوتاه، لقب یا وضعیت (به فارسی)",
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
  // Include the style instructions for the reader
  const prompt = `
  ${stylePrompt}
  
  متن زیر را بخوان:
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

    من ${base64Images.length} عکس به ترتیب به تو داده‌ام.
    
    قوانین:
    1. یک عنوان (Title) جذاب برای داستان بساز.
    2. برای هر عکس، شخصیت‌ها و نقششان را در داستان مشخص کن.
    3. یک پاراگراف داستان (به فارسی) برای هر عکس بنویس.
    4. داستان باید از عکس 1 به عکس 2 و ... به صورت پیوسته جریان داشته باشد.
    5. حیاتی: حتماً محیط و پس‌زمینه هر عکس را در داستان توصیف کن (مثلاً "در آشپزخانه تاریک..." یا "روی مبل راحتی...").
    
    خروجی JSON:
    {
      "title": "عنوان داستان",
      "pages": [
        { "imageIndex": 0, "text": "متن داستان برای عکس اول..." },
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
