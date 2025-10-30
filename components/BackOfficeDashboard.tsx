import React, { useState } from 'react';
import { MapPinIcon, InfoIcon, DownloadIcon, PipeSystemIcon, DocumentTextIcon } from './icons';
import type { SubmittedJobData, ChecklistItem, JobInspectionStatus, JobGisStatus, JobFinancialStatus } from '../types';

interface BackOfficeDashboardProps {
  isSubmitted: boolean;
  data: SubmittedJobData[];
  onReset: () => void;
  onUpdateStatus: (instanceId: string, statusType: 'inspection' | 'gis' | 'financial', newStatus: JobInspectionStatus | JobGisStatus | JobFinancialStatus) => void;
  onAttachReports: (reports: { instanceId: string; html: string }[]) => void;
}

const FinancialsModal: React.FC<{ job: SubmittedJobData; onClose: () => void }> = ({ job, onClose }) => {
    if (!job.financials) return null;

    const currencyFormatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    });

    return (
        <div 
            className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center gap-3 border-b border-gray-200 pb-3 mb-4">
                    <DocumentTextIcon className="w-8 h-8 text-locus-blue" />
                    <div>
                        <h2 className="text-xl font-bold text-locus-text">Financial Report</h2>
                        <p className="text-sm text-gray-500">Work Order: {job.workOrder.workOrderNumber}</p>
                    </div>
                </div>
                
                <div className="space-y-4 my-4">
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="font-semibold text-gray-600">Report ID:</span>
                        <span className="font-mono text-sm bg-gray-200 px-2 py-1 rounded">{job.financials.reportId}</span>
                    </div>
                    <div className="flex justify-between items-center p-3">
                        <span className="font-semibold text-gray-600">Labor Cost:</span>
                        <span className="font-medium text-lg">{currencyFormatter.format(job.financials.laborCost)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3">
                        <span className="font-semibold text-gray-600">Material Cost:</span>
                        <span className="font-medium text-lg">{currencyFormatter.format(job.financials.materialCost)}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-gray-100 rounded-lg border-t-2 border-locus-blue mt-2">
                        <span className="font-bold text-locus-blue text-lg">Total Cost:</span>
                        <span className="font-bold text-locus-blue text-xl">{currencyFormatter.format(job.financials.totalCost)}</span>
                    </div>
                </div>

                <div className="mt-6 text-right">
                    <button
                        onClick={onClose}
                        className="bg-locus-blue hover:opacity-90 text-white font-bold py-2 px-6 rounded-lg transition-all"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

const ReportModal: React.FC<{ job: SubmittedJobData; onClose: () => void }> = ({ job, onClose }) => {
    if (!job.reportHtml) return null;

    return (
        <div 
            className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="bg-white rounded-2xl shadow-xl w-full max-w-4xl h-[90vh] p-6 flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex-shrink-0 flex items-center justify-between gap-3 border-b border-gray-200 pb-3 mb-4">
                    <div className="flex items-center gap-3">
                        <DocumentTextIcon className="w-8 h-8 text-locus-blue" />
                        <div>
                            <h2 className="text-xl font-bold text-locus-text">Job Report</h2>
                            <p className="text-sm text-gray-500">Work Order: {job.workOrder.workOrderNumber}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="bg-locus-blue hover:opacity-90 text-white font-bold py-2 px-6 rounded-lg transition-all"
                    >
                        Close
                    </button>
                </div>
                
                <div className="flex-grow border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                    <iframe 
                        srcDoc={job.reportHtml}
                        title={`Report for ${job.workOrder.workOrderNumber}`}
                        className="w-full h-full border-0"
                        sandbox="allow-same-origin"
                    />
                </div>
            </div>
        </div>
    );
};

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

const BackOfficeDashboard: React.FC<BackOfficeDashboardProps> = ({ isSubmitted, data, onReset, onUpdateStatus, onAttachReports }) => {
  const [currentView, setCurrentView] = useState<'summary' | 'tableView'>('summary');
  const [filterStatus, setFilterStatus] = useState<JobInspectionStatus | 'All'>('All');
  const [viewingFinancials, setViewingFinancials] = useState<SubmittedJobData | null>(null);
  const [viewingReport, setViewingReport] = useState<SubmittedJobData | null>(null);

  const generateChecklistHTML = (checklist: ChecklistItem[]) => {
    if (!checklist || checklist.length === 0) return '<p>No checklist data available.</p>';
    return `
      <ul>
        ${checklist.map(item => `<li><strong>&#10003;</strong> ${item.prompt}</li>`).join('')}
      </ul>
    `;
  };

  const generateJobCardHtml = (job: SubmittedJobData): string => {
    return `
      <div class="job-card">
        <h2>Work Order: ${job.workOrder.workOrderNumber}</h2>
        <div class="details">
          <p><strong>Task:</strong> ${job.workOrder.task}</p>
          <p><strong>Material ID:</strong> <code>${job.materialId}</code></p>
          <p><strong>Material Verified:</strong> ${job.isMaterialVerified ? 'Yes' : 'No'}</p>
          <p><strong>Planned Location:</strong> ${job.workOrder.location}</p>
          <p><strong>GPS Coordinates:</strong> ${job.gpsCoords}</p>
          <p><strong>Inspection Status:</strong> ${job.inspectionStatus}</p>
          <p><strong>GIS Status:</strong> ${job.gisStatus}</p>
          <p><strong>Financial Status:</strong> ${job.financialStatus}</p>
        </div>
        <div class="checklist">
          <h3>Completed Safety Checklist</h3>
          ${generateChecklistHTML(job.completedChecklist)}
        </div>
        <img src="${job.photoUrl}" alt="Installation photo for work order ${job.workOrder.workOrderNumber}">
      </div>
    `;
  };

  const generateReportHtmlShell = (content: string, title: string): string => {
    const styles = `
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f7fafc; color: #161616; }
      .container { max-width: 800px; margin: 0 auto; padding: 2rem; }
      h1 { color: #29308E; border-bottom: 2px solid #29308E; padding-bottom: 0.5rem; }
      .job-card { background-color: #fff; border: 1px solid #e2e8f0; border-radius: 0.75rem; margin-bottom: 2rem; padding: 1.5rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
      .job-card h2 { margin-top: 0; font-size: 1.25rem; color: #D05D2C; }
      .job-card h3 { font-size: 1.1rem; color: #29308E; margin-top: 1.5rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.25rem; }
      .job-card img { max-width: 100%; height: auto; border-radius: 0.5rem; margin-top: 1.5rem; border: 1px solid #e2e8f0; }
      .details { margin-top: 1rem; }
      .details p { margin: 0.5rem 0; font-size: 1rem; line-height: 1.5; }
      .details strong { display: inline-block; min-width: 150px; color: #4a5568; }
      .details code { background-color: #e2e8f0; padding: 0.2rem 0.4rem; border-radius: 0.25rem; font-family: SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace; font-size: 0.9em; }
      .checklist ul { list-style: none; padding-left: 0; }
      .checklist li { margin-bottom: 0.5rem; }
    `;
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>${styles}</style>
      </head>
      <body>
        <div class="container">
          ${content}
        </div>
      </body>
      </html>
    `;
  };

  const handleDownload = () => {
    if (!data || data.length === 0) return;

    const reportsToAttach: { instanceId: string; html: string }[] = [];
    const allJobCardsHtml = [...data].reverse().map(job => {
      const cardHtml = generateJobCardHtml(job);
      const singleReportFullHtml = generateReportHtmlShell(cardHtml, `Job Report: ${job.workOrder.workOrderNumber}`);
      reportsToAttach.push({ instanceId: job.instanceId, html: singleReportFullHtml });
      return cardHtml;
    }).join('');

    onAttachReports(reportsToAttach);

    const fullDownloadHtml = generateReportHtmlShell(`<h1>Completed Jobs Report</h1>${allJobCardsHtml}`, 'Completed Jobs Report');
  
    const blob = new Blob([fullDownloadHtml.trim()], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    let downloadFilename = 'completed-jobs-report.html';
    if (data.length === 1) {
      // If there's only one job, use its work order number for the filename.
      downloadFilename = `report_${data[0].workOrder.workOrderNumber}.html`;
    } else if (data.length > 1) {
      // If there are multiple jobs, create a summary filename.
      downloadFilename = `summary_report_for_${data.length}_jobs.html`;
    }
    
    // Sanitize filename by replacing spaces or slashes with underscores
    a.download = downloadFilename.replace(/[\s/]/g, '_');
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const inspectionStatusStyles = {
    Pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
    Approved: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
    Rejected: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
  };

  const gisStatusStyles = {
    Pending: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300' },
    Posted: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
  }

  const financialStatusStyles = {
    Pending: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300' },
    Generated: { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-300' },
  }

  const lastJob = data.length > 0 ? data[data.length - 1] : null;
  const filteredData = data.filter(job => filterStatus === 'All' || job.inspectionStatus === filterStatus).sort((a,b) => new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime());

  const StatusBadge = ({ status, styles }: { status: string, styles: { [key: string]: { bg: string, text: string, border: string } } }) => (
    <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${styles[status].bg} ${styles[status].text} ${styles[status].border}`}>
      {status}
    </span>
  );

  return (
    <div className="w-full max-w-4xl bg-white text-locus-text rounded-2xl shadow-xl border border-gray-200 p-6">
      {viewingFinancials && <FinancialsModal job={viewingFinancials} onClose={() => setViewingFinancials(null)} />}
      {viewingReport && <ReportModal job={viewingReport} onClose={() => setViewingReport(null)} />}
      <header className="flex justify-between items-center border-b border-gray-200 pb-3 mb-4">
        <h2 className="text-xl font-bold text-locus-text">GIS Manager Dashboard</h2>
        <div className="flex bg-gray-100 rounded-lg p-1 text-sm">
          <button onClick={() => setCurrentView('summary')} className={`px-3 py-1 rounded-md font-semibold transition-colors ${currentView === 'summary' ? 'bg-white shadow text-locus-blue' : 'text-gray-600 hover:bg-gray-200'}`}>
            Summary
          </button>
          <button onClick={() => setCurrentView('tableView')} disabled={!isSubmitted} className={`px-3 py-1 rounded-md font-semibold transition-colors ${currentView === 'tableView' ? 'bg-white shadow text-locus-blue' : 'text-gray-600'} ${!isSubmitted ? 'text-gray-400 cursor-not-allowed' : 'hover:bg-gray-200'}`}>
            Job Management
          </button>
        </div>
      </header>

      {currentView === 'summary' && (
        <>
          <div className="relative w-full aspect-video bg-gray-200 rounded-lg overflow-hidden mb-4 shadow-inner">
            {isSubmitted && lastJob ? (
                <div key={lastJob.instanceId} className="w-full h-full animate-fade-in">
                    <img 
                      src={lastJob.photoUrl} 
                      alt={`Installation photo for work order ${lastJob.workOrder.workOrderNumber}`}
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
                    {data.length} Job{data.length > 1 ? 's' : ''} Submitted for Review
                  </span>
                </h3>

                <div className="mt-4 space-y-3 max-h-48 overflow-y-auto pr-2">
                  {[...data].reverse().map((job) => (
                    <div key={job.instanceId} className="p-3 bg-white rounded-md border text-sm shadow-sm">
                      <div className="flex justify-between items-start">
                        <p className="font-bold text-locus-blue">Work Order: {job.workOrder.workOrderNumber}</p>
                         <StatusBadge status={job.inspectionStatus} styles={inspectionStatusStyles} />
                      </div>
                       <div className="mt-2 pl-4 border-l-2 border-gray-200 space-y-1">
                          <p className="text-gray-600"><strong>Task:</strong> {job.workOrder.task}</p>
                          <p className="text-gray-600"><strong>Material ID:</strong> <span className="font-mono bg-gray-200 px-1 rounded text-xs">{job.materialId}</span></p>
                          <p className="text-gray-600"><strong>Location:</strong> {job.workOrder.location}</p>
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
        </>
      )}

      {currentView === 'tableView' && isSubmitted && (
        <div className="animate-fade-in">
          <div className="flex justify-end items-center gap-2 mb-4">
            <span className="text-sm font-semibold text-gray-600">Filter by status:</span>
            {(['All', 'Pending', 'Approved', 'Rejected'] as const).map(status => (
              <button 
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors ${filterStatus === status ? 'bg-locus-blue text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                {status}
              </button>
            ))}
          </div>
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-xs text-gray-700 uppercase tracking-wider">
                <tr>
                  <th scope="col" className="px-4 py-3">Work Order #</th>
                  <th scope="col" className="px-4 py-3">Task</th>
                  <th scope="col" className="px-4 py-3">Submission Date</th>
                  <th scope="col" className="px-4 py-3">Inspection</th>
                  <th scope="col" className="px-4 py-3">GIS</th>
                  <th scope="col" className="px-4 py-3">Financials</th>
                  <th scope="col" className="px-4 py-3">Report</th>
                  <th scope="col" className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map(job => (
                  <tr key={job.instanceId} className="bg-white border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{job.workOrder.workOrderNumber}</td>
                    <td className="px-4 py-3">{job.workOrder.task}</td>
                    <td className="px-4 py-3">{new Date(job.submissionDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3"><StatusBadge status={job.inspectionStatus} styles={inspectionStatusStyles} /></td>
                    <td className="px-4 py-3"><StatusBadge status={job.gisStatus} styles={gisStatusStyles} /></td>
                    <td className="px-4 py-3">
                      {job.financialStatus === 'Generated' && job.financials ? (
                         <button 
                            onClick={() => setViewingFinancials(job)}
                            className="text-xs bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-1 px-2 rounded"
                         >
                            View Report
                         </button>
                      ) : (
                         <StatusBadge status={job.financialStatus} styles={financialStatusStyles} />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {job.reportHtml ? (
                         <button 
                            onClick={() => setViewingReport(job)}
                            className="text-xs bg-gray-500 hover:bg-gray-600 text-white font-bold py-1 px-2 rounded"
                         >
                            View Report
                         </button>
                      ) : (
                         <span className="px-2 py-1 text-xs font-semibold rounded-full border bg-gray-100 text-gray-500 border-gray-300">
                            N/A
                         </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {job.inspectionStatus === 'Pending' && (
                          <>
                            <button onClick={() => onUpdateStatus(job.instanceId, 'inspection', 'Approved')} className="text-xs bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-2 rounded">Approve</button>
                            <button onClick={() => onUpdateStatus(job.instanceId, 'inspection', 'Rejected')} className="text-xs bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-2 rounded">Reject</button>
                          </>
                        )}
                        {job.inspectionStatus === 'Approved' && job.gisStatus === 'Pending' && (
                            <button onClick={() => onUpdateStatus(job.instanceId, 'gis', 'Posted')} className="text-xs bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-2 rounded">Post to GIS</button>
                        )}
                        {job.inspectionStatus === 'Approved' && job.financialStatus === 'Pending' && (
                            <button onClick={() => onUpdateStatus(job.instanceId, 'financial', 'Generated')} className="text-xs bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-1 px-2 rounded">Gen. Financials</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
             {filteredData.length === 0 && (
                <div className="text-center p-8 text-gray-500">
                    No jobs match the current filter.
                </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BackOfficeDashboard;