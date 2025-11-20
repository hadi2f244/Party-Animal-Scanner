import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, RefreshCw, Circle, X } from 'lucide-react';

interface CameraViewProps {
  onCapture: (imageSrc: string) => void;
  onClose: () => void;
}

export const CameraView: React.FC<CameraViewProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>('');

  const startCamera = useCallback(async () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingMode },
        audio: false,
      });
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
      setError('');
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError('دسترسی به دوربین امکان‌پذیر نیست. لطفا مجوزها را بررسی کنید.');
    }
  }, [facingMode]);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        const { videoWidth, videoHeight } = videoRef.current;
        
        // Resize to reduce payload size (max 1024px)
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
        
        // Flip horizontally if using front camera for mirror effect
        if (facingMode === 'user') {
            context.translate(width, 0);
            context.scale(-1, 1);
        }

        context.drawImage(videoRef.current, 0, 0, width, height);
        // Compress to 0.7 quality JPEG
        const imageSrc = canvasRef.current.toDataURL('image/jpeg', 0.7);
        onCapture(imageSrc);
      }
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
         <span className="text-white font-bold text-lg shadow-sm">شکار لحظه‌ها</span>
         <div className="w-10"></div> {/* Spacer */}
      </div>

      {/* Video Feed */}
      <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden">
        {error ? (
          <div className="text-white text-center p-6">
            <p className="mb-4 text-red-400">{error}</p>
            <button 
                onClick={() => startCamera()} 
                className="bg-purple-600 px-4 py-2 rounded-lg"
            >
                تلاش مجدد
            </button>
          </div>
        ) : (
            // transform scale-x-[-1] mirrors the user view so it feels natural like a mirror
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
          />
        )}
      </div>
      
      <canvas ref={canvasRef} className="hidden" />

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-8 pb-12 flex justify-around items-center bg-gradient-to-t from-black/90 to-transparent">
        <button 
            onClick={() => document.getElementById('file-upload')?.click()}
            className="p-4 rounded-full bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 transition"
        >
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
        </button>
        
        <button 
            onClick={handleCapture}
            className="p-1 rounded-full border-4 border-white/80 hover:scale-105 transition-transform duration-200"
        >
            <div className="w-16 h-16 bg-white rounded-full border-2 border-black/20"></div>
        </button>

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