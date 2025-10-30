import React from 'react';
import { MapPinIcon, InfoIcon, DownloadIcon, PipeSystemIcon } from './icons';
import type { SubmittedJobData } from '../types';

interface BackOfficeDashboardProps {
  isSubmitted: boolean;
  data: SubmittedJobData[];
  onReset: () => void;
}

const MapMarker: React.FC<{ isSubmitted: boolean }> = ({ isSubmitted }) => (
  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full">
    <div className={`flex flex-col items-center transition-all duration-500 ${isSubmitted ? 'scale-110' : 'scale-100'}`}>
      <div className={`px-3 py-1 rounded-md text-sm font-semibold whitespace-nowrap mb-1 shadow-lg ${
        isSubmitted 
          ? 'bg-green-500 text-white' 
          : 'bg-locus-blue text-white'
      }`}>
        {isSubmitted ? 'Installed (Verified)' : 'Planned Valve'}
      </div>
      <MapPinIcon className={`w-10 h-10 drop-shadow-lg ${isSubmitted ? 'text-green-500' : 'text-locus-blue'}`} />
    </div>
  </div>
);

const BackOfficeDashboard: React.FC<BackOfficeDashboardProps> = ({ isSubmitted, data, onReset }) => {

  const handleDownload = () => {
    if (!data || data.length === 0) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Completed Jobs Report</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 2rem; background-color: #f7fafc; color: #161616; }
          h1 { color: #29308E; border-bottom: 2px solid #29308E; padding-bottom: 0.5rem; }
          .container { max-width: 800px; margin: 0 auto; }
          .job-card { background-color: #fff; border: 1px solid #e2e8f0; border-radius: 0.75rem; margin-bottom: 2rem; padding: 1.5rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
          .job-card h2 { margin-top: 0; font-size: 1.25rem; color: #D05D2C; }
          .job-card img { max-width: 100%; height: auto; border-radius: 0.5rem; margin-top: 1.5rem; border: 1px solid #e2e8f0; }
          .details { margin-top: 1rem; }
          .details p { margin: 0.5rem 0; font-size: 1rem; line-height: 1.5; }
          .details strong { display: inline-block; min-width: 150px; color: #4a5568; }
          .details code { background-color: #e2e8f0; padding: 0.2rem 0.4rem; border-radius: 0.25rem; font-family: SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace; font-size: 0.9em; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Completed Jobs Report</h1>
          ${[...data].reverse().map(job => `
            <div class="job-card">
              <h2>Work Order: ${job.workOrder}</h2>
              <div class="details">
                <p><strong>Task:</strong> ${job.task}</p>
                <p><strong>Material ID:</strong> <code>${job.materialId}</code></p>
                <p><strong>Planned Location:</strong> ${job.location}</p>
                <p><strong>GPS Coordinates:</strong> ${job.gpsCoords}</p>
              </div>
              <img src="${job.photoUrl}" alt="Installation photo for work order ${job.workOrder}">
            </div>
          `).join('')}
        </div>
      </body>
      </html>
    `;
  
    const blob = new Blob([htmlContent.trim()], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'completed-jobs-report.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const lastJob = data.length > 0 ? data[data.length - 1] : null;

  return (
    <div className="w-full max-w-2xl bg-white text-locus-text rounded-2xl shadow-xl border border-gray-200 p-6">
      <h2 className="text-xl font-bold text-locus-text border-b border-gray-200 pb-3 mb-4">GIS Manager Dashboard</h2>
      
      <div className="relative w-full aspect-video bg-gray-200 rounded-lg overflow-hidden mb-4 shadow-inner">
        {isSubmitted && lastJob ? (
            <div key={lastJob.workOrder} className="w-full h-full animate-fade-in">
                <img 
                  src={lastJob.photoUrl} 
                  alt={`Installation photo for work order ${lastJob.workOrder}`}
                  className="w-full h-full object-cover" 
                />
                <MapMarker isSubmitted={isSubmitted} />
            </div>
        ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 p-4">
                <PipeSystemIcon className="w-24 h-24 text-gray-300" />
                <p className="mt-4 text-gray-500 font-medium">Waiting for field data...</p>
            </div>
        )}
      </div>

      <div className={`transition-all duration-500 ease-in-out ${isSubmitted ? 'opacity-100 max-h-[1000px]' : 'opacity-0 max-h-0'} overflow-hidden`}>
        {isSubmitted && (
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200/80">
            <h3 className="font-bold text-green-700 flex items-center gap-2 text-lg">
              <InfoIcon className="w-6 h-6" />
              <span key={data.length} className="animate-fade-in">
                {data.length} Job{data.length > 1 ? 's' : ''} Completed & Verified
              </span>
            </h3>

            <div className="mt-4 space-y-3 max-h-48 overflow-y-auto pr-2">
              {[...data].reverse().map((job) => (
                <div key={job.workOrder} className="p-3 bg-white rounded-md border text-sm shadow-sm">
                  <p className="font-bold text-locus-blue">Work Order: {job.workOrder}</p>
                   <div className="mt-2 pl-4 border-l-2 border-gray-200 space-y-1">
                      <p className="text-gray-600"><strong>Task:</strong> {job.task}</p>
                      <p className="text-gray-600"><strong>Material ID:</strong> <span className="font-mono bg-gray-200 px-1 rounded text-xs">{job.materialId}</span></p>
                      <p className="text-gray-600"><strong>Location:</strong> {job.location}</p>
                   </div>
                </div>
              ))}
            </div>
            
             <div className="text-center mt-6 flex justify-center gap-4">
               <button 
                  onClick={onReset}
                  className="bg-locus-blue hover:opacity-90 text-white font-bold py-2 px-6 rounded-lg transition-all"
                >
                  Reset Demo
                </button>
                <button 
                  onClick={handleDownload}
                  className="bg-locus-orange hover:opacity-90 text-white font-bold py-2 px-6 rounded-lg transition-all flex items-center gap-2"
                >
                  <DownloadIcon className="w-5 h-5" />
                  Download Report
                </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BackOfficeDashboard;