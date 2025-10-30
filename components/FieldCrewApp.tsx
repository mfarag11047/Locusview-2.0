import React, { useState, useEffect, useRef } from 'react';
import { BarcodeIcon, GpsIcon, CameraIcon, CheckCircleIcon, UploadIcon } from './icons';
import type { SubmittedJobData, WorkOrderData } from '../types';

// Add BarcodeDetector type definitions for browsers that support it.
// This avoids TypeScript errors if the lib definitions are not up to date.
interface Barcode {
  boundingBox: DOMRectReadOnly;
  rawValue: string;
  format: string;
  cornerPoints: { x: number; y: number }[];
}

interface BarcodeDetectorOptions {
  formats?: string[];
}

interface BarcodeDetector {
  new (options?: BarcodeDetectorOptions): BarcodeDetector;
  detect(image: ImageBitmapSource): Promise<Barcode[]>;
  getSupportedFormats(): Promise<string[]>;
}

declare global {
  interface Window {
    BarcodeDetector: BarcodeDetector;
  }
}

interface FieldCrewAppProps {
  onSubmit: (data: SubmittedJobData) => void;
}

type CaptureMode = 'barcode' | 'photo' | null;

const DataCaptureButton = ({ icon, text, onClick, captured, disabled = false }: { icon: React.ReactElement, text: string, onClick: () => void, captured: boolean, disabled?: boolean }) => (
  <button
    onClick={onClick}
    disabled={captured || disabled}
    className={`w-full flex items-center justify-between p-3 rounded-lg transition-all duration-300 text-left ${
      captured
        ? 'bg-locus-blue text-white cursor-not-allowed'
        : disabled 
        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
    }`}
  >
    <div className="flex items-center gap-3">
      {React.cloneElement(icon, { className: "w-6 h-6" })}
      <span className="font-medium">{text}</span>
    </div>
    {captured && <CheckCircleIcon className="w-6 h-6 text-white" />}
  </button>
);

const WorkOrderTask = ({ data, onUploadTrigger, fileInputRef, onFileChange, fileError }: { 
  data: WorkOrderData | null, 
  onUploadTrigger: () => void, 
  fileInputRef: React.RefObject<HTMLInputElement>,
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void,
  fileError: string | null
}) => {
  const captured = !!data;

  return (
    <div className={`rounded-lg transition-all duration-300 shadow-sm ${captured ? 'bg-locus-blue text-white' : 'bg-gray-100 text-gray-700'}`}>
      <input id="work-order-upload" type="file" accept="application/json" className="hidden" onChange={onFileChange} ref={fileInputRef} />
      <button
        onClick={onUploadTrigger}
        disabled={captured}
        className={`w-full flex items-center justify-between p-3 text-left rounded-lg ${captured ? 'cursor-not-allowed' : 'hover:bg-gray-200'}`}
      >
        <div className="flex items-center gap-3">
          <UploadIcon className="w-6 h-6" />
          <span className="font-medium">{captured ? 'Work Order Uploaded' : 'Upload Work Order'}</span>
        </div>
        {captured && <CheckCircleIcon className="w-6 h-6 text-white" />}
      </button>
      
      {captured && data && (
         <div className="space-y-1 text-gray-200 text-sm mt-0 pb-3 px-3">
            <div className="border-t border-white/20 pt-3 mt-2 pl-[36px]">
              <p><span className="font-bold text-white w-24 inline-block">Work Order:</span> {data.workOrder}</p>
              <p><span className="font-bold text-white w-24 inline-block">Task:</span> {data.task}</p>
              <p><span className="font-bold text-white w-24 inline-block">Location:</span> {data.location}</p>
            </div>
        </div>
      )}
      
      {!captured && fileError && <p className="text-red-500 text-xs px-3 pb-2 pt-1 text-center font-medium">{fileError}</p>}
    </div>
  );
};

