
export interface AnimalResult {
  animal: string;
  description: string;
  emoji: string;
  roastLevel: string;
}

export interface PersonDetected {
  id: string;
  label: string; // e.g. "مرد با پیراهن قرمز"
}

export interface StoryPage {
  imageIndex: number; // Which photo from the captured array does this text belong to?
  text: string;
  audioBase64?: string; // Pre-loaded narration audio
}

export interface StoryResult {
  title: string;
  pages: StoryPage[];
}

export enum AppState {
  HOME = 'HOME',
  CAMERA = 'CAMERA',
  LOADING = 'LOADING',
  SELECTION = 'SELECTION',
  RESULT = 'RESULT',
  ERROR = 'ERROR',
  STORY_CAPTURE = 'STORY_CAPTURE', // Multi-photo mode
  STORY_LOADING = 'STORY_LOADING', // Specific loading state for story generation
  STORY_PLAY = 'STORY_PLAY', // Playing the story
  SETTINGS = 'SETTINGS' // New Settings Screen
}

export interface LoadingProgress {
  currentStep: number;
  totalSteps: number;
  message: string;
  timeLeftSeconds: number;
}

export interface AppSettings {
  analysisPrompt: string;
  storyPrompt: string;
  ttsStylePrompt: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  analysisPrompt: `You are a funny party entertainer. Look at this photo.
Decide what animal they resemble based on their expression, vibe, or physical features.
Tone: Humorous, witty, and slightly "roasting" (make fun of them playfully) but keep it friendly for a party. 
Language: Persian (Farsi).`,
  
  storyPrompt: `You are a narrator of a funny wildlife documentary about a "Human-Jungle".
For each photo, identify the person as a specific wild animal (e.g., "The Grumpy Bear", "The Party Parrot", "The Sleepy Sloth") based on their expression.
Write a connected story in Persian where these animals interact in the jungle.
Do NOT use generic story. You MUST refer to them by their animal names in the story.
Tone: Funny, Wildlife Documentary style, Energetic Persian.`,

  ttsStylePrompt: `Read the following Persian text with a dramatic and funny "Wildlife Documentary Narrator" voice.`
};
