import './camera-scanner.css';
import React, { useState, useEffect, useRef } from 'react';
import { decodeQRImage } from '../../lib/qrScan';
import { parseQRIdentifier } from '../../lib/fieldOperations';
import { Camera, CheckCircle2, AlertCircle, RefreshCw, Upload, ScanLine, Square } from 'lucide-react';

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

  return <section className={`machine-scanner ${embedded ? 'is-embedded' : ''}`} aria-label="Machine QR scanner">
    <canvas ref={canvasRef} hidden />
    <input ref={fileInputRef} type="file" aria-label="QR image" accept="image/*" onChange={handleFileUpload} hidden />
    <header className="scanner-toolbar"><div className="scanner-status"><span className={`scanner-dot ${isCameraActive?'is-live':''}`}/><span>{scanSuccess?'QR detected':isCameraActive?'Camera is scanning':'Camera ready'}</span></div>{isCameraActive&&!scanSuccess&&<button type="button" className="scanner-switch" aria-label="Switch camera" onClick={()=>{const next=facingMode==='environment'?'user':'environment';setFacingMode(next);void startCamera(next);}}><RefreshCw size={17}/><span>Switch camera</span></button>}</header>
    <div className={`scanner-view ${isCameraActive?'is-active':''} ${scanSuccess?'is-success':''}`}>
      <video ref={videoRef} autoPlay playsInline muted className={isCameraActive&&!scanSuccess?'':'scanner-video-hidden'}/>
      {!isCameraActive&&!scanSuccess&&<div className="scanner-idle"><span className="scanner-camera-icon"><Camera size={28}/></span><h3>Scan the machine sticker</h3><p>Use your rear camera and hold the QR steady.</p><button type="button" className="scanner-enable" onClick={()=>void startCamera(facingMode)}><Camera size={17}/>Enable camera</button></div>}
      {isCameraActive&&!scanSuccess&&<><div className="scanner-frame" aria-hidden="true"><i/><i/><i/><i/></div><span className="scanner-live-hint"><ScanLine size={15}/>Keep the QR inside the frame</span></>}
      {scanSuccess&&<div className="scanner-success" role="status"><CheckCircle2 size={38}/><h3>Machine QR found</h3><strong>{scannedId}</strong><p>Opening the machine record…</p></div>}
    </div>
    <div className="scanner-guidance"><ScanLine size={18}/><p>{isCameraActive?'Move closer until the QR is clear. Avoid glare and keep the sticker fully visible.':'Camera access starts only when you enable it. You can also upload a photo of the QR sticker.'}</p></div>
    {(cameraError||scannerError)&&<div className="scanner-error" role="alert"><AlertCircle size={18}/><p>{scannerError||cameraError}</p>{scannerError&&<button type="button" onClick={()=>setScannerError(null)}>Dismiss</button>}</div>}
    <footer className="scanner-actions"><button type="button" className="scanner-upload" onClick={()=>fileInputRef.current?.click()} disabled={scanSuccess}><Upload size={18}/>Upload QR photo</button>{isCameraActive&&!scanSuccess&&<button type="button" className="scanner-stop" onClick={stopCameraStream}><Square size={15}/>Stop camera</button>}</footer>
    <p className="scanner-footnote">The QR opens the machine’s onboarding or field record.</p>
  </section>;
};
