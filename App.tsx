

import React, { useState, useEffect } from 'react';
import { Camera, Sparkles, PartyPopper, CheckCircle2, Circle, ArrowLeft, BookOpen, Clock, Settings, Armchair, User } from 'lucide-react';
import { analyzeCharacter, analyzeScene, detectPeopleInImage, generatePartyStory, generateRoastAudio } from './services/geminiService';
import { CameraView } from './components/CameraView';
import { ResultCard } from './components/ResultCard';
import { StoryPlayer } from './components/StoryPlayer';
import { SettingsView } from './components/SettingsView';
import { AnalysisResult, AppState, PersonDetected, StoryResult, LoadingProgress, AppSettings, DEFAULT_SETTINGS, GameTheme, GAME_THEMES } from './types';

export const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.HOME);
  const [imageSrc, setImageSrc] = useState<string>('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string>('در حال پردازش...');
  
  // Selection flow state
  const [detectedPeople, setDetectedPeople] = useState<PersonDetected[]>([]);
  const [selectedPeopleIds, setSelectedPeopleIds] = useState<Set<string>>(new Set());
  const [personNames, setPersonNames] = useState<Record<string, string>>({});

  // User provided names (Legacy/Story/Fallback)
  const [userProvidedNames, setUserProvidedNames] = useState<string>('');
  
  // Story Mode State
  const [storyImages, setStoryImages] = useState<string[]>([]);
  const [storyResult, setStoryResult] = useState<StoryResult | null>(null);
  const [loadingProgress, setLoadingProgress] = useState<LoadingProgress | null>(null);

  // Settings State
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [customThemes, setCustomThemes] = useState<GameTheme[]>([]);

  // Flag to know if we are doing scene analysis (to route the camera capture)
  const [isSceneMode, setIsSceneMode] = useState(false);

  // Load settings and themes from local storage on mount
  useEffect(() => {
    // Load Settings
    const savedSettings = localStorage.getItem('partyApp_settings_v13');
    if (savedSettings) {
        try {
            const parsed = JSON.parse(savedSettings);
            setSettings({ ...DEFAULT_SETTINGS, ...parsed });
        } catch (e) {
            console.error("Failed to parse settings", e);
        }
    }

    // Load Custom Themes
    const savedThemes = localStorage.getItem('partyApp_custom_themes');
    if (savedThemes) {
        try {
            const parsedThemes = JSON.parse(savedThemes);
            setCustomThemes(parsedThemes);
        } catch (e) {
            console.error("Failed to parse custom themes", e);
        }
    }
  }, []);

  const saveSettings = (newSettings: AppSettings) => {
      setSettings(newSettings);
      localStorage.setItem('partyApp_settings_v13', JSON.stringify(newSettings));
      setAppState(AppState.HOME);
  };

  const handleAddTheme = (newTheme: GameTheme) => {
    const updatedThemes = [...customThemes, newTheme];
    setCustomThemes(updatedThemes);
    localStorage.setItem('partyApp_custom_themes', JSON.stringify(updatedThemes));
  };

  const handleDeleteTheme = (themeId: string) => {
    const updatedThemes = customThemes.filter(t => t.id !== themeId);
    setCustomThemes(updatedThemes);
    localStorage.setItem('partyApp_custom_themes', JSON.stringify(updatedThemes));
    
    // If deleted theme was selected, revert to default
    if (settings.selectedThemeId === themeId) {
        setSettings(DEFAULT_SETTINGS);
    }
  };

  const funnyLoadingMessages = [
    "در حال اسکن چهره‌ها...",
    "در حال هماهنگی با بازیگران...",
    "بررسی سوابق تاریخی...",
    "تحلیل شخصیت...",
    "نوشتن سناریو...",
    "تماس با نویسندگان هالیوود...",
    "تنظیم نور صحنه...",
  ];

  // --- Standard Mode Functions ---

  const handleImageSelected = async (src: string) => {
    setImageSrc(src);
    setAppState(AppState.LOADING);
    setUserProvidedNames('');
    setPersonNames({}); // Reset per-person names
    
    if (isSceneMode) {
        // Direct Scene Analysis using the specific Scene Prompt
        setLoadingMessage("در حال بررسی محیط و اشیاء...");
        try {
            const analysisResult = await analyzeScene(src, settings.scenePrompt);
            setResult(analysisResult);
            setAppState(AppState.RESULT);
        } catch (error) {
            console.error(error);
            setAppState(AppState.ERROR);
        }
        return;
    }

    // Normal Character Analysis Flow
    setLoadingMessage("در حال شناسایی افراد...");
    try {
      const people = await detectPeopleInImage(src);
      
      if (people.length === 0) {
        // No detection, check if we need names
        if (settings.askUserForName) {
            setAppState(AppState.NAME_INPUT);
        } else {
            runAnalysis(src, []);
        }
      } else {
        // Whether 1 or multiple, if we need names OR multiple people, we go to SELECTION
        setDetectedPeople(people);
        setSelectedPeopleIds(new Set(people.map(p => p.id)));
        
        // If >1 person OR asking for names is enabled, show selection screen
        if (people.length > 1 || settings.askUserForName) {
            setAppState(AppState.SELECTION);
        } else {
            runAnalysis(src, [people[0].label]);
        }
      }
    } catch (error) {
      console.error("Detection error", error);
      if (settings.askUserForName) {
          setAppState(AppState.NAME_INPUT);
      } else {
          runAnalysis(src, []);
      }
    }
  };

  const runAnalysis = async (src: string, focusLabels: string[], names: string[] = []) => {
    setAppState(AppState.LOADING);
    const msgInterval = setInterval(() => {
        setLoadingMessage(funnyLoadingMessages[Math.floor(Math.random() * funnyLoadingMessages.length)]);
    }, 2000);

    // Prepare names list
    let nameList = names;
    if (nameList.length === 0 && userProvidedNames) {
        nameList = userProvidedNames.split(',').map(n => n.trim()).filter(n => n.length > 0);
    }

    try {
      // Pass custom prompt from settings
      const analysisResult = await analyzeCharacter(src, focusLabels, settings.analysisPrompt, nameList);
      setResult(analysisResult);
      setAppState(AppState.RESULT);
    } catch (error) {
      console.error(error);
      setAppState(AppState.ERROR);
    } finally {
        clearInterval(msgInterval);
    }
  };

  const handleSelectionConfirm = () => {
    const selectedPeople = detectedPeople.filter(p => selectedPeopleIds.has(p.id));
    
    if (selectedPeople.length === 0 && detectedPeople.length > 0) {
        alert("لطفا حداقل یک نفر را انتخاب کنید");
        return;
    }

    const selectedLabels = selectedPeople.map(p => p.label);
    
    // Collect names ONLY for selected people
    const names = selectedPeople
        .map(p => personNames[p.id])
        .filter(n => n && n.trim().length > 0);

    runAnalysis(imageSrc, selectedLabels, names);
  };

  const togglePersonSelection = (id: string) => {
    const newSet = new Set(selectedPeopleIds);
    if (newSet.has(id)) {
        newSet.delete(id);
    } else {
        newSet.add(id);
    }
    setSelectedPeopleIds(newSet);
  };
  
  const handleNameChange = (id: string, name: string) => {
      setPersonNames(prev => ({
          ...prev,
          [id]: name
      }));
  };

  // --- Story Mode Functions ---

  const startStoryMode = () => {
    setStoryImages([]);
    setAppState(AppState.STORY_CAPTURE);
  };

  const handleStoryCaptureFinish = async (images: string[]) => {
    setStoryImages(images);
    setUserProvidedNames('');
    
    if (settings.askUserForName) {
        setAppState(AppState.NAME_INPUT);
    } else {
        startStoryGeneration(images);
    }
  };
  
  const startStoryGeneration = async (images: string[]) => {
    setAppState(AppState.STORY_LOADING);
    
    const totalSteps = 1 + images.length;
    let currentStep = 0;
    
    // Prepare names
    const nameList = userProvidedNames.split(',').map(n => n.trim()).filter(n => n.length > 0);

    const updateProgress = (msg: string) => {
        currentStep++;
        const remainingSteps = totalSteps - currentStep;
        const estimatedTime = remainingSteps * 3; 
        
        setLoadingProgress({
            currentStep,
            totalSteps,
            message: msg,
            timeLeftSeconds: estimatedTime < 0 ? 0 : estimatedTime
        });
    };

    setLoadingProgress({
        currentStep: 0,
        totalSteps,
        message: "در حال نوشتن سناریو...",
        timeLeftSeconds: totalSteps * 3
    });

    try {
        const story = await generatePartyStory(images, settings.storyPrompt, settings.storyFocusMode, settings.storyLength, nameList);
        updateProgress("سناریو نوشته شد! در حال ضبط صدا...");

        const pagesWithAudio = [];
        
        for (let i = 0; i < story.pages.length; i++) {
            const page = story.pages[i];
            
            updateProgress(`ضبط صدای صفحه ${i + 1} از ${story.pages.length}...`);
            let audioBase64 = "";
            try {
                audioBase64 = await generateRoastAudio(page.text, settings.ttsStylePrompt, settings.voiceName);
            } catch (e) {
                console.warn("Audio generation failed for page " + i);
            }

            pagesWithAudio.push({
                ...page,
                audioBase64
            });
        }

        setStoryResult({ ...story, pages: pagesWithAudio });
        setAppState(AppState.STORY_PLAY);

    } catch (error) {
        console.error(error);
        setAppState(AppState.ERROR);
    } finally {
        setLoadingProgress(null);
    }
  };

  // --- Shared Functions ---

  const playResultAudio = async (text: string): Promise<string> => {
      return await generateRoastAudio(text, settings.ttsStylePrompt, settings.voiceName);
  }

  const resetApp = () => {
    setAppState(AppState.HOME);
    setImageSrc('');
    setResult(null);
    setDetectedPeople([]);
    setStoryImages([]);
    setStoryResult(null);
    setLoadingProgress(null);
    setIsSceneMode(false);
    setUserProvidedNames('');
    setPersonNames({});
  };
  
  const handleNameSubmit = () => {
      if (storyImages.length > 0) {
          startStoryGeneration(storyImages);
      } else {
          // Fallback for when we came from NAME_INPUT (e.g. no faces found)
          runAnalysis(imageSrc, []);
      }
  };

  // Combine default and custom themes
  const allThemes = [...GAME_THEMES, ...customThemes];

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center py-8 px-4 relative overflow-hidden font-vazir">
      {/* Background Ambient Effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-700/30 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-pink-700/20 rounded-full blur-[120px] pointer-events-none"></div>

      {appState === AppState.HOME && (
        <div className="w-full max-w-md flex flex-col items-center justify-center min-h-[80vh] space-y-6 animate-fade-in relative">
            <button 
                onClick={() => setAppState(AppState.SETTINGS)}
                className="absolute top-0 right-0 p-3 bg-white/10 hover:bg-white/20 rounded-full text-gray-300 hover:text-white transition backdrop-blur-sm z-10"
            >
                <Settings className="w-6 h-6" />
            </button>

            <div className="text-center space-y-4 pt-10">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-tr from-yellow-400 to-orange-500 shadow-lg shadow-orange-500/20 mb-4 transform rotate-12">
                    <PartyPopper className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-500 to-red-500">
                    داستانگو
                </h1>
                <p className="text-gray-400 text-lg">
                    داستان‌سرای هوشمند برای مهمونی‌ها
                </p>
                
                {/* Current Theme Badge */}
                <div className="inline-flex items-center gap-2 bg-gray-800/60 px-4 py-1 rounded-full text-sm text-gray-300 border border-gray-700">
                    <span>ژانر فعلی:</span>
                    <span className="text-white font-bold">
                        {allThemes.find(t => t.id === settings.selectedThemeId)?.label || 'شخصی'}
                    </span>
                    <span>{allThemes.find(t => t.id === settings.selectedThemeId)?.emoji}</span>
                </div>
            </div>

            <div className="w-full space-y-4">
                <button 
                    onClick={startStoryMode}
                    className="w-full group flex items-center justify-between p-6 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 transition-all duration-200 transform hover:scale-[1.02] shadow-xl shadow-pink-900/30"
                >
                    <div className="text-right">
                        <span className="block text-xl font-bold">داستان‌سازی</span>
                        <span className="text-pink-200 text-sm">چند تا عکس بگیر تا قصه بسازم</span>
                    </div>
                    <div className="bg-white/20 p-3 rounded-full">
                        <BookOpen className="w-8 h-8 text-white" />
                    </div>
                </button>

                <button 
                    onClick={() => { setIsSceneMode(true); setAppState(AppState.CAMERA); }}
                    className="w-full group flex items-center justify-between p-6 rounded-2xl bg-gradient-to-r from-teal-600 to-green-600 hover:from-teal-500 hover:to-green-500 transition-all duration-200 transform hover:scale-[1.02] shadow-xl shadow-teal-900/30"
                >
                    <div className="text-right">
                        <span className="block text-xl font-bold">تحلیل محیط و اشیاء</span>
                        <span className="text-teal-200 text-sm">دکوراسیون و اتمسفر رو بسنج!</span>
                    </div>
                    <div className="bg-white/20 p-3 rounded-full">
                        <Armchair className="w-8 h-8 text-white" />
                    </div>
                </button>
                
                <button 
                    onClick={() => { setIsSceneMode(false); setAppState(AppState.CAMERA); }}
                    className="w-full group flex items-center justify-between p-6 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 transition-all duration-200 transform hover:scale-[1.02] shadow-xl shadow-blue-900/30"
                >
                    <div className="text-right">
                        <span className="block text-xl font-bold">تحلیل شخصیت</span>
                        <span className="text-indigo-200 text-sm">یه عکس بگیر و نقشش رو ببین!</span>
                    </div>
                    <div className="bg-white/20 p-3 rounded-full">
                        <Camera className="w-8 h-8 text-white" />
                    </div>
                </button>
            </div>
        </div>
      )}

      {appState === AppState.SETTINGS && (
        <SettingsView 
            currentSettings={settings} 
            availableThemes={allThemes}
            onSave={saveSettings} 
            onClose={() => setAppState(AppState.HOME)} 
            onAddTheme={handleAddTheme}
            onDeleteTheme={handleDeleteTheme}
        />
      )}

      {appState === AppState.CAMERA && (
        <CameraView 
            onCapture={handleImageSelected} 
            onClose={() => setAppState(AppState.HOME)}
        />
      )}

      {appState === AppState.STORY_CAPTURE && (
        <CameraView 
            onCapture={() => {}} 
            onClose={() => setAppState(AppState.HOME)}
            multiMode={true}
            onMultiCaptureFinish={handleStoryCaptureFinish}
        />
      )}

      {appState === AppState.STORY_PLAY && storyResult && (
        <StoryPlayer 
            images={storyImages}
            story={storyResult}
            onClose={resetApp}
        />
      )}

      {/* NAME INPUT SCREEN (FALLBACK for Story Mode or No Faces) */}
      {appState === AppState.NAME_INPUT && (
         <div className="w-full max-w-md flex flex-col items-center min-h-[80vh] animate-fade-in px-4">
             <h2 className="text-2xl font-bold mb-6 text-purple-300">معرفی افراد</h2>
             <div className="w-full bg-gray-800/50 p-6 rounded-2xl border border-white/10 space-y-4">
                 <p className="text-gray-300 text-center mb-2">
                     اسم افرادی که توی عکس هستن رو بنویس تا با اسم خودشون شوخی کنم!
                 </p>
                 <input 
                    type="text" 
                    value={userProvidedNames}
                    onChange={(e) => setUserProvidedNames(e.target.value)}
                    placeholder="مثلاً: علی، مریم، حسن"
                    className="w-full bg-black/40 border border-gray-600 rounded-xl p-4 text-white text-lg focus:border-purple-500 outline-none text-center"
                    autoFocus
                 />
                 <p className="text-xs text-gray-500 text-center">
                     (می‌تونی خالی بذاری تا خودم براشون لقب انتخاب کنم)
                 </p>
             </div>
             
             <div className="flex gap-4 w-full mt-auto">
                <button 
                    onClick={resetApp}
                    className="p-4 rounded-xl bg-gray-800 hover:bg-gray-700 transition"
                >
                    <ArrowLeft />
                </button>
                <button 
                    onClick={handleNameSubmit}
                    className="flex-1 py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-900/40 hover:scale-[1.02] transition"
                >
                    تایید و ادامه
                </button>
            </div>
         </div>
      )}

      {appState === AppState.SELECTION && (
        <div className="w-full max-w-md flex flex-col items-center min-h-[80vh] animate-fade-in">
            <h2 className="text-2xl font-bold mb-6">انتخاب افراد</h2>
            
            <div className="relative w-full h-56 mb-6 rounded-2xl overflow-hidden border border-white/10 shadow-lg">
                 <img src={imageSrc} alt="Preview" className="w-full h-full object-cover" />
                 <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
            </div>

            <p className="text-gray-400 text-sm mb-4">
                {settings.askUserForName 
                    ? "افراد رو انتخاب کن و اسمشون رو بنویس:" 
                    : "روی افرادی که میخوای تحلیل بشن کلیک کن:"}
            </p>

            <div className="w-full space-y-3 mb-8 px-2 overflow-y-auto max-h-80 no-scrollbar">
                {detectedPeople.map((person) => (
                    <div 
                        key={person.id}
                        className={`p-3 rounded-xl transition-all duration-200 border flex flex-col gap-2 ${
                            selectedPeopleIds.has(person.id) 
                            ? 'bg-purple-900/20 border-purple-500' 
                            : 'bg-gray-800/50 border-gray-700'
                        }`}
                    >
                        <div 
                            className="flex items-center justify-between cursor-pointer"
                            onClick={() => togglePersonSelection(person.id)}
                        >
                            <span className="text-lg text-gray-200">{person.label}</span>
                            {selectedPeopleIds.has(person.id) ? (
                                <CheckCircle2 className="text-green-400 w-6 h-6" />
                            ) : (
                                <Circle className="text-gray-500 w-6 h-6" />
                            )}
                        </div>
                        
                        {/* Inline Name Input */}
                        {settings.askUserForName && selectedPeopleIds.has(person.id) && (
                            <div className="flex items-center gap-2 mt-1 animate-fade-in">
                                <User className="w-4 h-4 text-purple-400" />
                                <input 
                                    type="text"
                                    placeholder="اسم این شخص (اختیاری)"
                                    value={personNames[person.id] || ''}
                                    onChange={(e) => handleNameChange(person.id, e.target.value)}
                                    className="flex-1 bg-black/40 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:border-purple-400 outline-none"
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="flex gap-4 w-full mt-auto">
                <button 
                    onClick={resetApp}
                    className="p-4 rounded-xl bg-gray-800 hover:bg-gray-700 transition"
                >
                    <ArrowLeft />
                </button>
                <button 
                    onClick={handleSelectionConfirm}
                    disabled={selectedPeopleIds.size === 0}
                    className={`flex-1 py-4 rounded-xl font-bold text-lg transition shadow-lg ${
                        selectedPeopleIds.size > 0
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-purple-900/40 hover:scale-[1.02]'
                        : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    }`}
                >
                    {selectedPeopleIds.size > 0 ? 'بزن بریم!' : 'انتخاب کن'}
                </button>
            </div>
        </div>
      )}

      {/* General Loading State */}
      {appState === AppState.LOADING && (
        <div className="flex flex-col items-center justify-center min-h-[80vh] text-center space-y-8 animate-pulse">
            <div className="relative w-48 h-48">
                {imageSrc ? (
                     <img src={imageSrc} alt="Scanning" className="w-full h-full object-cover rounded-full opacity-50 border-4 border-purple-500/30" />
                ) : (
                     <div className="w-full h-full rounded-full bg-gray-800 opacity-50 border-4 border-purple-500/30"></div>
                )}
                <div className="absolute inset-0 border-t-4 border-purple-500 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="w-12 h-12 text-yellow-400 animate-bounce" />
                </div>
            </div>
            <div>
                <h3 className="text-2xl font-bold text-white mb-2">{loadingMessage}</h3>
                <p className="text-gray-500">لطفا صبر کنید...</p>
            </div>
        </div>
      )}

      {/* Story Loading State (Detailed) */}
      {appState === AppState.STORY_LOADING && loadingProgress && (
        <div className="flex flex-col items-center justify-center min-h-[80vh] w-full max-w-md animate-fade-in px-6">
             <div className="w-full bg-gray-800/50 rounded-2xl p-6 border border-white/10 shadow-2xl backdrop-blur-sm">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-purple-300 flex items-center gap-2">
                        <Sparkles className="w-5 h-5" />
                        ساخت داستان
                    </h3>
                    <div className="flex items-center gap-1 text-sm text-gray-400 bg-black/30 px-3 py-1 rounded-full">
                        <Clock className="w-4 h-4" />
                        <span>~{Math.ceil(loadingProgress.timeLeftSeconds)} ثانیه</span>
                    </div>
                </div>
                
                <div className="flex gap-2 mb-8 overflow-hidden justify-center">
                    {storyImages.slice(0, 4).map((img, i) => (
                        <img key={i} src={img} className="w-12 h-12 rounded-lg object-cover border border-white/20 opacity-60" />
                    ))}
                    {storyImages.length > 4 && <div className="w-12 h-12 rounded-lg bg-gray-700 flex items-center justify-center text-xs">+{storyImages.length - 4}</div>}
                </div>

                <div className="relative w-full h-3 bg-gray-700 rounded-full overflow-hidden mb-4">
                    <div 
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-purple-500 via-pink-500 to-yellow-500 transition-all duration-500 ease-out"
                        style={{ width: `${(loadingProgress.currentStep / loadingProgress.totalSteps) * 100}%` }}
                    ></div>
                </div>

                <p className="text-center text-white font-medium animate-pulse">
                    {loadingProgress.message}
                </p>
             </div>
        </div>
      )}

      {appState === AppState.RESULT && result && (
        <ResultCard 
            result={result} 
            imageSrc={imageSrc} 
            onReset={resetApp}
            customAudioGenerator={(text) => playResultAudio(text)}
        />
      )}

      {appState === AppState.ERROR && (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center text-red-500">
                <Sparkles className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-bold text-white">ای وای! نشد...</h3>
            <p className="text-gray-400 max-w-xs">
                هوش مصنوعی نتونست چهره رو تشخیص بده یا ممکنه اینترنت قطع شده باشه. دوباره تلاش کن!
            </p>
            <button 
                onClick={resetApp}
                className="px-8 py-3 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition"
            >
                بیخیال، یکی دیگه
            </button>
        </div>
      )}
    </div>
  );
};

export default App;
