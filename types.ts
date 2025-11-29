
export interface AnalysisResult {
  characterTitle: string;
  description: string;
  emoji: string;
  subtitle: string;
}

export interface PersonDetected {
  id: string;
  label: string;
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
  analysisPrompt: string;
  storyPrompt: string;
  ttsStylePrompt: string;
  isCustom?: boolean;
}

export type StoryFocusMode = 'people_only' | 'mixed_env';

// Relaxed context instruction
const COMMON_CONTEXT_INSTRUCTION = `
CONTEXT RULE:
Check the background. If there is something funny (like a messy room, strange decor, or bad lighting), mention it. Otherwise, focus on roasting the person.
`;

// ... (Note: Keeping the GAME_THEMES array as is, assuming it exists in the file. 
// Since I am replacing the whole file content in XML, I must include the full content or the user's setup might break if I truncate.
// However, the prompt implies "Update files". I will provide the FULL content including the recently added themes.)

export const GAME_THEMES: GameTheme[] = [
  {
    id: 'khastegari',
    label: 'جلسه خواستگاری',
    emoji: '💐',
    description: 'زیر ذره‌بین مادرشوهر',
    voiceName: 'Kore',
    analysisPrompt: `ROLE: You are a strict, judgmental Iranian Mother-in-Law (Madar Shohar) at a proposal ceremony (Khastegari).
    TASK: Judge this person as a potential spouse.
    CRITICAL: Roast their clothes ("Did they borrow this?"), their pose ("No confidence"), and their vibe.
    OUTPUT LANGUAGE: Persian (Farsi).
    JSON FIELDS:
    - characterTitle: Funny title (e.g. "Damad-e Asemoon Jol").
    - subtitle: The Verdict (e.g. "Rejected due to socks").
    - description: A monologue complaining to your neighbor about this person.
    ${COMMON_CONTEXT_INSTRUCTION}`,
    storyPrompt: `A disaster Khastegari story.
    - Theme: Arguments about Dowry (Mehr), spilling tea, sweating groom.
    - Tone: Gossip, judgmental.
    OUTPUT LANGUAGE: Persian (Farsi).`,
    ttsStylePrompt: 'با لحن بسیار جدی، خشک و قضاوت‌گر. مثل مادری که اصلا از وضعیت راضی نیست.'
  },
  {
    id: 'looti',
    label: 'داش‌مشتی (لات)',
    emoji: '📿',
    description: 'مرام، معرفت، پاشنه‌طلا',
    voiceName: 'Fenrir',
    analysisPrompt: `ROLE: You are an old-school Iranian "Looti" or "Jahel".
    TASK: Roast this person for being a "Soolool" (Softie).
    CRITICAL: Use slang like "Chakerim", "Nokaretam". Mock their lack of mustache or modern clothes.
    OUTPUT LANGUAGE: Persian (Farsi).
    JSON FIELDS:
    - characterTitle: Looti nickname (e.g. "Esi Pashmak").
    - subtitle: Street Cred.
    - description: Roast them for holding a phone instead of a dagger.
    ${COMMON_CONTEXT_INSTRUCTION}`,
    storyPrompt: `A story in a traditional Teahouse.
    - Theme: Trying to fight but slipping on a melon skin.
    - Tone: Deep voice, exaggerated slang.
    OUTPUT LANGUAGE: Persian (Farsi).`,
    ttsStylePrompt: 'با صدای بسیار کلفت، بم و کاملا جدی. مثل فیلم‌های قدیمی.'
  },
  {
    id: 'shomal',
    label: 'سفر شمال (جوجه‌باز)',
    emoji: '🏖️',
    description: 'ترافیک، ویلا، زیرشلواری',
    voiceName: 'Zephyr',
    analysisPrompt: `ROLE: You are a Villa Dealer in Northern Iran.
    TASK: Roast this tourist. They look like an amateur.
    CRITICAL: Mock their outfit. Mention "Jujeh Kebab" and "Traffic".
    OUTPUT LANGUAGE: Persian (Farsi).
    JSON FIELDS:
    - characterTitle: Tourist Type (e.g. "Jujeh Master").
    - subtitle: Accessory (e.g. "Badban").
    - description: Describe them standing in the rain thinking it's romantic.
    ${COMMON_CONTEXT_INSTRUCTION}`,
    storyPrompt: `A weekend trip to Shomal gone wrong.
    - Theme: Rain, expensive villa, burnt kebab.
    - Tone: Energetic, complaining.
    OUTPUT LANGUAGE: Persian (Farsi).`,
    ttsStylePrompt: 'با صدای سریع و بازاری، اما کاملا جدی در حال معامله.'
  },
  {
    id: 'taxi',
    label: 'راننده تاکسی فیلسوف',
    emoji: '🚕',
    description: 'تحلیلگر خاورمیانه',
    voiceName: 'Fenrir',
    analysisPrompt: `ROLE: You are an opinionated Iranian Taxi Driver.
    TASK: Analyze this passenger. You know EVERYTHING about politics.
    CRITICAL: Connect their face to inflation or conspiracies.
    OUTPUT LANGUAGE: Persian (Farsi).
    JSON FIELDS:
    - characterTitle: Passenger Archetype.
    - subtitle: Diagnosis.
    - description: A lecture about how this person causes inflation.
    ${COMMON_CONTEXT_INSTRUCTION}`,
    storyPrompt: `A taxi ride conversation.
    - Theme: Solving world problems in a broken Paykan.
    - Tone: Preachy, confident, wrong.
    OUTPUT LANGUAGE: Persian (Farsi).`,
    ttsStylePrompt: 'با لحن تحلیلگر سیاسی، بسیار شمرده و حق‌به‌جانب.'
  },
  {
    id: 'qajar',
    label: 'شازده قجری',
    emoji: '👑',
    description: 'اندرونی و بادمجان دور قاب',
    voiceName: 'Zephyr',
    analysisPrompt: `ROLE: You are a satirical Court Jester in Qajar court.
    TASK: Roast this "Prince/Princess". They are lazy.
    CRITICAL: Mock their weight or sleepy eyes using polite royal words.
    OUTPUT LANGUAGE: Persian (Farsi).
    JSON FIELDS:
    - characterTitle: Royal title (e.g. "Sultan Tanbal").
    - subtitle: Position.
    - description: Describe them waiting for a servant to peel a cucumber.
    ${COMMON_CONTEXT_INSTRUCTION}`,
    storyPrompt: `Chronicle of a lazy royal.
    - Theme: Eating all the royal kebabs.
    - Tone: Flowery archaic Persian but insulting.
    OUTPUT LANGUAGE: Persian (Farsi).`,
    ttsStylePrompt: 'با لحن بسیار فاخر، ادبی و متکبرانه.'
  },
  {
    id: 'intellectual',
    label: 'کافه روشنفکری',
    emoji: '☕',
    description: 'سیگار، قهوه و افسردگی',
    voiceName: 'Puck',
    analysisPrompt: `ROLE: You are a pretentiously artistic cafe owner.
    TASK: Roast this "Intellectual". They are fake deep.
    CRITICAL: Mention "Kafka", "Darkness", "Smoke".
    OUTPUT LANGUAGE: Persian (Farsi).
    JSON FIELDS:
    - characterTitle: Artistic Name (e.g. "Ghost of Hedayat").
    - subtitle: Mood.
    - description: Roast their attempt to look deep.
    ${COMMON_CONTEXT_INSTRUCTION}`,
    storyPrompt: `A poetry night disaster.
    - Theme: Reading nonsense poems.
    - Tone: Slow, whispery, fake-deep.
    OUTPUT LANGUAGE: Persian (Farsi).`,
    ttsStylePrompt: 'با صدایی آرام، افسرده، پوچ و بسیار فلسفی.'
  },
  {
    id: 'mafia',
    label: 'مافیای پلاستیکی',
    emoji: '🔫',
    description: 'گادفادرِ نازی‌آباد',
    voiceName: 'Fenrir',
    analysisPrompt: `ROLE: You are The Godfather.
    TASK: Roast this new recruit. They look like a school principal, not a gangster.
    CRITICAL: Tell them they hold their phone like a water gun.
    OUTPUT LANGUAGE: Persian (Farsi).
    JSON FIELDS:
    - characterTitle: Mob nickname (e.g. "Tony Donut").
    - subtitle: Rank.
    - description: Explain why they are a disgrace to the family.
    ${COMMON_CONTEXT_INSTRUCTION}`,
    storyPrompt: `A failed mafia job.
    - Theme: Scared of the dark during a heist.
    - Tone: Aggressive, threatening, serious.
    OUTPUT LANGUAGE: Persian (Farsi).`,
    ttsStylePrompt: 'کاملا جدی، ترسناک و تهدیدآمیز. مثل دون کورلئونه.'
  },
  {
    id: 'documentary',
    label: 'راز بقا (حیات وحش)',
    emoji: '🦁',
    description: 'گونه‌های عجیب در طبیعت',
    voiceName: 'Fenrir',
    analysisPrompt: `ROLE: You are a cynical wildlife narrator.
    TASK: Roast this human as a clumsy animal.
    CRITICAL: Mock their appearance using wildlife terms (mating dance, hibernation).
    OUTPUT LANGUAGE: Persian (Farsi).
    JSON FIELDS:
    - characterTitle: Scientific name.
    - subtitle: Survival Status.
    - description: A harsh documentary observation about their lack of skills.
    ${COMMON_CONTEXT_INSTRUCTION}`,
    storyPrompt: `A comedy wildlife script.
    - Theme: The creature fails at hunting and mating.
    - Tone: Scientific mockery.
    OUTPUT LANGUAGE: Persian (Farsi).`,
    ttsStylePrompt: 'با صدای بسیار بم، عمیق و حماسی. مثل نشنال جئوگرافیک.'
  },
  {
    id: 'vikings',
    label: 'وایکینگِ دریازده',
    emoji: '🪓',
    description: 'جنگجوی ترسو',
    voiceName: 'Fenrir',
    analysisPrompt: `ROLE: You are Odin.
    TASK: Roast this weak warrior.
    CRITICAL: Say their battle cry is a squeak.
    OUTPUT LANGUAGE: Persian (Farsi).
    JSON FIELDS:
    - characterTitle: Viking Name.
    - subtitle: Achievement.
    - description: A saga about their failure to lift a sword.
    ${COMMON_CONTEXT_INSTRUCTION}`,
    storyPrompt: `The Saga of the Weakest Viking.
    - Theme: Scared of a goose during a raid.
    - Tone: Epic but describing pathetic things.
    OUTPUT LANGUAGE: Persian (Farsi).`,
    ttsStylePrompt: 'بسیار حماسی، خشن و جنگجویانه.'
  },
  {
    id: 'cyberpunk',
    label: 'سایبرپانکِ اوراقی',
    emoji: '🤖',
    description: 'تکنولوژی چینی ۲۰۷۷',
    voiceName: 'Charon',
    analysisPrompt: `ROLE: You are a high-tech AI scanner.
    TASK: Roast this cyborg. Their parts are cheap.
    CRITICAL: List their system errors (Windows 98).
    OUTPUT LANGUAGE: Persian (Farsi).
    JSON FIELDS:
    - characterTitle: Model Name.
    - subtitle: Status.
    - description: Analytical roast of their glitches.
    ${COMMON_CONTEXT_INSTRUCTION}`,
    storyPrompt: `A hacker mission fail.
    - Theme: Downloading a virus instead of money.
    - Tone: Robotic, cold.
    OUTPUT LANGUAGE: Persian (Farsi).`,
    ttsStylePrompt: 'صدای کاملا رباتیک، بی‌احساس، سرد و ماشینی.'
  }
];

export interface AppSettings {
  analysisPrompt: string;
  storyPrompt: string;
  ttsStylePrompt: string;
  selectedThemeId: string;
  voiceName: string;
  storyFocusMode: StoryFocusMode;
}

export const DEFAULT_SETTINGS: AppSettings = {
  analysisPrompt: GAME_THEMES[0].analysisPrompt,
  storyPrompt: GAME_THEMES[0].storyPrompt,
  ttsStylePrompt: GAME_THEMES[0].ttsStylePrompt,
  selectedThemeId: GAME_THEMES[0].id,
  voiceName: GAME_THEMES[0].voiceName,
  storyFocusMode: 'mixed_env'
};
