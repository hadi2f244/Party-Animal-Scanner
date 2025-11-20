import React, { useState } from 'react';
import { Camera, Upload, Sparkles, PartyPopper } from 'lucide-react';
import { analyzePartyGuest } from './services/geminiService';
import { CameraView } from './components/CameraView';
import { ResultCard } from './components/ResultCard';
import { AnimalResult, AppState } from './types';

export const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.HOME);
  const [imageSrc, setImageSrc] = useState<string>('');
  const [result, setResult] = useState<AnimalResult | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string>('در حال ارسال به باغ‌وحش...');

  const funnyLoadingMessages = [
    "در حال اسکن کردن شخصیت...",
    "تماس با کارشناسان حیات وحش...",
    "مقایسه با میمون‌های جنگلی...",
    "تحلیل زاویه فک و بینی...",
    "جستجو در دیتابیس حیوانات...",
  ];

  const handleImageSelected = async (src: string) => {
    setImageSrc(src);
    setAppState(AppState.LOADING);
    
    // Cycle through loading messages
    const msgInterval = setInterval(() => {
        setLoadingMessage(funnyLoadingMessages[Math.floor(Math.random() * funnyLoadingMessages.length)]);
    }, 2000);

    try {
      const analysisResult = await analyzePartyGuest(src);
      setResult(analysisResult);
      setAppState(AppState.RESULT);
    } catch (error) {
      console.error(error);
      setAppState(AppState.ERROR);
    } finally {
        clearInterval(msgInterval);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          handleImageSelected(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const resetApp = () => {
    setAppState(AppState.HOME);
    setImageSrc('');
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center py-8 px-4 relative overflow-hidden font-vazir">
      {/* Background Ambient Effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-700/30 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-pink-700/20 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Hidden File Input */}
      <input 
        type="file" 
        id="file-upload"
        accept="image/*" 
        className="hidden" 
        onChange={handleFileUpload}
      />

      {appState === AppState.HOME && (
        <div className="w-full max-w-md flex flex-col items-center justify-center min-h-[80vh] space-y-12 animate-fade-in">
            <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-tr from-yellow-400 to-orange-500 shadow-lg shadow-orange-500/20 mb-4 transform rotate-12">
                    <PartyPopper className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-500 to-red-500">
                    حیوان درونت چیه؟
                </h1>
                <p className="text-gray-400 text-lg">
                    از مهمونا عکس بگیر تا هوش مصنوعی بگه شبیه چه حیوونی هستن!
                </p>
            </div>

            <div className="w-full space-y-4">
                <button 
                    onClick={() => setAppState(AppState.CAMERA)}
                    className="w-full group relative flex items-center justify-center gap-4 p-6 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 transition-all duration-200 transform hover:scale-[1.02] shadow-xl shadow-purple-900/30"
                >
                    <div className="bg-white/20 p-3 rounded-full">
                        <Camera className="w-8 h-8 text-white" />
                    </div>
                    <div className="text-right">
                        <span className="block text-xl font-bold">عکس گرفتن</span>
                        <span className="text-indigo-200 text-sm">دوربین رو باز کن</span>
                    </div>
                </button>

                <button 
                    onClick={() => document.getElementById('file-upload')?.click()}
                    className="w-full flex items-center justify-center gap-3 p-5 rounded-2xl bg-gray-800 hover:bg-gray-700 transition-colors border border-gray-700"
                >
                    <Upload className="w-6 h-6 text-gray-400" />
                    <span className="font-semibold text-gray-300">آپلود از گالری</span>
                </button>
            </div>
        </div>
      )}

      {appState === AppState.CAMERA && (
        <CameraView 
            onCapture={handleImageSelected} 
            onClose={() => setAppState(AppState.HOME)}
        />
      )}

      {appState === AppState.LOADING && (
        <div className="flex flex-col items-center justify-center min-h-[80vh] text-center space-y-8 animate-pulse">
            <div className="relative w-48 h-48">
                <img src={imageSrc} alt="Scanning" className="w-full h-full object-cover rounded-full opacity-50 border-4 border-purple-500/30" />
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

      {appState === AppState.RESULT && result && (
        <ResultCard 
            result={result} 
            imageSrc={imageSrc} 
            onReset={resetApp} 
        />
      )}

      {appState === AppState.ERROR && (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center text-red-500">
                <Sparkles className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-bold text-white">ای وای! نشد...</h3>
            <p className="text-gray-400 max-w-xs">
                هوش مصنوعی نتونست چهره رو تشخیص بده یا اینترنتت ضعیفه. یه عکس دیگه بگیر!
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