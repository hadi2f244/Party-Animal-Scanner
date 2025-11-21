
export interface AnalysisResult {
  characterTitle: string; // e.g. "شیر سلطان", "پدرخوانده", "ناصرالدین شاه"
  description: string;
  emoji: string;
  subtitle: string; // e.g. "Roast Level", "Power Level", "Royal Title"
}

export interface PersonDetected {
  id: string;
  label: string; // e.g. "مرد با پیراهن قرمز"
}

export interface StoryPage {
  imageIndex: number;
  text: string;
  audioBase64?: string;
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
  STORY_CAPTURE = 'STORY_CAPTURE',
  STORY_LOADING = 'STORY_LOADING',
  STORY_PLAY = 'STORY_PLAY',
  SETTINGS = 'SETTINGS'
}

export interface LoadingProgress {
  currentStep: number;
  totalSteps: number;
  message: string;
  timeLeftSeconds: number;
}

export interface GameTheme {
  id: string;
  label: string;
  emoji: string;
  description: string;
  voiceName: string;
  // Prompts associated with this theme
  analysisPrompt: string;
  storyPrompt: string;
  ttsStylePrompt: string;
}

export const GAME_THEMES: GameTheme[] = [
  {
    id: 'documentary',
    label: 'راز بقا',
    emoji: '🦁',
    description: 'شبیه چه حیوانی هستید؟ با صدای مستند حیات وحش',
    voiceName: 'Kore',
    analysisPrompt: `You are a world-famous Wildlife Photographer and Narrator.
    Your Goal: Analyze the human in the photo and match them to a WILD ANIMAL based purely on visual traits.
    
    Tone: Dramatic, educational, but secretly judging them.
    Language: Persian (Farsi).
    
    Output Requirements:
    - Title: The Animal Name (e.g. "تمساح خسته").
    - Subtitle: Conservation Status or Danger Level (e.g. "در خطر انقراض", "بسیار خطرناک").
    - Description: Explain WHY they look like this animal (posture, eyes, hair). Use documentary vocabulary.`,
    
    storyPrompt: `You are the narrator of a "Human-Jungle" wildlife documentary.
    Task: Create a nature documentary story about these "animals".
    Tone: Epic, dramatic, serious voice but funny content.
    Language: Persian (Farsi).`,
    
    ttsStylePrompt: 'Read the following Persian text with a dramatic, deep, and serious "Wildlife Documentary Narrator" voice. Pause for effect like you are observing nature.'
  },
  {
    id: 'mafia',
    label: 'پدرخوانده',
    emoji: '🕶️',
    description: 'نقش شما در خانواده مافیا چیست؟',
    voiceName: 'Fenrir',
    analysisPrompt: `You are The Godfather (Don Corleone style).
    Your Goal: Look at this person. Decide what Role they play in the Mafia Crime Family.
    
    Tone: Threatening, raspy, slow, authoritative. Use Mafia slang.
    Language: Persian (Farsi).
    
    Output Requirements:
    - Title: Mafia Role (e.g. "دون کورلئونه", "خبرچین", "بادیگارد").
    - Subtitle: Their nickname in the streets (e.g. "پنجه طلا", "صورت زخمی").
    - Description: Why they fit this role based on their face/look. Be intimidating but classy.`,
    
    storyPrompt: `You are the narrator of a Mafia Crime Drama.
    Task: Tell the story of a heist or a meeting between these gangsters.
    Tone: Noir, dark, suspenseful.
    Language: Persian (Farsi).`,
    
    ttsStylePrompt: 'Read the following Persian text like a "Godfather" Mafia Boss. Slow, raspy, threatening, and very serious. Do not smile. Use a deep vocal fry.'
  },
  {
    id: 'qajar',
    label: 'دربار قاجار',
    emoji: '👑',
    description: 'اگر در زمان قاجار بودید چه کاره بودید؟',
    voiceName: 'Zephyr',
    analysisPrompt: `You are a Royal Historian from the Qajar Dynasty era of Iran.
    Your Goal: Assign a Qajar-era court role or title to this person based on their appearance.
    
    Tone: Extremely formal, old-fashioned Persian (Qajar style), exaggerated politeness but roasting.
    Language: Persian (Farsi) - Use words like "alihadrat", "ghable ye alam", "raiyat".
    
    Output Requirements:
    - Title: Qajar Title (e.g. "شازده", "سوگلی حرم", "ميرزا بنويس").
    - Subtitle: A royal decree or status (e.g. "ممنوع التصویر", "نور چشمی").
    - Description: Describe their attire and face as if painted on a Qajar canvas.`,
    
    storyPrompt: `You are narrating a historical chronicle of the Qajar court.
    Task: Tell a story about a day in the royal palace with these characters.
    Tone: Old-fashioned, poetic, historical satire.
    Language: Persian (Farsi).`,
    
    ttsStylePrompt: 'Read the following Persian text like an old Iranian storyteller from the Qajar era. Use formal, slightly shaky, poetic intonation.'
  },
  {
    id: 'cyberpunk',
    label: 'سایبرپانک ۲۰۷۷',
    emoji: '🤖',
    description: 'شخصیت شما در دنیای ربات‌ها و آینده',
    voiceName: 'Charon',
    analysisPrompt: `You are an AI System analyzing citizens of a Cyberpunk Dystopia (Year 2077).
    Your Goal: Scan the subject and assign them a Cyborg/Futuristic class.
    
    Tone: Cold, robotic, glitchy, analytical.
    Language: Persian (Farsi).
    
    Output Requirements:
    - Title: Cyber Class (e.g. "هکر نئونی", "شکارچی ربات", "سایبورگ مدل T-800").
    - Subtitle: System Status or Glitch Level (e.g. "System Critical", "Virus Detected").
    - Description: Analyze their "augmentations" and "tech-wear" (even if it's just glasses or a watch).`,
    
    storyPrompt: `You are the System AI logging an incident report in Neo-Tehran.
    Task: Describe a high-tech mission or failure involving these units.
    Tone: Robotic, sci-fi, cool.
    Language: Persian (Farsi).`,
    
    ttsStylePrompt: 'Read the following Persian text like a sentient AI or Robot. Monotone but slightly menacing. Beep boop style.'
  },
  {
    id: 'comedian',
    label: 'استندآپ کمدی',
    emoji: '🎤',
    description: 'سوژه خنده برای کمدین',
    voiceName: 'Puck',
    analysisPrompt: `You are a brutal Stand-up Comedian roasting an audience member.
    Your Goal: Roast this person based on their appearance.
    
    Tone: High energy, sarcastic, loud, fast-paced.
    Language: Persian (Farsi) - Use slang.
    
    Output Requirements:
    - Title: A funny nickname (e.g. "عاشق پیتزا", "سلطان خواب").
    - Subtitle: Roast Level (e.g. "جزغاله", "ته دیگی").
    - Description: Find the funniest visual flaw or feature and exaggerate it wildly.`,
    
    storyPrompt: `You are telling a funny anecdote at a comedy club about these people.
    Task: Create a comedy sketch story where these people get into trouble.
    Tone: Hilarious, punchy, fast.
    Language: Persian (Farsi).`,
    
    ttsStylePrompt: 'Read the following Persian text like an energetic Stand-up Comedian roasting a crowd. Use a punchy, fast, and sarcastic tone. Laugh slightly at the funny parts.'
  }
];

export interface AppSettings {
  analysisPrompt: string;
  storyPrompt: string;
  ttsStylePrompt: string;
  selectedThemeId: string;
  voiceName: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  analysisPrompt: GAME_THEMES[0].analysisPrompt,
  storyPrompt: GAME_THEMES[0].storyPrompt,
  ttsStylePrompt: GAME_THEMES[0].ttsStylePrompt,
  selectedThemeId: GAME_THEMES[0].id,
  voiceName: GAME_THEMES[0].voiceName
};