const FieldCrewApp: React.FC<FieldCrewAppProps> = ({ onSubmit }) => {
  const [workOrderData, setWorkOrderData] = useState<WorkOrderData | null>(null);
  const [materialId, setMaterialId] = useState<string | null>(null);
  const [gpsCoords, setGpsCoords] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [captureMode, setCaptureMode] = useState<CaptureMode>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setWorkOrderData(null);
    setMaterialId(null);
    setGpsCoords(null);
    setPhotoUrl(null);
    setError(null);
    setFileError(null);
    if(fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    const videoEl = videoRef.current;
    let localStream: MediaStream | null = null;
    let scanLoopId: number | null = null;

    const stopCameraAndScan = () => {
      if (scanLoopId) {
        cancelAnimationFrame(scanLoopId);
        scanLoopId = null;
      }
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        localStream = null;
      }
      if (videoEl) {
        videoEl.pause();
        if (videoEl.srcObject) {
          videoEl.srcObject = null;
        }
      }
    };

    if (captureMode) {
      const startCamera = async () => {
        setError(null);
        try {
          const constraints: MediaStreamConstraints = {
            video: {
              facingMode: 'environment',
              // @ts-ignore - focusMode is not standard in all TS lib versions but supported by many browsers.
              focusMode: 'continuous',
            }
          };
          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          localStream = stream;
          streamRef.current = stream;
          if (videoEl) {
            videoEl.srcObject = stream;
            await videoEl.play();

            if (captureMode === 'barcode') {
              if ('BarcodeDetector' in window) {
                startScanLoop();
              } else {
                setError('Barcode scanner is not supported on this browser.');
                setCaptureMode(null);
              }
            }
          }
        } catch (err) {
          console.error("Error starting camera:", err);
          setError("Could not access camera. Please check permissions.");
          setCaptureMode(null);
        }
      };

      const startScanLoop = () => {
        if (!videoEl || !canvasRef.current) return;
        
        const video = videoEl;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        const barcodeDetector = new window.BarcodeDetector({
          formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'upc_a', 'upc_e'],
        });

        const scan = async () => {
          // Check if camera is still active. captureMode change will stop it via cleanup.
          if (!streamRef.current || !context) return; 

          if (video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            try {
              const barcodes = await barcodeDetector.detect(canvas);
              if (barcodes.length > 0 && barcodes[0].rawValue) {
                setMaterialId(barcodes[0].rawValue);
                setCaptureMode(null); // This will trigger useEffect cleanup and stop the scan.
                return; // Stop the loop
              }
            } catch (err) {
              console.error('Barcode detection failed during scan:', err);
              // It can fail if the frame is blurry or for other reasons, we just continue scanning.
            }
          }
          scanLoopId = requestAnimationFrame(scan);
        };
        scan();
      };

      startCamera();
    }

    return () => {
      stopCameraAndScan();
    };
  }, [captureMode]);


  const allDataCaptured = workOrderData && materialId && gpsCoords && photoUrl;

  const handleCaptureGps = () => {
    setIsLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setGpsCoords(`${latitude.toFixed(6)}° N, ${longitude.toFixed(6)}° W`);
        setIsLocating(false);
      },
      (err) => {
        console.error("Error getting location:", err);
        setError("Could not get GPS location. Please enable location services.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true }
    );
  };
  
  const handleTakePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setPhotoUrl(dataUrl);
      }
      setCaptureMode(null);
    }
  };

  const handleSubmit = () => {
    if (allDataCaptured) {
      onSubmit({ 
        ...workOrderData,
        materialId, 
        gpsCoords, 
        photoUrl 
      });
      resetForm();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileError(null);
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result;
          if (typeof text === 'string') {
            const parsedData = JSON.parse(text);
            if (parsedData.workOrder && parsedData.task && parsedData.location) {
              setWorkOrderData(parsedData);
            } else {
              setFileError('Invalid work order file. Missing required fields.');
            }
          }
        } catch (err) {
          setFileError('Failed to parse JSON. Please upload a valid file.');
        }
      };
      reader.onerror = () => {
        setFileError('Failed to read the file.');
      };
      reader.readAsText(file);
    }
  };
  
  const handleUploadTrigger = () => {
    fileInputRef.current?.click();
  };

  const CaptureView = () => (
    <div className="flex flex-col items-center justify-center p-4 bg-black rounded-lg">
      <h3 className="text-lg font-bold text-white mb-2">
        {captureMode === 'barcode' ? 'Scan Material Barcode' : 'Take Installation Photo'}
      </h3>
      <div className="relative w-full aspect-square rounded-md overflow-hidden bg-gray-800">
        <video ref={videoRef} playsInline muted className="w-full h-full object-cover"></video>
        {captureMode === 'barcode' && (
           <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="w-3/4 h-1/3 border-4 border-dashed border-white/70 rounded-lg animate-pulse"></div>
            <p className="text-white text-center mt-4 bg-black/50 px-3 py-1 rounded-md">
              Point camera at barcode
            </p>
          </div>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden"></canvas>
      
      {error && <p className="text-red-500 text-sm text-center mt-3 animate-pulse">{error}</p>}

      <div className="mt-4 w-full">
        {captureMode === 'barcode' && (
          <div className="text-center text-white/80">
            <div className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse [animation-delay:-0.3s]"></div>
              <div className="w-2 h-2 bg-white rounded-full animate-pulse [animation-delay:-0.15s]"></div>
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <span className="ml-2 font-medium">Scanning...</span>
            </div>
          </div>
        )}
        {captureMode === 'photo' && (
          <button onClick={handleTakePhoto} className="w-full bg-locus-orange text-white font-bold py-2 px-6 rounded-full shadow-lg">
            Capture Photo
          </button>
        )}
      </div>
       <button onClick={() => setCaptureMode(null)} className="mt-2 text-gray-300 hover:text-white text-sm">
          Cancel
        </button>
    </div>
  );

  const JobPacketView = () => (
     <>
        <div className="flex-grow">
          <header className="flex items-center gap-3 border-b border-gray-200 pb-3 mb-6">
               <div className="w-10 h-10 bg-locus-blue rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
              </div>
              <h2 className="text-xl font-bold text-locus-text">Field Job Packet</h2>
          </header>
          
          {error && <p className="text-red-500 text-sm text-center mb-3">{error}</p>}

          <div className="space-y-3">
            <WorkOrderTask 
              data={workOrderData}
              onUploadTrigger={handleUploadTrigger}
              fileInputRef={fileInputRef}
              onFileChange={handleFileChange}
              fileError={fileError}
            />
            <DataCaptureButton icon={<BarcodeIcon />} text="Scan Material Barcode" onClick={() => setCaptureMode('barcode')} captured={!!materialId} />
            <DataCaptureButton icon={<GpsIcon />} text={isLocating ? 'Locating...' : 'Capture GPS Location'} onClick={handleCaptureGps} captured={!!gpsCoords} disabled={isLocating} />
            <DataCaptureButton icon={<CameraIcon />} text="Take Installation Photo" onClick={() => setCaptureMode('photo')} captured={!!photoUrl} />
          </div>
        </div>
        
        <div className="mt-8">
          <button
            onClick={handleSubmit}
            disabled={!allDataCaptured}
            className={`w-full py-3 px-4 rounded-lg font-bold text-lg transition-all duration-300 transform
              ${!allDataCaptured
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-locus-orange hover:opacity-90 text-white shadow-lg shadow-locus-orange/40 hover:scale-105'
              }`
            }
          >
            Submit & Close-Out Job
          </button>
        </div>
      </>
  );

  return (
    <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-gray-200 p-6 flex flex-col min-h-[600px]">
      {captureMode ? <CaptureView /> : <JobPacketView /> }
    </div>
  );
};

export default FieldCrewApp;