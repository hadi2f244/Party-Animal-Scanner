
import React, { useState, useEffect } from 'react';
import { AppSettings, DEFAULT_SETTINGS } from '../types';
import { Save, RotateCcw, X, Settings as SettingsIcon } from 'lucide-react';

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

  const handleChange = (key: keyof AppSettings, value: string) => {
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

  return (
    <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col animate-fade-in font-vazir text-right" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gray-900 border-b border-gray-800 shadow-lg">
        <div className="flex items-center gap-2 text-white">
          <SettingsIcon className="w-6 h-6 text-purple-400" />
          <h2 className="text-xl font-bold">تنظیمات هوش مصنوعی</h2>
        </div>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-white/10 rounded-full transition text-gray-400 hover:text-white"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
        
        {/* Analysis Prompt */}
        <div className="space-y-2">
          <label className="block text-purple-300 font-bold text-lg">
            دستورالعمل تحلیل حیوان (تکی/گروهی)
          </label>
          <p className="text-gray-500 text-sm mb-2">
            این متن به هوش مصنوعی می‌گوید که چگونه عکس را تحلیل کند و چه لحنی داشته باشد.
          </p>
          <textarea
            value={settings.analysisPrompt}
            onChange={(e) => handleChange('analysisPrompt', e.target.value)}
            className="w-full h-40 bg-gray-900 border border-gray-700 rounded-xl p-4 text-gray-200 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition text-sm leading-relaxed"
          />
        </div>

        {/* Story Prompt */}
        <div className="space-y-2">
          <label className="block text-pink-300 font-bold text-lg">
            دستورالعمل ساخت داستان
          </label>
          <p className="text-gray-500 text-sm mb-2">
            قوانین مربوط به داستان‌سازی چند نفره و لحن روایت داستان.
          </p>
          <textarea
            value={settings.storyPrompt}
            onChange={(e) => handleChange('storyPrompt', e.target.value)}
            className="w-full h-40 bg-gray-900 border border-gray-700 rounded-xl p-4 text-gray-200 focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none transition text-sm leading-relaxed"
          />
        </div>

        {/* Audio Prompt */}
        <div className="space-y-2">
          <label className="block text-blue-300 font-bold text-lg">
            استایل صداگذاری (TTS)
          </label>
          <p className="text-gray-500 text-sm mb-2">
             حالت گوینده را تعیین کنید (شاد، غمگین، خنده دار و...).
          </p>
          <textarea
            value={settings.ttsStylePrompt}
            onChange={(e) => handleChange('ttsStylePrompt', e.target.value)}
            className="w-full h-24 bg-gray-900 border border-gray-700 rounded-xl p-4 text-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition text-sm leading-relaxed"
          />
        </div>

        <div className="h-20"></div> {/* Spacing for bottom bar */}
      </div>

      {/* Bottom Actions */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gray-900 border-t border-gray-800 flex gap-4 items-center justify-between">
        <button
            onClick={handleReset}
            className="flex items-center gap-2 text-gray-400 hover:text-white px-4 py-2 rounded-lg hover:bg-white/5 transition"
        >
            <RotateCcw size={18} />
            <span>پیش‌فرض</span>
        </button>

        <button
            onClick={handleSave}
            disabled={!isDirty}
            className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-lg shadow-lg transition-all ${
                isDirty 
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:scale-105' 
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
        >
            <Save size={20} />
            <span>ذخیره تغییرات</span>
        </button>
      </div>
    </div>
  );
};
