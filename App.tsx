import React, { useState } from 'react';
import FieldCrewApp from './components/FieldCrewApp';
import BackOfficeDashboard from './components/BackOfficeDashboard';
import type { SubmittedJobData, JobInspectionStatus, JobGisStatus, JobFinancialStatus, FinancialData } from './types';

// This is what the field app will submit
export type FieldSubmissionData = Omit<SubmittedJobData, 'instanceId' | 'submissionDate' | 'inspectionStatus' | 'gisStatus' | 'financialStatus' | 'financials' | 'reportHtml'>;

function App() {
  const [submittedData, setSubmittedData] = useState<SubmittedJobData[]>([]);

  const handleJobSubmit = (data: FieldSubmissionData) => {
    const newJob: SubmittedJobData = {
      ...data,
      instanceId: `job-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      submissionDate: new Date().toISOString(),
      inspectionStatus: 'Pending',
      gisStatus: 'Pending',
      financialStatus: 'Pending',
    };
    setSubmittedData(prevData => [...prevData, newJob]);
  };
  
  const handleUpdateJobStatus = (
    instanceId: string, 
    statusType: 'inspection' | 'gis' | 'financial', 
    newStatus: JobInspectionStatus | JobGisStatus | JobFinancialStatus
  ) => {
    setSubmittedData(prevData =>
      prevData.map(job => {
        if (job.instanceId === instanceId) {
          const updatedJob = { ...job };
          switch (statusType) {
            case 'inspection':
              updatedJob.inspectionStatus = newStatus as JobInspectionStatus;
              break;
            case 'gis':
              updatedJob.gisStatus = newStatus as JobGisStatus;
              break;
            case 'financial':
              updatedJob.financialStatus = newStatus as JobFinancialStatus;
              // If we are generating financials, create some mock data
              if (newStatus === 'Generated') {
                const laborCost = Math.floor(Math.random() * (2000 - 500 + 1)) + 500;
                const materialCost = Math.floor(Math.random() * (5000 - 1000 + 1)) + 1000;
                const generatedFinancials: FinancialData = {
                  reportId: `FIN-${job.workOrder.workOrderNumber}-${Date.now().toString().slice(-6)}`,
                  laborCost,
                  materialCost,
                  totalCost: laborCost + materialCost,
                };
                updatedJob.financials = generatedFinancials;
              }
              break;
          }
          return updatedJob;
        }
        return job;
      })
    );
  };

  const handleAttachReports = (reports: { instanceId: string; html: string }[]) => {
    setSubmittedData(prevData =>
      prevData.map(job => {
        const reportForJob = reports.find(r => r.instanceId === job.instanceId);
        if (reportForJob) {
          return { ...job, reportHtml: reportForJob.html };
        }
        return job;
      })
    );
  };

  const resetDemo = () => {
    setSubmittedData([]);
  }

  const hasSubmittedJobs = submittedData.length > 0;

  return (
    <main className="bg-gray-100 min-h-screen text-locus-text p-4 sm:p-6 md:p-8 flex flex-col items-center justify-center font-sans">
      <div className="w-full max-w-7xl">
        <header className="text-center mb-12">
          <div className="flex justify-center items-center gap-3 mb-4">
              <svg width="40" height="40" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-locus-orange">
                <path d="M24 4C12.96 4 4 12.96 4 24C4 35.04 12.96 44 24 44C35.04 44 44 35.04 44 24C44 12.96 35.04 4 24 4ZM24 20C21.78 20 20 21.78 20 24C20 26.22 21.78 28 24 28C26.22 28 28 26.22 28 24C28 21.78 26.22 20 24 20Z" fill="currentColor"/>
              </svg>
              <h1 className="text-3xl md:text-4xl font-bold text-locus-blue tracking-tight">
                Locusview 2.0
              </h1>
          </div>
          <p className="text-gray-600 mt-2 text-md">Connecting the Field to the Office, Instantly.</p>
        </header>

        <div className="flex flex-col lg:flex-row gap-8 w-full">
          <div className="lg:w-1/3 flex justify-center lg:justify-end">
            <FieldCrewApp onSubmit={handleJobSubmit} />
          </div>
          <div className="lg:w-2/3 flex justify-center lg:justify-start">
            <BackOfficeDashboard 
              isSubmitted={hasSubmittedJobs} 
              data={submittedData} 
              onReset={resetDemo} 
              onUpdateStatus={handleUpdateJobStatus} 
              onAttachReports={handleAttachReports}
            />
          </div>
        </div>
      </div>
    </main>
  );
}

export default App;
