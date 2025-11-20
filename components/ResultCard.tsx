import React from 'react';
import { AnimalResult } from '../types';
import { Share2, RotateCcw, Camera } from 'lucide-react';

interface ResultCardProps {
  result: AnimalResult;
  imageSrc: string;
  onReset: () => void;
}

export const ResultCard: React.FC<ResultCardProps> = ({ result, imageSrc, onReset }) => {
  // Adjust font size if multiple emojis (group result)
  const emojiFontSize = result.emoji && [...result.emoji].length > 2 ? 'text-4xl' : 'text-6xl';

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto animate-fade-in">
      <div className="relative w-full bg-gray-900 rounded-3xl overflow-hidden shadow-2xl border border-purple-500/30">
        
        {/* Image Section */}
        <div className="relative h-72 w-full">
           <img 
             src={imageSrc} 
             alt="Guest" 
             className="w-full h-full object-cover"
           />
           <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent"></div>
           
           <div className="absolute bottom-0 right-0 left-0 p-6 text-center">
                <div className="inline-block animate-bounce bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-6 py-2 shadow-lg">
                    <span className={`${emojiFontSize} filter drop-shadow-lg`}>{result.emoji}</span>
                </div>
           </div>
        </div>

        {/* Content Section */}
        <div className="p-6 pt-2 text-center space-y-4">
            <div>
                <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 mb-1 leading-tight">
                    {result.animal}
                </h2>
                <span className="inline-block px-3 py-1 text-xs font-bold rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 mt-2">
                    درجه سوختگی: {result.roastLevel}
                </span>
            </div>

            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <p className="text-lg text-gray-200 leading-relaxed font-medium" dir="rtl">
                    {result.description}
                </p>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-4 pt-4">
                <button 
                    onClick={onReset}
                    className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-bold transition border border-gray-700"
                >
                    <RotateCcw size={20} />
                    دوباره
                </button>
                <button 
                    onClick={() => {
                        if (navigator.share) {
                            navigator.share({
                                title: 'حیوان درون ما',
                                text: `ما شبیه ${result.animal} هستیم! ${result.description}`,
                            }).catch(console.error);
                        } else {
                            alert('اشتراک‌گذاری در این مرورگر پشتیبانی نمی‌شود');
                        }
                    }}
                    className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold transition shadow-lg shadow-purple-900/50"
                >
                    <Share2 size={20} />
                    اشتراک
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};