import React, { useEffect, useRef, useState } from 'react';
import { StoryResult } from '../types';
import { X, RotateCcw, Play } from 'lucide-react';

interface StoryPlayerProps {
  images: string[];
  story: StoryResult;
  onClose: () => void;
}

// Helper to decode audio
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

export const StoryPlayer: React.FC<StoryPlayerProps> = ({ images, story, onClose }) => {
  const [pageIndex, setPageIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const isMountedRef = useRef(true);
  const playbackSessionRef = useRef(0);

  // Initialize Audio Context
  useEffect(() => {
    const initAudio = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
    };
    initAudio();
    return () => {
      isMountedRef.current = false;
      stopAudio();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  const stopAudio = () => {
    if (sourceRef.current) {
      try {
        sourceRef.current.stop();
      } catch (e) {
        // ignore if already stopped
      }
      sourceRef.current = null;
    }
  };

  const playSequence = async (startIndex: number) => {
    // Start a new session to invalidate any previous running loops
    const sessionId = ++playbackSessionRef.current;
    
    if (!audioContextRef.current) return;
    if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
    }

    setIsPlaying(true);
    setIsFinished(false);

    for (let i = startIndex; i < story.pages.length; i++) {
        // Check if this loop is still valid
        if (sessionId !== playbackSessionRef.current || !isMountedRef.current) return;

        setPageIndex(i);
        const page = story.pages[i];
        
        // Play Narration
        if (page.audioBase64) {
            await playAudioBuffer(page.audioBase64, sessionId);
        } else {
            // Fallback delay if no audio
            await new Promise(resolve => setTimeout(resolve, 4000));
        }
    }

    // Only finish if this session is still the active one
    if (sessionId === playbackSessionRef.current && isMountedRef.current) {
        setIsPlaying(false);
        setIsFinished(true);
    }
  };

  const playAudioBuffer = async (base64: string, sessionId: number): Promise<void> => {
    return new Promise(async (resolve) => {
      try {
        const ctx = audioContextRef.current;
        if (!ctx) return resolve();

        // Decode happens asynchronously
        const audioBytes = decode(base64);
        const buffer = await decodeAudioData(audioBytes, ctx, 24000, 1);

        // Check again if session changed during decode
        if (sessionId !== playbackSessionRef.current) return resolve();

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        
        source.onended = () => {
          if (sessionId === playbackSessionRef.current) {
             sourceRef.current = null;
             resolve();
          }
        };
        
        sourceRef.current = source;
        source.start();
      } catch (e) {
        console.error("Audio decode error", e);
        resolve(); // Continue sequence even if audio fails
      }
    });
  };

  // Start automatically on mount
  useEffect(() => {
    playSequence(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRestart = () => {
    stopAudio();
    setPageIndex(0);
    playSequence(0);
  };

  // Navigation Handlers
  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    stopAudio();
    if (pageIndex < story.pages.length - 1) {
        playSequence(pageIndex + 1);
    } else {
        setIsPlaying(false);
        setIsFinished(true);
    }
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    stopAudio();
    if (pageIndex > 0) {
        playSequence(pageIndex - 1);
    } else {
        playSequence(0);
    }
  };

  const currentPage = story.pages[pageIndex];
  const currentImage = currentPage ? images[currentPage.imageIndex] : images[0];

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col animate-fade-in font-vazir select-none">
      
      {/* Navigation Overlays (Instagram style) */}
      <div className="absolute inset-0 z-10 flex">
         <div className="w-1/3 h-full" onClick={handlePrev}></div>
         <div className="w-1/3 h-full" onClick={() => { /* Optional pause toggle could go here */ }}></div>
         <div className="w-1/3 h-full" onClick={handleNext}></div>
      </div>

      {/* Progress Bar */}
      <div className="absolute top-0 left-0 right-0 flex gap-1 p-2 z-30">
        {story.pages.map((_, idx) => (
            <div key={idx} className={`h-1 flex-1 rounded-full transition-all duration-300 ${idx <= pageIndex ? 'bg-white' : 'bg-white/30'}`}></div>
        ))}
      </div>

      {/* Close Button */}
      <button onClick={onClose} className="absolute top-4 right-4 z-40 p-2 bg-black/40 text-white rounded-full backdrop-blur-md hover:bg-black/60 transition">
        <X className="w-6 h-6" />
      </button>

      {/* Image Display */}
      <div className="relative flex-1 w-full overflow-hidden">
        {currentImage && (
            <img 
                src={currentImage} 
                className={`w-full h-full object-cover transition-transform duration-[10000ms] ease-linear ${isPlaying ? 'scale-110' : 'scale-100'}`} 
                alt="Story Scene" 
            />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent pointer-events-none"></div>
      </div>

      {/* Text & Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-6 pb-10 bg-gradient-to-t from-black to-transparent z-20 pointer-events-none">
        <h2 className="text-2xl font-black text-yellow-400 mb-2 drop-shadow-lg">{story.title}</h2>
        
        <div className="bg-white/10 backdrop-blur-md border border-white/10 p-4 rounded-2xl min-h-[120px] flex flex-col justify-center shadow-xl">
            <p className="text-lg text-white leading-relaxed text-right font-medium" dir="rtl">
                {currentPage?.text}
            </p>
        </div>

        <div className="flex justify-center mt-6 h-12 pointer-events-auto">
            {isPlaying ? (
                 <div className="flex items-center gap-3 px-4 py-2 bg-black/40 backdrop-blur-sm rounded-full border border-white/10">
                     <div className="flex gap-1 items-end h-4">
                        <span className="w-1 h-2 bg-purple-400 animate-[bounce_1s_infinite]"></span>
                        <span className="w-1 h-4 bg-pink-400 animate-[bounce_1.2s_infinite]"></span>
                        <span className="w-1 h-3 bg-purple-400 animate-[bounce_0.8s_infinite]"></span>
                     </div>
                     <span className="text-sm text-gray-300 font-bold">درحال روایت...</span>
                 </div>
            ) : isFinished ? (
                 <button 
                    onClick={handleRestart}
                    className="flex items-center gap-2 bg-white text-black px-6 py-2 rounded-full font-bold hover:bg-gray-200 transition-transform hover:scale-105 shadow-lg"
                >
                    <RotateCcw size={18} />
                    تماشای مجدد
                </button>
            ) : (
                <button 
                    onClick={() => playSequence(pageIndex)}
                    className="flex items-center gap-2 bg-purple-600 text-white px-6 py-2 rounded-full font-bold hover:bg-purple-500"
                >
                    <Play size={18} />
                    ادامه
                </button>
            )}
        </div>
      </div>
    </div>
  );
};