import React, { useState, useEffect, useRef } from 'react';
import { BarcodeIcon, GpsIcon, CameraIcon, CheckCircleIcon, UploadIcon, WarningIcon, ShieldCheckIcon } from './icons';
import type { WorkOrderPacket, ChecklistItem } from '../types';
import { mockWorkOrders } from '../data/mockWorkOrders';
import SafetyChecklistModal from './SafetyChecklistModal';
import type { FieldSubmissionData } from '../App';


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
  onSubmit: (data: FieldSubmissionData) => void;
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

const FieldCrewApp: React.FC<FieldCrewAppProps> = ({ onSubmit }) => {
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrderPacket | null>(null);
  const [isManualUpload, setIsManualUpload] = useState<boolean>(false);
  const [materialId, setMaterialId] = useState<string | null>(null);
  const [isMaterialVerified, setIsMaterialVerified] = useState<boolean | null>(null);
  const [gpsCoords, setGpsCoords] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [captureMode, setCaptureMode] = useState<CaptureMode>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isChecklistModalOpen, setIsChecklistModalOpen] = useState<boolean>(false);
  const [isChecklistComplete, setIsChecklistComplete] = useState<boolean>(false);
  const [completedChecklist, setCompletedChecklist] = useState<ChecklistItem[]>([]);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const resetForm = () => {
    setSelectedWorkOrder(null);
    setMaterialId(null);
    setIsMaterialVerified(null);
    setGpsCoords(null);
    setPhotoUrl(null);
    setError(null);
    setIsManualUpload(false);
    setFileError(null);
    setIsChecklistComplete(false);
    setIsChecklistModalOpen(false);
    setCompletedChecklist([]);
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
                const scannedValue = barcodes[0].rawValue;
                setMaterialId(scannedValue);

                const isVerified = selectedWorkOrder?.billOfMaterials.some(
                  (item) => item.itemId === scannedValue
                ) ?? false;
                setIsMaterialVerified(isVerified);
                
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
  }, [captureMode, selectedWorkOrder]);


  const allDataCaptured = selectedWorkOrder && materialId && gpsCoords && photoUrl && isChecklistComplete;

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
        workOrder: selectedWorkOrder,
        materialId, 
        gpsCoords, 
        photoUrl,
        isMaterialVerified: isMaterialVerified as boolean,
        completedChecklist,
      });
      resetForm();
    }
  };

  const handleWorkOrderSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = event.target.value;
    setFileError(null);
    setIsChecklistComplete(false);
    setCompletedChecklist([]);

    if (selectedValue === 'manual-upload') {
      setIsManualUpload(true);
      setSelectedWorkOrder(null);
    } else {
      setIsManualUpload(false);
      const workOrder = mockWorkOrders.find(wo => wo.id === selectedValue) || null;
      setSelectedWorkOrder(workOrder);
    }
  };
  
  const handleUploadTrigger = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/json') {
      setFileError('Invalid file type. Please upload a JSON file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') {
          throw new Error("Failed to read file content.");
        }
        const data = JSON.parse(text);
        
        // Basic validation for WorkOrderPacket structure
        if (data.id && data.workOrderNumber && data.task && data.location && Array.isArray(data.billOfMaterials) && Array.isArray(data.safetyChecklist)) {
            setSelectedWorkOrder(data as WorkOrderPacket);
            setFileError(null);
            setIsChecklistComplete(false);
        } else {
          throw new Error("JSON does not match Work Order Packet format.");
        }
      } catch (error) {
        console.error("Error parsing work order file:", error);
        setFileError('Failed to parse file. Ensure it is a valid Work Order JSON.');
        setSelectedWorkOrder(null);
      }
    };
    reader.onerror = () => {
        setFileError("Failed to read the file.");
        setSelectedWorkOrder(null);
    };
    reader.readAsText(file);

    // Reset the input value to allow re-uploading the same file
    if(event.target) {
      event.target.value = '';
    }
  };
  
  const handleChecklistComplete = (items: ChecklistItem[]) => {
    setCompletedChecklist(items);
    setIsChecklistComplete(true);
    setIsChecklistModalOpen(false);
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
              <div className="relative">
                <select
                  id="work-order-select"
                  value={isManualUpload ? 'manual-upload' : selectedWorkOrder?.id || ''}
                  onChange={handleWorkOrderSelect}
                  className="w-full p-3 bg-gray-100 border border-gray-300 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-locus-blue font-medium pr-8"
                >
                  <option value="" disabled>Select a Work Order...</option>
                  {mockWorkOrders.map(wo => (
                    <option key={wo.id} value={wo.id}>
                      {wo.workOrderNumber}
                    </option>
                  ))}
                  <option value="manual-upload">Upload Manually...</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                </div>
              </div>
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept="application/json"
            />
            
            {isManualUpload && !selectedWorkOrder && (
              <div className="mt-3 p-4 border-2 border-dashed border-gray-300 rounded-lg text-center animate-fade-in">
                <button
                  onClick={handleUploadTrigger}
                  className="w-full flex flex-col items-center justify-center p-4 rounded-lg transition-colors bg-gray-50 hover:bg-gray-100 text-locus-blue"
                >
                  <UploadIcon className="w-8 h-8 mb-2" />
                  <span className="font-semibold">Click to upload JSON</span>
                  <span className="text-xs text-gray-500 mt-1">
                    Upload a custom Work Order Packet file.
                  </span>
                </button>
              </div>
            )}

            {fileError && <p className="text-red-500 text-sm text-center mt-2 animate-fade-in">{fileError}</p>}

            {selectedWorkOrder && (
              <div className="animate-fade-in">
                <div className="p-3 bg-locus-blue/5 border-l-4 border-locus-blue/50 rounded-r-lg text-sm space-y-1">
                  <p><span className="font-bold text-locus-text w-24 inline-block">Work Order:</span> {selectedWorkOrder.workOrderNumber}</p>
                  <p><span className="font-bold text-locus-text w-24 inline-block">Task:</span> {selectedWorkOrder.task}</p>
                  <p><span className="font-bold text-locus-text w-24 inline-block">Location:</span> {selectedWorkOrder.location}</p>
                </div>

                <div className="mt-4 border-t pt-4 space-y-3">
                  <button
                    onClick={() => setIsChecklistModalOpen(true)}
                    disabled={isChecklistComplete}
                    className={`w-full flex items-center justify-between p-3 rounded-lg transition-all duration-300 text-left ${
                      isChecklistComplete
                        ? 'bg-green-600 text-white cursor-not-allowed'
                        : 'bg-locus-orange/90 hover:bg-locus-orange text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <ShieldCheckIcon className="w-6 h-6" />
                      <span className="font-medium">
                        {isChecklistComplete ? 'Safety Checklist Complete' : 'Complete Safety Checklist'}
                      </span>
                    </div>
                    {isChecklistComplete && <CheckCircleIcon className="w-6 h-6 text-white" />}
                  </button>
                
                  {!materialId ? (
                    <DataCaptureButton 
                      icon={<BarcodeIcon />} 
                      text="Scan Material Barcode" 
                      onClick={() => setCaptureMode('barcode')} 
                      captured={!!materialId} 
                      disabled={!isChecklistComplete} 
                    />
                  ) : (
                    <div className={`w-full flex items-center justify-between p-3 rounded-lg text-left shadow-sm ${
                        isMaterialVerified
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                    }`}>
                        <div className="flex items-center gap-3">
                            {isMaterialVerified ? (
                                <CheckCircleIcon className="w-6 h-6 text-green-600" />
                            ) : (
                                <WarningIcon className="w-6 h-6 text-yellow-600" />
                            )}
                            <div className="flex flex-col">
                                <span className="font-medium">
                                    {isMaterialVerified ? 'Verified Material' : 'Unverified Material'}
                                </span>
                                <span className="text-xs font-mono">{materialId}</span>
                            </div>
                        </div>
                        <button 
                            onClick={() => setCaptureMode('barcode')} 
                            className="font-semibold text-xs py-1 px-3 rounded-full hover:bg-black/10 transition-colors"
                        >
                            RE-SCAN
                        </button>
                    </div>
                  )}
                  
                  <DataCaptureButton icon={<GpsIcon />} text={isLocating ? 'Locating...' : 'Capture GPS Location'} onClick={handleCaptureGps} captured={!!gpsCoords} disabled={isLocating || !isChecklistComplete} />
                  <DataCaptureButton icon={<CameraIcon />} text="Take Installation Photo" onClick={() => setCaptureMode('photo')} captured={!!photoUrl} disabled={!isChecklistComplete} />
                </div>
              </div>
            )}
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
      {isChecklistModalOpen && selectedWorkOrder && (
          <SafetyChecklistModal 
            checklist={selectedWorkOrder.safetyChecklist}
            onComplete={handleChecklistComplete}
            onClose={() => setIsChecklistModalOpen(false)}
          />
      )}
      {captureMode ? <CaptureView /> : <JobPacketView /> }
    </div>
  );
};

export default FieldCrewApp;
