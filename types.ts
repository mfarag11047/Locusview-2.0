export interface WorkOrderData {
  workOrder: string;
  task: string;
  location: string;
}

export interface CapturedData {
  materialId: string;
  gpsCoords: string;
  photoUrl: string;
}

// Combine both for the final submitted data package
export interface SubmittedJobData extends WorkOrderData, CapturedData {}
