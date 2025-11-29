
import React, { useState, useRef, useEffect } from 'react';
import { AnalysisResult } from '../types';
import { Share2, RotateCcw, Volume2, Loader2, StopCircle, Download, Music, Video } from 'lucide-react';

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

export const ResultCard: React.FC<ResultCardProps> = ({ result, imageSrc, onReset, customAudioGenerator }) => {
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioBase64Cache, setAudioBase64Cache] = useState<string | null>(null);
  const [isSavingImage, setIsSavingImage] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const videoCanvasRef = useRef<HTMLCanvasElement>(null);
  const destinationNodeRef = useRef<MediaStreamAudioDestinationNode | null>(null);

  // Adjust font size if multiple emojis (group result)
  const emojiFontSize = result.emoji && [...result.emoji].length > 2 ? 'text-4xl' : 'text-6xl';

  useEffect(() => {
      // Init Audio Context for recording
      return () => {
          if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
              audioContextRef.current.close();
          }
      };
  }, []);

  const generateAudio = async () => {
     if (audioBase64Cache) return audioBase64Cache;
     
     setIsLoadingAudio(true);
     try {
        // We only send the text content. The prompt instruction in geminiService handles the "Title" reading logic.
        // We send Title + \n\n + Description.
        const textToRead = `${result.characterTitle}\n\n${result.description}`;
        const base64 = await customAudioGenerator(textToRead);
        setAudioBase64Cache(base64);
        return base64;
     } finally {
        setIsLoadingAudio(false);
     }
  };

  const handlePlayAudio = async () => {
    if (isPlaying) {
      if (sourceNodeRef.current) {
        sourceNodeRef.current.stop();
        sourceNodeRef.current = null;
      }
      setIsPlaying(false);
      return;
    }

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      const base64Audio = await generateAudio();
      
      const audioBytes = decode(base64Audio);
      const audioBuffer = await decodeAudioData(
        audioBytes,
        audioContextRef.current,
        24000,
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
    }
  };

  const handleDownloadAudio = async () => {
      try {
          const base64 = await generateAudio();
          // Create a WAV header for compatibility
          const audioBytes = decode(base64);
          const wavBytes = new Uint8Array(44 + audioBytes.length);
          const view = new DataView(wavBytes.buffer);
          
          // RIFF chunk descriptor
          writeString(view, 0, 'RIFF');
          view.setUint32(4, 36 + audioBytes.length, true);
          writeString(view, 8, 'WAVE');
          // fmt sub-chunk
          writeString(view, 12, 'fmt ');
          view.setUint32(16, 16, true);
          view.setUint16(20, 1, true); // PCM
          view.setUint16(22, 1, true); // Mono
          view.setUint32(24, 24000, true); // Sample rate
          view.setUint32(28, 24000 * 2, true); // Byte rate
          view.setUint16(32, 2, true); // Block align
          view.setUint16(34, 16, true); // Bits per sample
          // data sub-chunk
          writeString(view, 36, 'data');
          view.setUint32(40, audioBytes.length, true);
          
          // Write PCM data (assuming 16-bit input which it is)
          wavBytes.set(audioBytes, 44);

          const blob = new Blob([wavBytes], { type: 'audio/wav' });
          const url = URL.createObjectURL(blob);
          
          const link = document.createElement('a');
          link.href = url;
          link.download = `ravayatgar-${Date.now()}.wav`;
          link.click();
          URL.revokeObjectURL(url);
      } catch (e) {
          alert('خطا در دانلود صدا');
      }
  };
  
  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  const handleSaveImage = async () => {
      if (!cardRef.current || isSavingImage) return;
      setIsSavingImage(true);

      try {
          const html2canvas = (window as any).html2canvas;
          if (!html2canvas) {
              alert("کتابخانه ذخیره عکس لود نشد");
              return;
          }

          const canvas = await html2canvas(cardRef.current, {
              backgroundColor: '#111827',
              scale: 2,
              useCORS: true,
              logging: false,
          });

          const link = document.createElement('a');
          link.download = `ravayatgar-card-${Date.now()}.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
      } catch (e) {
          console.error(e);
          alert('خطا در ذخیره عکس');
      } finally {
          setIsSavingImage(false);
      }
  };

  const handleDownloadVideo = async () => {
      if (isGeneratingVideo) return;
      setIsGeneratingVideo(true);

      // Stop current playback if any
      if (sourceNodeRef.current) {
        sourceNodeRef.current.stop();
        setIsPlaying(false);
      }

      try {
        // 1. Prepare Audio Context
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();

        if (!destinationNodeRef.current) {
            destinationNodeRef.current = audioContextRef.current.createMediaStreamDestination();
        }

        // 2. Prepare Image
        const img = new Image();
        img.crossOrigin = "anonymous"; // Important for canvas export
        img.src = imageSrc;
        await new Promise((resolve, reject) => { 
            img.onload = resolve; 
            img.onerror = () => resolve(null); // Proceed anyway if image fails to load fully
            // Safety timeout for image load
            setTimeout(resolve, 3000); 
        });

        // 3. Get Audio Buffer
        const base64Audio = await generateAudio();
        const audioBytes = decode(base64Audio);
        const audioBuffer = await decodeAudioData(audioBytes, audioContextRef.current, 24000, 1);

        // 4. Setup Recording Canvas
        const canvas = videoCanvasRef.current!;
        canvas.width = 720;
        canvas.height = 1280;
        const ctx = canvas.getContext('2d')!;

        // 5. Setup MediaRecorder with robust mimeType
        const canvasStream = canvas.captureStream(30);
        const audioStream = destinationNodeRef.current.stream;
        const combinedStream = new MediaStream([...canvasStream.getVideoTracks(), ...audioStream.getAudioTracks()]);
        
        const mimeType = getSupportedMimeType();
        if (!mimeType) {
            throw new Error("مرورگر شما از ضبط ویدیو پشتیبانی نمی‌کند");
        }

        const chunks: Blob[] = [];
        const recorder = new MediaRecorder(combinedStream, {
             mimeType: mimeType,
             videoBitsPerSecond: 2500000
        });
        
        recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
        
        // Use a Promise to wait for the onstop event to ensure we don't miss it
        const recordingFinished = new Promise<void>(resolve => {
            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: mimeType });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `ravayatgar-video-${Date.now()}.${mimeType.includes('mp4') ? 'mp4' : 'webm'}`;
                a.click();
                URL.revokeObjectURL(url);
                resolve();
            };
        });
        
        // 6. Animation Loop (Ken Burns + Text)
        const startTime = performance.now();
        let animationId: number;
        let isVideoRunning = true;

        const drawFrame = () => {
            if (!isVideoRunning) return;
            const elapsed = performance.now() - startTime;
            const scale = 1.0 + (elapsed * 0.00005); // Slow Zoom
            
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw Image
            if (img.complete && img.naturalWidth > 0) {
                const iw = img.width;
                const ih = img.height;
                const ratio = Math.max(canvas.width / iw, canvas.height / ih);
                const cx = (canvas.width - iw * ratio) / 2;
                const cy = (canvas.height - ih * ratio) / 2;

                ctx.save();
                ctx.translate(canvas.width / 2, canvas.height / 2);
                ctx.scale(scale, scale);
                ctx.translate(-canvas.width / 2, -canvas.height / 2);
                ctx.drawImage(img, 0, 0, iw, ih, cx, cy, iw * ratio, ih * ratio);
                ctx.restore();
            }

            // Draw Text Overlay
            const gradient = ctx.createLinearGradient(0, canvas.height * 0.5, 0, canvas.height);
            gradient.addColorStop(0, 'rgba(0,0,0,0)');
            gradient.addColorStop(0.8, 'rgba(0,0,0,0.9)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Render text logic
            ctx.font = 'bold 30px Vazirmatn, sans-serif';
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.shadowColor = "rgba(0,0,0,0.9)";
            ctx.shadowBlur = 6;

            const words = result.description.split(' ');
            let line = '';
            const lines = [];
            const maxWidth = canvas.width - 80;

            for(let n = 0; n < words.length; n++) {
                const testLine = line + words[n] + ' ';
                const metrics = ctx.measureText(testLine);
                if (metrics.width > maxWidth && n > 0) {
                    lines.push(line);
                    line = words[n] + ' ';
                } else {
                    line = testLine;
                }
            }
            lines.push(line);

            let y = canvas.height - 100;
            for (let k = lines.length - 1; k >= 0; k--) {
                ctx.fillText(lines[k], canvas.width / 2, y);
                y -= 45;
            }
            
            ctx.font = '900 40px Vazirmatn, sans-serif';
            ctx.fillStyle = '#FACC15'; // Title Color
            ctx.fillText(result.characterTitle, canvas.width / 2, y - 20);

            animationId = requestAnimationFrame(drawFrame);
        };

        // 7. Start Playback & Recording
        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(destinationNodeRef.current); // To recorder
        source.connect(audioContextRef.current.destination); // Also to speakers for feedback
        
        recorder.start();
        source.start();
        drawFrame();

        // Safety timeout in case onended doesn't fire
        const safetyTimeout = setTimeout(() => {
            if (isVideoRunning) {
                console.warn("Forcing video stop due to timeout");
                source.stop();
                if (recorder.state !== 'inactive') recorder.stop();
                isVideoRunning = false;
                cancelAnimationFrame(animationId);
            }
        }, (audioBuffer.duration * 1000) + 2000); // Duration + 2s buffer

        await new Promise<void>((resolve) => {
            source.onended = () => {
                clearTimeout(safetyTimeout);
                if (recorder.state !== 'inactive') recorder.stop();
                isVideoRunning = false;
                cancelAnimationFrame(animationId);
                resolve();
            };
        });

        // 8. Wait for Download to finish
        await recordingFinished;

      } catch (e) {
          console.error(e);
          alert("خطا در تولید ویدیو. لطفا مرورگر خود را بررسی کنید.");
      } finally {
          setIsGeneratingVideo(false);
      }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto animate-fade-in pb-20">
      {/* Hidden Canvas for Video Gen */}
      <canvas ref={videoCanvasRef} className="hidden" />

      {/* The Capture Area */}
      <div ref={cardRef} className="relative w-full bg-gray-900 rounded-3xl overflow-hidden shadow-2xl border border-purple-500/30">
        
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
                     disabled={isGeneratingVideo}
                     className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${
                        isPlaying 
                        ? "bg-red-500/20 text-red-400 border border-red-500/50"
                        : "bg-purple-500/20 text-purple-300 border border-purple-500/50 hover:bg-purple-500/30"
                     }`}
                   >
                     {isLoadingAudio ? (
                        <>
                            <Loader2 size={16} className="animate-spin" />
                            <span>در حال ساخت...</span>
                        </>
                     ) : isPlaying ? (
                        <>
                            <StopCircle size={16} />
                            <span>توقف صدا</span>
                        </>
                     ) : (
                        <>
                            <Volume2 size={16} />
                            <span>پخش صدا</span>
                        </>
                     )}
                   </button>
                </div>
            </div>
            
            <div className="text-gray-600 text-xs font-mono opacity-50 pt-2">
                AI Party Scanner • Ravayatgar
            </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="w-full grid grid-cols-2 gap-3 mt-6">
            <button 
                onClick={onReset}
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-bold transition border border-gray-700"
            >
                <RotateCcw size={18} />
                دوباره
            </button>
            
            <button 
                onClick={handleSaveImage}
                disabled={isSavingImage}
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition shadow-lg shadow-blue-900/30"
            >
                {isSavingImage ? <Loader2 className="animate-spin" size={18}/> : <Download size={18} />}
                عکس
            </button>

            <button 
                onClick={handleDownloadAudio}
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold transition shadow-lg shadow-green-900/30"
            >
                <Music size={18} />
                صدا
            </button>

            <button 
                onClick={handleDownloadVideo}
                disabled={isGeneratingVideo}
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold transition shadow-lg shadow-red-900/30"
            >
                {isGeneratingVideo ? <Loader2 className="animate-spin" size={18} /> : <Video size={18} />}
                ویدیو
            </button>
      </div>
    </div>
  );
};
