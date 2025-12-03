import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, RefreshCw } from 'lucide-react';
import { Language } from '../types';
import { translations } from '../utils/translations';

interface CameraCaptureProps {
  onCapture: (imageBase64: string) => void;
  lang?: Language;
  variant?: 'default' | 'profile';
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, lang = 'pt', variant = 'default' }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string>('');
  const t = translations[lang];

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const startCamera = async () => {
    stopCamera(); // Ensure clean start
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } // Prefer front camera on mobile
      });
      streamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setError('');
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError('Could not access camera. Please allow permissions.');
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context) {
        // --- SMART CROP LOGIC ---
        // Instead of capturing the full wide webcam view, we crop to the center
        // where the user is positioning their face. This removes background noise for AI.
        
        const videoW = video.videoWidth;
        const videoH = video.videoHeight;

        // Calculate Crop Dimensions
        // Use 70-85% of the video height to define the "Face Zone" size
        let cropHeight = Math.min(videoH * 0.85, videoH); 
        // For profile, we want 1:1. For default (fatigue/check-in), we want 3:4.
        let cropWidth = variant === 'profile' ? cropHeight : cropHeight * 0.75; 

        // Handle edge case where video is very tall/narrow (mobile portrait)
        if (cropWidth > videoW) {
            cropWidth = videoW;
            cropHeight = variant === 'profile' ? cropWidth : cropWidth / 0.75;
        }

        // Calculate Center Coordinates
        const startX = (videoW - cropWidth) / 2;
        const startY = (videoH - cropHeight) / 2;

        // Set final image size
        canvas.width = cropWidth;
        canvas.height = cropHeight;

        // Draw ONLY the cropped region
        // drawImage(source, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
        context.drawImage(
            video, 
            startX, startY, cropWidth, cropHeight, // Source Crop
            0, 0, cropWidth, cropHeight            // Destination
        );

        const imageBase64 = canvas.toDataURL('image/jpeg', 0.9);
        
        stopCamera();
        onCapture(imageBase64);
      }
    }
  }, [onCapture, variant]);

  const retryCamera = () => {
    startCamera();
  };

  return (
    <div className="w-full flex flex-col items-center gap-4">
      <div className="relative w-full max-w-md aspect-[4/3] bg-slate-900 rounded-xl overflow-hidden shadow-lg border-2 border-slate-700">
        {!error ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform scale-x-[-1]" // Mirror effect
            />
            
            {/* Darken the area OUTSIDE the oval to focus user attention */}
            <div className="absolute inset-0 pointer-events-none">
                 <div className={`w-full h-full bg-slate-900/50 ${
                    variant === 'profile' 
                    ? '[mask-image:radial-gradient(circle_140px_at_center,transparent_40%,black_100%)]' 
                    : '[mask-image:radial-gradient(ellipse_160px_220px_at_center,transparent_40%,black_100%)]'
                 }`}></div>
            </div>

            {/* Visual Guide Border */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className={`
                    ${variant === 'profile' ? 'w-64 h-64 rounded-full' : 'w-48 h-64 rounded-[50%]'} 
                    border-2 border-emerald-400/80 shadow-[0_0_20px_rgba(52,211,153,0.3)] animate-pulse-slow
                `}></div>
            </div>
            
            <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
                <span className="bg-black/60 text-white px-4 py-1.5 rounded-full text-sm font-medium backdrop-blur-md border border-white/10">
                   {t.facePosition}
                </span>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-red-400 p-4 text-center bg-slate-800">
            {error}
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="flex gap-4">
        {error ? (
           <button
           onClick={retryCamera}
           className="flex items-center gap-2 bg-slate-200 text-slate-800 px-6 py-3 rounded-full font-semibold hover:bg-slate-300 transition-colors"
         >
           <RefreshCw size={20} /> {t.retry}
         </button>
        ) : (
          <button
            onClick={capturePhoto}
            className="flex items-center gap-2 bg-[#3DCD58] text-white px-10 py-3 rounded-full font-bold shadow-lg shadow-emerald-900/20 hover:bg-[#32b54d] active:scale-95 transition-all transform hover:-translate-y-1"
          >
            <Camera size={20} /> {t.capture}
          </button>
        )}
      </div>
    </div>
  );
};