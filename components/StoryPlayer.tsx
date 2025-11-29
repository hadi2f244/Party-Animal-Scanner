
import React, { useEffect, useRef, useState } from 'react';
import { StoryResult } from '../types';
import { X, RotateCcw, Play, Video, Loader2, Pause, CheckCircle } from 'lucide-react';

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

const getSupportedMimeType = () => {
  if (typeof MediaRecorder === 'undefined') return '';
  const types = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4'
  ];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return '';
};

export const StoryPlayer: React.FC<StoryPlayerProps> = ({ images, story, onClose }) => {
  const [pageIndex, setPageIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingReady, setRecordingReady] = useState(false);
  const [imagesReady, setImagesReady] = useState(false);
  
  // Refs for stable access inside animation loop
  const activePageIndexRef = useRef(0); 
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const destinationNodeRef = useRef<MediaStreamAudioDestinationNode | null>(null); 
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  
  const isMountedRef = useRef(true);
  const playbackSessionRef = useRef(0);
  const imageCacheRef = useRef<HTMLImageElement[]>([]);
  
  const animationFrameRef = useRef<number>(0);

  // 1. Preload Images
  useEffect(() => {
    let isMounted = true;
    setImagesReady(false);

    const loadImages = async () => {
        const loadedImages: HTMLImageElement[] = [];
        // Load sequentially to ensure order matches story pages
        for (const src of images) {
            await new Promise<void>((resolve) => {
                const img = new Image();
                img.onload = () => resolve();
                img.onerror = () => resolve(); // Continue even on error
                img.src = src;
                loadedImages.push(img);
            });
        }
        
        if (isMounted) {
            imageCacheRef.current = loadedImages;
            setImagesReady(true);
        }
    };

    loadImages();

    // Initialize Audio Context
    if (!audioContextRef.current) {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        audioContextRef.current = ctx;
        destinationNodeRef.current = ctx.createMediaStreamDestination();
    }

    return () => {
      isMounted = false;
      isMountedRef.current = false;
      stopAudio();
      cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, [images]);

  // 2. Auto-Start Playback ONLY when images are ready
  useEffect(() => {
    if (imagesReady) {
        playSequence(0, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imagesReady]);

  const stopAudio = () => {
    if (sourceRef.current) {
      try { sourceRef.current.stop(); } catch (e) {}
      sourceRef.current = null;
    }
  };

  // --- Rendering Logic ---
  const drawFrame = (timestamp: number) => {
      if (!canvasRef.current) return;
      
      // CRITICAL FIX: If images aren't ready yet, don't stop the loop!
      // Just request next frame and wait.
      if (imageCacheRef.current.length === 0) {
          animationFrameRef.current = requestAnimationFrame(drawFrame);
          return;
      }
      
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;

      // USE REF for index to ensure we always draw the CURRENT slide, not a stale closure value
      const currentIndex = activePageIndexRef.current;
      const currentPage = story.pages[currentIndex];
      const imageIndex = currentPage ? currentPage.imageIndex : 0;
      
      // Fallback to index 0 if image not found
      const img = imageCacheRef.current[imageIndex] || imageCacheRef.current[0];
      
      // If specific image is missing, skip this frame but keep loop alive
      if (!img) {
          animationFrameRef.current = requestAnimationFrame(drawFrame);
          return;
      }

      // Much slower zoom effect
      const zoomSpeed = 0.00005; 
      // Use a unique seed based on index so each slide moves differently but consistently
      const timeOffset = timestamp + (currentIndex * 10000);
      const scale = 1.0 + (timeOffset * zoomSpeed) % 0.15; // Max zoom 1.15x

      const canvasWidth = canvasRef.current.width;
      const canvasHeight = canvasRef.current.height;

      // Clear canvas completely
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      const iw = img.width;
      const ih = img.height;
      
      if (iw > 0 && ih > 0) {
        const ratio = Math.max(canvasWidth / iw, canvasHeight / ih);
        
        // Calculate centered position
        const centerShift_x = (canvasWidth - iw * ratio) / 2;
        const centerShift_y = (canvasHeight - ih * ratio) / 2;

        ctx.save();
        ctx.translate(canvasWidth / 2, canvasHeight / 2);
        ctx.scale(scale, scale);
        ctx.translate(-canvasWidth / 2, -canvasHeight / 2);
        ctx.drawImage(img, 0, 0, iw, ih, centerShift_x, centerShift_y, iw * ratio, ih * ratio);
        ctx.restore();
      }

      // Gradient Overlay
      const gradient = ctx.createLinearGradient(0, canvasHeight * 0.5, 0, canvasHeight);
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(0.8, 'rgba(0,0,0,0.85)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Text Rendering
      if (currentPage && currentPage.text) {
          ctx.font = 'bold 26px Vazirmatn, sans-serif';
          ctx.fillStyle = '#fff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.shadowColor = "rgba(0,0,0,1)";
          ctx.shadowBlur = 8;
          ctx.shadowOffsetX = 2;
          ctx.shadowOffsetY = 2;
          
          const words = currentPage.text.split(' ');
          let line = '';
          const lines = [];
          const maxWidth = canvasWidth - 80;

          for(let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            const testWidth = metrics.width;
            if (testWidth > maxWidth && n > 0) {
                lines.push(line);
                line = words[n] + ' ';
            } else {
                line = testLine;
            }
          }
          lines.push(line);

          let y = canvasHeight - 100;
          for (let k = lines.length - 1; k >= 0; k--) {
             ctx.fillText(lines[k], canvasWidth / 2, y);
             y -= 40;
          }
          
          ctx.font = '900 32px Vazirmatn, sans-serif';
          ctx.fillStyle = '#FACC15';
          ctx.fillText(story.title, canvasWidth / 2, y - 30);
      }

      animationFrameRef.current = requestAnimationFrame(drawFrame);
  };

  // --- Playback Logic ---
  const playSequence = async (startIndex: number, recordMode: boolean = false) => {
    const sessionId = ++playbackSessionRef.current;
    
    if (!audioContextRef.current) return;
    if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
    }

    setIsPlaying(true);
    setIsFinished(false);
    if (recordMode) setIsRecording(true);

    // Start Animation
    cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = requestAnimationFrame(drawFrame);

    // Setup Recorder
    if (recordMode && canvasRef.current && destinationNodeRef.current) {
        const canvasStream = canvasRef.current.captureStream(30);
        const audioStream = destinationNodeRef.current.stream;
        const combinedStream = new MediaStream([
            ...canvasStream.getVideoTracks(),
            ...audioStream.getAudioTracks()
        ]);
        
        const mimeType = getSupportedMimeType();
        if (!mimeType) {
             alert('مرورگر شما از ضبط پشتیبانی نمی‌کند');
             setIsRecording(false);
             setIsPlaying(false);
             return;
        }

        recordedChunksRef.current = [];
        const recorder = new MediaRecorder(combinedStream, {
            mimeType: mimeType,
            videoBitsPerSecond: 2500000 // 2.5 Mbps
        });
        
        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                recordedChunksRef.current.push(e.data);
            }
        };
        
        recorder.onstop = () => {
            setRecordingReady(true);
            setIsRecording(false);
        };
        
        mediaRecorderRef.current = recorder;
        recorder.start();
    }

    // Iterate through pages
    for (let i = startIndex; i < story.pages.length; i++) {
        if (sessionId !== playbackSessionRef.current || !isMountedRef.current) break;

        // Sync state and ref
        setPageIndex(i);
        activePageIndexRef.current = i;

        const page = story.pages[i];
        
        if (page.audioBase64) {
            await playAudioBuffer(page.audioBase64, sessionId);
        } else {
            // Fallback if no audio
            await new Promise(resolve => setTimeout(resolve, 4000));
        }
    }

    // Cleanup when finished naturally
    if (sessionId === playbackSessionRef.current && isMountedRef.current) {
        setIsPlaying(false);
        setIsFinished(true);
        
        if (recordMode && mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        cancelAnimationFrame(animationFrameRef.current);
    }
  };

  const playAudioBuffer = async (base64: string, sessionId: number): Promise<void> => {
    return new Promise(async (resolve) => {
      try {
        const ctx = audioContextRef.current;
        if (!ctx) return resolve();

        const audioBytes = decode(base64);
        const buffer = await decodeAudioData(audioBytes, ctx, 24000, 1);

        if (sessionId !== playbackSessionRef.current) return resolve();

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        
        if (destinationNodeRef.current) {
            source.connect(destinationNodeRef.current);
        }
        
        source.onended = () => {
           // Only resolve if we are still in the same session
           if (sessionId === playbackSessionRef.current) {
               sourceRef.current = null;
               resolve();
           }
        };
        
        sourceRef.current = source;
        source.start();
      } catch (e) {
        console.error("Audio error", e);
        resolve();
      }
    });
  };

  const handleStartRecording = () => {
      stopAudio();
      setRecordingReady(false);
      playSequence(0, true);
  };

  const handleDownloadVideo = () => {
      if (recordedChunksRef.current.length === 0) return;
      const mimeType = getSupportedMimeType();
      const blob = new Blob(recordedChunksRef.current, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ravayatgar-story-${Date.now()}.${mimeType.includes('mp4') ? 'mp4' : 'webm'}`;
      a.click();
      URL.revokeObjectURL(url);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isRecording) return; 
    stopAudio();
    const nextIndex = pageIndex + 1;
    if (nextIndex < story.pages.length) {
        playSequence(nextIndex);
    } else {
        // Just stop if at end
        setIsPlaying(false);
        setIsFinished(true);
        cancelAnimationFrame(animationFrameRef.current);
    }
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isRecording) return;
    stopAudio();
    if (pageIndex > 0) {
        playSequence(pageIndex - 1);
    } else {
        playSequence(0);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col animate-fade-in font-vazir select-none">
      
      <div className="relative flex-1 w-full overflow-hidden bg-black flex items-center justify-center">
          {imagesReady ? (
              <canvas 
                ref={canvasRef} 
                width={720} 
                height={1280} 
                className="h-full w-full object-contain"
              />
          ) : (
              <div className="flex flex-col items-center justify-center text-white space-y-4">
                  <Loader2 className="w-12 h-12 animate-spin text-purple-500" />
                  <p>در حال آماده‌سازی تصاویر...</p>
              </div>
          )}
      </div>

      <div className="absolute inset-0 z-10 flex">
         <div className="w-1/3 h-full" onClick={handlePrev}></div>
         <div className="w-1/3 h-full"></div>
         <div className="w-1/3 h-full" onClick={handleNext}></div>
      </div>

      <div className="absolute top-0 left-0 right-0 flex gap-1 p-2 z-30">
        {story.pages.map((_, idx) => (
            <div key={idx} className={`h-1 flex-1 rounded-full transition-all duration-300 ${idx <= pageIndex ? 'bg-white' : 'bg-white/30'}`}></div>
        ))}
      </div>

      <button onClick={onClose} className="absolute top-4 right-4 z-40 p-2 bg-black/40 text-white rounded-full backdrop-blur-md hover:bg-black/60 transition">
        <X className="w-6 h-6" />
      </button>

      {isRecording && (
          <div className="absolute top-16 right-4 z-40 flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded-full animate-pulse shadow-lg">
              <div className="w-3 h-3 bg-white rounded-full"></div>
              <span className="text-xs font-bold">در حال ضبط...</span>
          </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-6 pb-10 bg-gradient-to-t from-black via-black/80 to-transparent z-20 pointer-events-none flex flex-col items-center">
        <div className="flex justify-center mt-4 h-12 pointer-events-auto gap-3">
            {recordingReady ? (
                <button 
                    onClick={handleDownloadVideo}
                    className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-full font-bold hover:bg-green-500 transition-transform hover:scale-105 shadow-lg animate-bounce"
                >
                    <CheckCircle size={18} />
                    دانلود ویدیو
                </button>
            ) : isRecording ? (
                <button className="flex items-center gap-2 bg-gray-700 text-gray-300 px-6 py-2 rounded-full font-bold cursor-default border border-gray-600">
                    <Loader2 size={18} className="animate-spin" />
                    صبر کنید...
                </button>
            ) : (
                <>
                    {isFinished ? (
                        <div className="flex gap-3">
                             <button 
                                onClick={() => playSequence(0, false)}
                                className="flex items-center gap-2 bg-white text-black px-5 py-2.5 rounded-full font-bold hover:bg-gray-200 transition"
                            >
                                <RotateCcw size={18} />
                                تماشا
                            </button>
                            <button 
                                onClick={handleStartRecording}
                                className="flex items-center gap-2 bg-red-600 text-white px-5 py-2.5 rounded-full font-bold hover:bg-red-500 transition shadow-lg shadow-red-900/30"
                            >
                                <Video size={18} />
                                ضبط و ذخیره
                            </button>
                        </div>
                    ) : (
                        isPlaying ? (
                             <button onClick={() => { stopAudio(); setIsPlaying(false); cancelAnimationFrame(animationFrameRef.current); }} className="p-4 rounded-full bg-white/20 backdrop-blur text-white border border-white/10 hover:bg-white/30 transition">
                                 <Pause size={24} />
                             </button>
                        ) : (
                             <button onClick={() => playSequence(pageIndex, false)} className="p-4 rounded-full bg-white text-black hover:scale-105 transition shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                                 <Play size={24} fill="currentColor" />
                             </button>
                        )
                    )}
                </>
            )}
        </div>
      </div>
    </div>
  );
};
