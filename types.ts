export interface BillOfMaterialItem {
  itemId: string;
  description: string;
  quantity: number;
}

export interface ChecklistItem {
  id: string;
  prompt: string;
  completed: boolean;
}

export interface WorkOrderPacket {
  id:string;
  workOrderNumber: string;
  task: string;
  location: string;
  billOfMaterials: BillOfMaterialItem[];
  safetyChecklist: ChecklistItem[];
}

export interface CapturedData {
  materialId: string;
  gpsCoords: string;
  photoUrl: string;
  isMaterialVerified: boolean;
}

export type JobInspectionStatus = 'Pending' | 'Approved' | 'Rejected';
export type JobGisStatus = 'Pending' | 'Posted';
export type JobFinancialStatus = 'Pending' | 'Generated';

export interface FinancialData {
  reportId: string;
  laborCost: number;
  materialCost: number;
  totalCost: number;
}

// Combine both for the final submitted data package
export interface SubmittedJobData extends CapturedData {
  instanceId: string;
  submissionDate: string;
  workOrder: WorkOrderPacket;
  completedChecklist: ChecklistItem[];
  inspectionStatus: JobInspectionStatus;
  gisStatus: JobGisStatus;
  financialStatus: JobFinancialStatus;
  financials?: FinancialData;
  reportHtml?: string;
}
