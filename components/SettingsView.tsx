
import React, { useState, useEffect } from 'react';
import { AppSettings, DEFAULT_SETTINGS, GameTheme } from '../types';
import { Save, RotateCcw, X, Settings as SettingsIcon, CheckCircle2, Edit3, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

interface SettingsViewProps {
  currentSettings: AppSettings;
  availableThemes: GameTheme[];
  onSave: (newSettings: AppSettings) => void;
  onClose: () => void;
  onAddTheme: (theme: GameTheme) => void;
  onDeleteTheme: (id: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ 
    currentSettings, 
    availableThemes, 
    onSave, 
    onClose,
    onAddTheme,
    onDeleteTheme
}) => {
  const [settings, setSettings] = useState<AppSettings>(currentSettings);
  const [isDirty, setIsDirty] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [showAllThemes, setShowAllThemes] = useState(false);

  // New Theme Form State
  const [newThemeLabel, setNewThemeLabel] = useState('');
  const [newThemeEmoji, setNewThemeEmoji] = useState('✨');
  const [newThemeDesc, setNewThemeDesc] = useState('');
  const [newThemeRolePrompt, setNewThemeRolePrompt] = useState('');

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

  const handleCreateTheme = () => {
    if (!newThemeLabel || !newThemeRolePrompt) {
        alert("لطفا نام و دستورالعمل نقش را وارد کنید");
        return;
    }

    const commonContext = `دستورالعمل حیاتی: توصیف محیط و پس‌زمینه عکس (Background) باید حتماً در تحلیل و داستان ادغام شود.`;

    const newTheme: GameTheme = {
        id: 'custom_' + Date.now(),
        label: newThemeLabel,
        emoji: newThemeEmoji,
        description: newThemeDesc || 'یک روایت جدید و خاص',
        voiceName: 'Zephyr', // Default voice
        isCustom: true,
        analysisPrompt: `تو ${newThemeLabel} هستی یا راوی این دنیا هستی. وظیفه: تحلیل فرد بر اساس این نقش. \n${newThemeRolePrompt}\n${commonContext}`,
        storyPrompt: `تو راوی داستانی در دنیای "${newThemeLabel}" هستی. یک ماجرا درباره این شخصیت‌ها در محیط عکس بساز.`,
        ttsStylePrompt: `متن را با لحنی که مناسب فضای "${newThemeLabel}" است بخوان.`
    };

    onAddTheme(newTheme);
    handleThemeSelect(newTheme); // Select it immediately
    setIsAddingNew(false);
    // Reset form
    setNewThemeLabel('');
    setNewThemeRolePrompt('');
    setNewThemeDesc('');
  };

  // Filter themes for display
  // Show first 6 + selected + custom, hide others behind "Show More"
  const displayedThemes = showAllThemes 
    ? availableThemes 
    : availableThemes.slice(0, 6).concat(availableThemes.filter(t => t.isCustom || t.id === settings.selectedThemeId).filter(t => !availableThemes.slice(0,6).includes(t)));

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
                    ژانر داستان ({availableThemes.length})
                </label>
                <button 
                    onClick={() => setIsAddingNew(!isAddingNew)}
                    className="flex items-center gap-1 text-xs bg-green-600 hover:bg-green-500 text-white px-3 py-2 rounded-lg transition"
                >
                    <Plus size={14} />
                    <span>ساخت روایت جدید</span>
                </button>
            </div>

            {/* Create New Theme Form */}
            {isAddingNew && (
                <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 space-y-3 animate-fade-in">
                    <h4 className="font-bold text-white mb-2">ساخت تم جدید</h4>
                    <div className="flex gap-2">
                        <input 
                            placeholder="نام نقش (مثلاً: دزد دریایی)"
                            value={newThemeLabel}
                            onChange={e => setNewThemeLabel(e.target.value)}
                            className="flex-1 bg-black/30 p-2 rounded border border-gray-600 text-white text-sm"
                        />
                        <input 
                            placeholder="ایموجی"
                            value={newThemeEmoji}
                            onChange={e => setNewThemeEmoji(e.target.value)}
                            className="w-16 bg-black/30 p-2 rounded border border-gray-600 text-white text-center text-sm"
                        />
                    </div>
                    <input 
                        placeholder="توضیح کوتاه (نمایش در لیست)"
                        value={newThemeDesc}
                        onChange={e => setNewThemeDesc(e.target.value)}
                        className="w-full bg-black/30 p-2 rounded border border-gray-600 text-white text-sm"
                    />
                    <textarea 
                        placeholder="دستورالعمل برای هوش مصنوعی: بهش بگو چطور رفتار کنه و دنبال چی بگرده..."
                        value={newThemeRolePrompt}
                        onChange={e => setNewThemeRolePrompt(e.target.value)}
                        className="w-full h-24 bg-black/30 p-2 rounded border border-gray-600 text-white text-sm resize-none"
                    />
                    <div className="flex justify-end gap-2">
                        <button onClick={() => setIsAddingNew(false)} className="px-3 py-1 text-gray-400 hover:text-white text-sm">لغو</button>
                        <button onClick={handleCreateTheme} className="px-4 py-1 bg-green-600 rounded text-white text-sm">ایجاد</button>
                    </div>
                </div>
            )}
           
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {displayedThemes.map((theme) => (
                    <div key={theme.id} className="relative group">
                        <button
                            onClick={() => handleThemeSelect(theme)}
                            className={`w-full p-4 rounded-xl border text-right transition-all relative overflow-hidden flex flex-col gap-2 ${
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
                                    <CheckCircle2 className="text-blue-500" size={24} />
                                )}
                            </div>
                            <p className="text-sm text-gray-400 leading-tight opacity-80">
                                {theme.description}
                            </p>
                        </button>
                        {theme.isCustom && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); onDeleteTheme(theme.id); }}
                                className="absolute top-2 left-2 p-1.5 bg-red-900/80 text-red-200 rounded-full opacity-0 group-hover:opacity-100 transition hover:bg-red-700"
                                title="حذف"
                            >
                                <Trash2 size={14} />
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {availableThemes.length > 6 && (
                <button 
                    onClick={() => setShowAllThemes(!showAllThemes)}
                    className="w-full py-2 flex items-center justify-center gap-1 text-gray-400 hover:text-white text-sm bg-gray-900/50 rounded-lg transition"
                >
                    {showAllThemes ? (
                        <><span>بستن لیست</span><ChevronUp size={16} /></>
                    ) : (
                        <><span>مشاهده همه ({availableThemes.length - 6}+)</span><ChevronDown size={16} /></>
                    )}
                </button>
            )}
        </div>

        <div className="w-full h-px bg-gray-800 my-2"></div>

        {/* Advanced Prompt Editing */}
        <div className="space-y-6 opacity-80 hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-2 text-gray-400">
                <Edit3 className="w-4 h-4" />
                <h3 className="text-sm font-bold uppercase tracking-wider">ویرایش دستی پرامپت انتخاب شده</h3>
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
                    handleChange('selectedThemeId', 'custom_edited'); // Switch to custom if edited
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
                    handleChange('selectedThemeId', 'custom_edited');
                }}
                className="w-full h-32 bg-black/20 border border-gray-700 rounded-xl p-3 text-gray-300 focus:border-pink-500 outline-none transition text-xs leading-relaxed resize-none"
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
