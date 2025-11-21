
import React, { useRef, useEffect, useState } from 'react';
import { RefreshCw, X, Check, Plus, Image as ImageIcon, AlertTriangle } from 'lucide-react';

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [error, setError] = useState<string>('');
  const [retryTrigger, setRetryTrigger] = useState(0);
  
  // State for multi-mode
  const [capturedImages, setCapturedImages] = useState<string[]>([]);

  // CONSTANTS FOR IMAGE OPTIMIZATION
  const MAX_IMAGE_SIZE = 800; // Reduced from 1024 to prevent Rpc/XHR errors
  const IMAGE_QUALITY = 0.6;  // Reduced from 0.7

  useEffect(() => {
    let isMounted = true;
    
    const initCamera = async () => {
      setError('');
      
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
            width: { ideal: 1280 }, // Request reasonable resolution, we resize later anyway
            height: { ideal: 720 }
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
      } catch (err: any) {
        console.error("Error accessing camera:", err);
        if (isMounted) {
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
             setError('دسترسی به دوربین رد شد. لطفا مجوز مرورگر (آیکون قفل 🔒 یا دوربین 📷 در نوار آدرس) را بررسی کنید.');
          } else if (err.name === 'NotFoundError') {
             setError('دوربین پیدا نشد.');
          } else if (err.name === 'NotReadableError') {
             setError('دوربین در حال استفاده است یا قابل دسترسی نیست.');
          } else {
             setError('خطا در اتصال به دوربین: ' + (err.message || 'نامشخص'));
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
  }, [facingMode, retryTrigger]);

  const processFile = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let w = img.width;
          let h = img.height;
          
          if (w > h) {
            if (w > MAX_IMAGE_SIZE) {
              h = Math.round(h * (MAX_IMAGE_SIZE / w));
              w = MAX_IMAGE_SIZE;
            }
          } else {
            if (h > MAX_IMAGE_SIZE) {
              w = Math.round(w * (MAX_IMAGE_SIZE / h));
              h = MAX_IMAGE_SIZE;
            }
          }
          
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
              ctx.drawImage(img, 0, 0, w, h);
              resolve(canvas.toDataURL('image/jpeg', IMAGE_QUALITY));
          }
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        const newImages: string[] = [];
        // Process all selected files
        for (let i = 0; i < e.target.files.length; i++) {
            const file = e.target.files[i];
            const base64 = await processFile(file);
            newImages.push(base64);
        }

        if (multiMode) {
            setCapturedImages(prev => [...prev, ...newImages]);
        } else {
            // Single mode: just take the first one and finish
            onCapture(newImages[0]);
        }
        
        // Reset input value to allow selecting the same file again
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }
  };

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        const { videoWidth, videoHeight } = videoRef.current;
        
        let width = videoWidth;
        let height = videoHeight;

        if (width > height) {
            if (width > MAX_IMAGE_SIZE) {
                height = Math.round(height * (MAX_IMAGE_SIZE / width));
                width = MAX_IMAGE_SIZE;
            }
        } else {
            if (height > MAX_IMAGE_SIZE) {
                width = Math.round(width * (MAX_IMAGE_SIZE / height));
                height = MAX_IMAGE_SIZE;
            }
        }

        canvasRef.current.width = width;
        canvasRef.current.height = height;
        
        if (facingMode === 'user') {
            context.translate(width, 0);
            context.scale(-1, 1);
        }

        context.drawImage(videoRef.current, 0, 0, width, height);
        const imageSrc = canvasRef.current.toDataURL('image/jpeg', IMAGE_QUALITY);
        
        if (multiMode) {
            setCapturedImages(prev => [...prev, imageSrc]);
        } else {
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

  const triggerRetry = () => {
      setRetryTrigger(prev => prev + 1);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col font-vazir">
      {/* Hidden Input for Gallery */}
      <input 
        type="file" 
        ref={fileInputRef}
        accept="image/*" 
        multiple={multiMode} // Allow multiple selection in story mode
        className="hidden" 
        onChange={handleFileChange}
      />

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/70 to-transparent">
         <button onClick={onClose} className="text-white p-2 rounded-full bg-white/20 backdrop-blur-md hover:bg-white/30 transition">
            <X className="w-6 h-6" />
         </button>
         
         <span className="text-white font-bold text-lg shadow-sm drop-shadow-md">
            {multiMode ? `داستان‌ساز (${capturedImages.length})` : 'روایتگر'}
         </span>
         
         {/* Top Right: Finish Button (Only for MultiMode) */}
         <div className="w-10 flex justify-end">
            {multiMode && capturedImages.length > 0 && (
                 <button 
                    onClick={handleFinishMulti}
                    className="p-2 rounded-full bg-green-500 text-white hover:bg-green-400 transition animate-pulse"
                 >
                     <Check className="w-6 h-6" />
                 </button>
            )}
         </div>
      </div>

      {/* Video Feed or Error View */}
      <div className="flex-1 relative flex items-center justify-center bg-gray-900 overflow-hidden">
        {error ? (
          <div className="relative z-20 text-white text-center p-6 max-w-sm mx-auto flex flex-col items-center animate-fade-in">
            <div className="mb-6 text-red-200 bg-red-900/40 p-6 rounded-2xl border border-red-500/30 backdrop-blur-md shadow-xl">
                <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-red-500" />
                <p className="font-bold text-lg mb-2 text-red-100">عدم دسترسی به دوربین</p>
                <p className="text-sm opacity-80 leading-relaxed">{error}</p>
            </div>
            
            <div className="flex flex-col gap-3 w-full">
                <button 
                    onClick={triggerRetry}
                    className="w-full bg-purple-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-purple-500 transition shadow-lg shadow-purple-900/30 flex items-center justify-center gap-2"
                >
                    <RefreshCw size={18} />
                    تلاش مجدد
                </button>
                
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full bg-gray-800 text-gray-200 px-6 py-3 rounded-xl font-bold hover:bg-gray-700 transition border border-gray-700 flex items-center justify-center gap-2"
                >
                    <ImageIcon size={18} />
                    انتخاب عکس از گالری
                </button>
            </div>
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
        <div className="absolute bottom-32 left-0 right-0 h-20 px-4 flex gap-2 overflow-x-auto z-20 no-scrollbar bg-gradient-to-t from-black/50 to-transparent items-center">
            {capturedImages.map((img, idx) => (
                <div key={idx} className="relative flex-shrink-0">
                    <img src={img} className="h-16 w-16 rounded-lg border-2 border-white/50 object-cover" alt={`capture ${idx}`} />
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-purple-600 rounded-full text-xs flex items-center justify-center text-white border border-white">
                        {idx + 1}
                    </div>
                </div>
            ))}
        </div>
      )}

      {/* Controls - Hidden on Error */}
      {!error && (
        <div className="absolute bottom-0 left-0 right-0 p-8 pb-12 flex justify-around items-center bg-gradient-to-t from-black/90 to-transparent z-30">
            
            {/* Left Button: Gallery */}
            <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-4 rounded-full bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 transition"
            >
                <ImageIcon className="w-6 h-6" />
            </button>
            
            {/* Capture Button */}
            <button 
                onClick={handleCapture}
                className="p-1 rounded-full border-4 border-white/80 hover:scale-105 active:scale-95 transition-transform duration-200"
            >
                <div className="w-16 h-16 rounded-full bg-white border-2 border-black/20 flex items-center justify-center">
                    {multiMode && <Plus className="text-gray-400 w-8 h-8" />}
                </div>
            </button>

            {/* Right Button: Flip Camera */}
            <button 
                onClick={toggleCamera}
                className="p-4 rounded-full bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 transition"
            >
            <RefreshCw className="w-6 h-6" />
            </button>
        </div>
      )}
    </div>
  );
};
