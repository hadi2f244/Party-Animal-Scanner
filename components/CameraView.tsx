import React, { useRef, useEffect, useState } from 'react';
import { RefreshCw, X, Check, Plus } from 'lucide-react';

interface CameraViewProps {
  onCapture: (imageSrc: string) => void;
  onClose: () => void;
  multiMode?: boolean; // If true, allows taking multiple photos
  onMultiCaptureFinish?: (images: string[]) => void;
}

export const CameraView: React.FC<CameraViewProps> = ({ onCapture, onClose, multiMode = false, onMultiCaptureFinish }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [error, setError] = useState<string>('');
  
  // State for multi-mode
  const [capturedImages, setCapturedImages] = useState<string[]>([]);

  useEffect(() => {
    let isMounted = true;
    
    const initCamera = async () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("مرورگر شما از دوربین پشتیبانی نمی‌کند");
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: facingMode,
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: false,
        });

        if (!isMounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setError('');
      } catch (err: any) {
        console.error("Error accessing camera:", err);
        if (isMounted) {
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
             setError('دسترسی به دوربین رد شد. لطفا مجوز مرورگر را بررسی کنید.');
          } else if (err.name === 'NotFoundError') {
             setError('دوربین پیدا نشد.');
          } else if (err.name === 'NotReadableError') {
             setError('دوربین در حال استفاده است یا قابل دسترسی نیست.');
          } else {
             setError('خطا در اتصال به دوربین.');
          }
        }
      }
    };

    initCamera();

    return () => {
      isMounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [facingMode]);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        const { videoWidth, videoHeight } = videoRef.current;
        
        const MAX_SIZE = 1024;
        let width = videoWidth;
        let height = videoHeight;

        if (width > height) {
            if (width > MAX_SIZE) {
                height = Math.round(height * (MAX_SIZE / width));
                width = MAX_SIZE;
            }
        } else {
            if (height > MAX_SIZE) {
                width = Math.round(width * (MAX_SIZE / height));
                height = MAX_SIZE;
            }
        }

        canvasRef.current.width = width;
        canvasRef.current.height = height;
        
        if (facingMode === 'user') {
            context.translate(width, 0);
            context.scale(-1, 1);
        }

        context.drawImage(videoRef.current, 0, 0, width, height);
        const imageSrc = canvasRef.current.toDataURL('image/jpeg', 0.7);
        
        if (multiMode) {
            // Add to list, but don't close
            setCapturedImages(prev => [...prev, imageSrc]);
            // Visual feedback could be added here (flash effect)
        } else {
            // Single mode: return immediately
            onCapture(imageSrc);
        }
      }
    }
  };

  const handleFinishMulti = () => {
    if (onMultiCaptureFinish && capturedImages.length > 0) {
        onMultiCaptureFinish(capturedImages);
    }
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/70 to-transparent">
         <button onClick={onClose} className="text-white p-2 rounded-full bg-white/20 backdrop-blur-md">
            <X className="w-6 h-6" />
         </button>
         <span className="text-white font-bold text-lg shadow-sm">
            {multiMode ? `داستان‌ساز (${capturedImages.length} عکس)` : 'شکار لحظه‌ها'}
         </span>
         <div className="w-10"></div>
      </div>

      {/* Video Feed */}
      <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden">
        {error ? (
          <div className="text-white text-center p-6 max-w-xs mx-auto">
            <div className="mb-4 text-red-400 bg-red-900/20 p-4 rounded-xl border border-red-500/30">
                {error}
            </div>
            <button 
                onClick={() => setFacingMode(prev => prev)}
                className="bg-purple-600 px-6 py-2 rounded-lg font-bold hover:bg-purple-500 transition"
            >
                تلاش مجدد
            </button>
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
          />
        )}
      </div>
      
      <canvas ref={canvasRef} className="hidden" />

      {/* Multi-Mode Thumbnails */}
      {multiMode && capturedImages.length > 0 && (
        <div className="absolute bottom-32 left-0 right-0 h-20 px-4 flex gap-2 overflow-x-auto z-20 no-scrollbar bg-gradient-to-t from-black/50 to-transparent">
            {capturedImages.map((img, idx) => (
                <img key={idx} src={img} className="h-16 w-16 rounded-lg border-2 border-white/50 object-cover" alt={`capture ${idx}`} />
            ))}
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-8 pb-12 flex justify-around items-center bg-gradient-to-t from-black/90 to-transparent z-30">
        {/* Left Button: Finish (Multi) or Gallery (Single) */}
        {multiMode ? (
             <button 
                onClick={handleFinishMulti}
                disabled={capturedImages.length === 0}
                className={`p-3 rounded-xl flex items-center gap-2 backdrop-blur-sm transition ${capturedImages.length > 0 ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-white/10 text-gray-400'}`}
            >
                 <Check className="w-6 h-6" />
                 <span className="font-bold text-sm">تمام</span>
            </button>
        ) : (
            <button 
                onClick={() => document.getElementById('file-upload')?.click()}
                className="p-4 rounded-full bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 transition"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
            </button>
        )}
        
        {/* Capture Button */}
        <button 
            onClick={handleCapture}
            disabled={!!error}
            className={`p-1 rounded-full border-4 transition-transform duration-200 ${error ? 'opacity-50 cursor-not-allowed border-gray-500' : 'border-white/80 hover:scale-105 active:scale-95'}`}
        >
            <div className={`w-16 h-16 rounded-full border-2 border-black/20 flex items-center justify-center ${error ? 'bg-gray-500' : 'bg-white'}`}>
                {multiMode && <Plus className="text-gray-400 w-8 h-8" />}
            </div>
        </button>

        {/* Flip Camera */}
        <button 
            onClick={toggleCamera}
            className="p-4 rounded-full bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 transition"
        >
          <RefreshCw className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};