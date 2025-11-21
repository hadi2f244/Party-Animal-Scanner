
import React, { useState, useEffect } from 'react';
import { AppSettings, DEFAULT_SETTINGS, GAME_THEMES, GameTheme } from '../types';
import { Save, RotateCcw, X, Settings as SettingsIcon, CheckCircle2, Edit3 } from 'lucide-react';

interface SettingsViewProps {
  currentSettings: AppSettings;
  onSave: (newSettings: AppSettings) => void;
  onClose: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ currentSettings, onSave, onClose }) => {
  const [settings, setSettings] = useState<AppSettings>(currentSettings);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setSettings(currentSettings);
  }, [currentSettings]);

  const handleChange = (key: keyof AppSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  const handleReset = () => {
    if (window.confirm('آیا مطمئن هستید که می‌خواهید تنظیمات را به حالت اولیه برگردانید؟')) {
      setSettings(DEFAULT_SETTINGS);
      setIsDirty(true);
    }
  };

  const handleSave = () => {
    onSave(settings);
    setIsDirty(false);
  };

  const handleThemeSelect = (theme: GameTheme) => {
    setSettings(prev => ({
        ...prev,
        selectedThemeId: theme.id,
        analysisPrompt: theme.analysisPrompt,
        storyPrompt: theme.storyPrompt,
        ttsStylePrompt: theme.ttsStylePrompt,
        voiceName: theme.voiceName
    }));
    setIsDirty(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col animate-fade-in font-vazir text-right" dir="rtl">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 bg-gray-900/90 backdrop-blur-md border-b border-gray-800 shadow-lg z-20 flex items-center justify-between">
        <div className="flex items-center gap-2 text-white">
          <SettingsIcon className="w-6 h-6 text-purple-400" />
          <h2 className="text-xl font-bold">تنظیمات روایتگر</h2>
        </div>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-white/10 rounded-full transition text-gray-400 hover:text-white"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 pt-20 space-y-8 no-scrollbar pb-28">
        
        {/* Theme Selection */}
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                 <label className="block text-blue-300 font-bold text-lg">
                    ژانر داستان
                </label>
                <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">تغییر لحن و شخصیت‌پردازی</span>
            </div>
           
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {GAME_THEMES.map((theme) => (
                    <button
                        key={theme.id}
                        onClick={() => handleThemeSelect(theme)}
                        className={`p-4 rounded-xl border text-right transition-all relative overflow-hidden flex flex-col gap-2 group ${
                            settings.selectedThemeId === theme.id
                            ? 'bg-blue-900/20 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                            : 'bg-gray-900 border-gray-800 hover:border-gray-600 hover:bg-gray-800'
                        }`}
                    >
                        <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-3">
                                <span className="text-3xl filter drop-shadow-md">{theme.emoji}</span>
                                <span className={`font-bold text-lg ${settings.selectedThemeId === theme.id ? 'text-blue-400' : 'text-gray-200'}`}>
                                    {theme.label}
                                </span>
                            </div>
                            {settings.selectedThemeId === theme.id && (
                                <CheckCircle2 className="text-blue-500 animate-pulse" size={24} />
                            )}
                        </div>
                        <p className="text-sm text-gray-400 leading-tight opacity-80 group-hover:opacity-100 transition-opacity">
                            {theme.description}
                        </p>
                    </button>
                ))}
            </div>
        </div>

        <div className="w-full h-px bg-gray-800 my-2"></div>

        {/* Advanced Prompt Editing */}
        <div className="space-y-6">
            <div className="flex items-center gap-2 text-gray-400">
                <Edit3 className="w-4 h-4" />
                <h3 className="text-sm font-bold uppercase tracking-wider">ویرایش دستی هوش مصنوعی</h3>
            </div>

            {/* Analysis Prompt */}
            <div className="space-y-2">
            <label className="block text-purple-300 font-bold text-sm">
                دستورالعمل تحلیل شخصیت
            </label>
            <textarea
                value={settings.analysisPrompt}
                onChange={(e) => {
                    handleChange('analysisPrompt', e.target.value);
                    handleChange('selectedThemeId', 'custom'); // Switch to custom if edited
                }}
                className="w-full h-32 bg-black/20 border border-gray-700 rounded-xl p-3 text-gray-300 focus:border-purple-500 outline-none transition text-xs leading-relaxed resize-none"
            />
            </div>

            {/* Story Prompt */}
            <div className="space-y-2">
            <label className="block text-pink-300 font-bold text-sm">
                دستورالعمل سناریو
            </label>
            <textarea
                value={settings.storyPrompt}
                onChange={(e) => {
                    handleChange('storyPrompt', e.target.value);
                    handleChange('selectedThemeId', 'custom');
                }}
                className="w-full h-32 bg-black/20 border border-gray-700 rounded-xl p-3 text-gray-300 focus:border-pink-500 outline-none transition text-xs leading-relaxed resize-none"
            />
            </div>

            {/* TTS Prompt */}
             <div className="space-y-2">
            <label className="block text-green-300 font-bold text-sm">
                لحن گوینده (TTS)
            </label>
            <textarea
                value={settings.ttsStylePrompt}
                onChange={(e) => {
                    handleChange('ttsStylePrompt', e.target.value);
                    handleChange('selectedThemeId', 'custom');
                }}
                className="w-full h-24 bg-black/20 border border-gray-700 rounded-xl p-3 text-gray-300 focus:border-green-500 outline-none transition text-xs leading-relaxed resize-none"
            />
            </div>
        </div>

      </div>

      {/* Bottom Actions */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gray-900 border-t border-gray-800 flex gap-4 items-center justify-between z-30">
        <button
            onClick={handleReset}
            className="flex items-center gap-2 text-gray-400 hover:text-white px-4 py-2 rounded-lg hover:bg-white/5 transition"
        >
            <RotateCcw size={18} />
            <span className="hidden sm:inline">بازنشانی</span>
        </button>

        <button
            onClick={handleSave}
            disabled={!isDirty}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-lg shadow-lg transition-all ${
                isDirty 
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:scale-[1.02]' 
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
        >
            <Save size={20} />
            <span>ذخیره و اعمال</span>
        </button>
      </div>
    </div>
  );
};
