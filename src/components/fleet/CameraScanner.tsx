import React, { useState, useEffect, useRef } from 'react';
import { decodeQRImage } from '../../lib/qrScan';
import { parseQRIdentifier } from '../../lib/fieldOperations';
import { Camera, CheckCircle2, AlertCircle, RefreshCw, Upload, Sparkles } from 'lucide-react';

export const CameraScanner: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const [scanSuccess, setScanSuccess] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isScanning, setIsScanning] = useState(false);
  const [scannedId, setScannedId] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const cameraRequestRef = useRef(0);
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopCameraStream = () => {
    cameraRequestRef.current += 1;
    setIsScanning(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCameraStream();
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    };
  }, []);

  const startCamera = async (mode: 'environment' | 'user') => {
    stopCameraStream();
    const request = cameraRequestRef.current;
    setCameraError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Live webcam feed is blocked by browser security (requires localhost or HTTPS).');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: mode }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      if (request !== cameraRequestRef.current) { stream.getTracks().forEach(track => track.stop()); return; }
      mediaStreamRef.current = stream;
      setIsCameraActive(true);
      setIsScanning(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.play().catch((e) => console.log('Video play error:', e));
      }
    } catch (err: any) {
      setCameraError('Camera permission denied or device not found.');
    }
  };

  const tick = () => {
    if (!isScanning || !videoRef.current || !canvasRef.current || scanSuccess) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = decodeQRImage(imageData.data, imageData.width, imageData.height);

        if (code) {
          if (navigator.vibrate) {
            navigator.vibrate([100, 50, 100]);
          }
          handleProcessScan(code);
          return;
        }
      }
    }
    animationFrameRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    if (isScanning && isCameraActive && !scanSuccess) {
      animationFrameRef.current = requestAnimationFrame(tick);
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isScanning, isCameraActive, scanSuccess]);

  const handleProcessScan = (codeToScan: string) => {
    setScannerError(null);
    let cleanId: string;
    try { cleanId = parseQRIdentifier(codeToScan); }
    catch { setScannerError('This QR does not contain a valid machine label ID.'); return; }
    
    if (cleanId) {
      stopCameraStream();
      setScannedId(cleanId);
      setScanSuccess(true);
      
      // Auto redirect after 900ms
      redirectTimerRef.current = setTimeout(() => {
        window.location.href = `/scan/${encodeURIComponent(cleanId)}`;
      }, 900);
    } else {
      setScannerError(`Could not extract a valid ID from the QR code.`);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setScannerError(null);
    if (!file.type.startsWith('image/') || file.size > 10 * 1024 * 1024) { setScannerError('Choose an image smaller than 10 MB.'); return; }

    const reader = new FileReader();
    reader.onerror = () => setScannerError('Could not read this image. Try another photo.');
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const img = new Image();
      img.onerror = () => setScannerError('This image could not be opened. Try a PNG or JPEG.');
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, 2400 / Math.max(img.width, img.height));
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = decodeQRImage(imageData.data, imageData.width, imageData.height);
          if (code) {
            handleProcessScan(code);
          } else {
            setScannerError('Could not detect a clear QR code in the uploaded photo.');
          }
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className={`${embedded ? 'min-h-0 rounded-2xl' : 'min-h-screen p-4'} bg-slate-950 flex flex-col items-center justify-center`}>
      <div className="bg-slate-900 border-2 border-emerald-600 text-white rounded-[32px] max-w-md w-full shadow-2xl overflow-hidden relative">
        <canvas ref={canvasRef} className="hidden" />
        <input ref={fileInputRef} type="file" aria-label="QR image" accept="image/*" onChange={handleFileUpload} className="hidden" />

        <div className="bg-emerald-900/30 p-5 flex items-center justify-between border-b border-emerald-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Machine Scanner</h2>
              <p className="text-xs text-emerald-200/70 font-medium">Point at QR code on the machine</p>
            </div>
          </div>
          {isCameraActive && (
            <button aria-label="Switch camera" onClick={() => { const next = facingMode === 'environment' ? 'user' : 'environment'; setFacingMode(next); startCamera(next); }} className="bg-white/10 hover:bg-white/20 p-2.5 rounded-xl transition-colors">
              <RefreshCw className="w-5 h-5 text-emerald-100" />
            </button>
          )}
        </div>

        <div className="relative bg-black aspect-[3/4] sm:aspect-square flex flex-col items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />

          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`absolute inset-0 w-full h-full object-cover z-0 transition-opacity duration-300 ${
              isCameraActive && !scanSuccess ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          />

          {isCameraActive && !scanSuccess && (
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#10b981] animate-[bounce_2s_infinite] z-10 pointer-events-none" />
          )}

          <div className={`relative z-10 w-64 h-64 border-2 rounded-3xl flex items-center justify-center transition-all duration-300 shadow-2xl backdrop-blur-[2px] ${
            scanSuccess ? 'border-emerald-400 bg-emerald-500/20 scale-105' : 'border-emerald-500/80 border-dashed bg-black/10'
          }`}>
            <div className="absolute -top-3 -left-3 w-8 h-8 border-t-4 border-l-4 border-emerald-500 rounded-tl-xl" />
            <div className="absolute -top-3 -right-3 w-8 h-8 border-t-4 border-r-4 border-emerald-500 rounded-tr-xl" />
            <div className="absolute -bottom-3 -left-3 w-8 h-8 border-b-4 border-l-4 border-emerald-500 rounded-bl-xl" />
            <div className="absolute -bottom-3 -right-3 w-8 h-8 border-b-4 border-r-4 border-emerald-500 rounded-br-xl" />

            {scanSuccess ? (
              <div className="text-center animate-scaleIn bg-slate-900/95 p-6 rounded-2xl border border-emerald-400 shadow-xl backdrop-blur-md">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce mb-3" />
                <span className="text-sm font-bold text-white uppercase tracking-widest block mb-1">Found Machine ID</span>
                <span className="text-lg font-mono font-bold text-emerald-400 bg-emerald-950/50 px-4 py-1.5 rounded-lg border border-emerald-800/50 block">
                  {scannedId}
                </span>
              </div>
            ) : isCameraActive ? (
              <div className="text-center p-3 bg-black/40 rounded-xl backdrop-blur-sm pointer-events-none">
                <span className="text-xs font-bold text-emerald-200 block uppercase tracking-wider">
                  Align QR within frame
                </span>
              </div>
            ) : (
              <div className="text-center space-y-3 p-4">
                <Camera className="w-10 h-10 text-slate-500 mx-auto" />
                <span className="text-xs font-bold text-slate-400 block">Camera inactive</span>
                <button
                  type="button"
                  onClick={() => startCamera(facingMode)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition"
                >
                  Enable camera
                </button>
              </div>
            )}
          </div>

          {cameraError && !scanSuccess && (
            <div className="absolute inset-x-4 bottom-4 bg-red-950/90 text-red-200 text-xs p-3 rounded-2xl border border-red-900/50 flex flex-col sm:flex-row items-center justify-between gap-3 z-20 backdrop-blur-md">
              <div className="flex items-center gap-2 text-left">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                <span>{cameraError}</span>
              </div>
            </div>
          )}

          {scannerError && (
            <div className="absolute top-4 inset-x-4 bg-amber-950/90 text-amber-200 text-xs p-3 rounded-2xl border border-amber-900/50 flex items-center justify-between gap-3 z-30 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                <span role="alert">{scannerError}</span>
              </div>
              <button
                type="button"
                onClick={() => setScannerError(null)}
                className="text-amber-300 hover:text-white font-bold bg-amber-900/30 px-3 py-1.5 rounded-lg transition"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>

        <div className="p-5 bg-slate-900 border-t border-slate-800">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm py-4 rounded-xl transition flex items-center justify-center gap-2"
          >
            <Upload className="w-5 h-5 text-emerald-400" />
            Upload QR Photo
          </button>
        </div>
      </div>
    </div>
  );
};
