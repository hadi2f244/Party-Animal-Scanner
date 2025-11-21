
import React, { useState, useRef } from 'react';
import { AnalysisResult } from '../types';
import { Share2, RotateCcw, Volume2, Loader2, StopCircle } from 'lucide-react';

interface ResultCardProps {
  result: AnalysisResult;
  imageSrc: string;
  onReset: () => void;
  customAudioGenerator: (text: string) => Promise<string>;
}

// Audio Helper Functions
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const ResultCard: React.FC<ResultCardProps> = ({ result, imageSrc, onReset, customAudioGenerator }) => {
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  // Adjust font size if multiple emojis (group result)
  const emojiFontSize = result.emoji && [...result.emoji].length > 2 ? 'text-4xl' : 'text-6xl';

  const handlePlayAudio = async () => {
    // If already playing, stop it
    if (isPlaying) {
      if (sourceNodeRef.current) {
        sourceNodeRef.current.stop();
        sourceNodeRef.current = null;
      }
      setIsPlaying(false);
      return;
    }

    setIsLoadingAudio(true);

    try {
      // Initialize Audio Context on user gesture
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      // Fetch Audio using the custom generator (which injects the settings)
      const base64Audio = await customAudioGenerator(result.description);
      
      // Decode and Play
      const audioBytes = decode(base64Audio);
      const audioBuffer = await decodeAudioData(
        audioBytes,
        audioContextRef.current,
        24000, // Gemini TTS uses 24k sample rate
        1
      );

      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      
      source.onended = () => {
        setIsPlaying(false);
        sourceNodeRef.current = null;
      };

      sourceNodeRef.current = source;
      source.start();
      setIsPlaying(true);

    } catch (error) {
      console.error("Error playing audio:", error);
      alert("خطا در پخش صدا");
    } finally {
      setIsLoadingAudio(false);
    }
  };

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
                    {result.characterTitle}
                </h2>
                <span className="inline-block px-3 py-1 text-xs font-bold rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 mt-2">
                    {result.subtitle}
                </span>
            </div>

            <div className="bg-white/5 rounded-xl p-4 border border-white/10 relative">
                <p className="text-lg text-gray-200 leading-relaxed font-medium mb-2" dir="rtl">
                    {result.description}
                </p>
                
                <div className="flex justify-center mt-4 border-t border-white/10 pt-3">
                   <button 
                     onClick={handlePlayAudio}
                     className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${
                        isPlaying 
                        ? "bg-red-500/20 text-red-400 border border-red-500/50"
                        : "bg-purple-500/20 text-purple-300 border border-purple-500/50 hover:bg-purple-500/30"
                     }`}
                   >
                     {isLoadingAudio ? (
                        <>
                            <Loader2 size={16} className="animate-spin" />
                            <span>در حال ساخت روایت...</span>
                        </>
                     ) : isPlaying ? (
                        <>
                            <StopCircle size={16} />
                            <span>توقف روایت</span>
                        </>
                     ) : (
                        <>
                            <Volume2 size={16} />
                            <span>پخش روایت صوتی</span>
                        </>
                     )}
                   </button>
                </div>
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
                                title: 'روایتگر',
                                text: `نقش من: ${result.characterTitle}! ${result.description}`,
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
