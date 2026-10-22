export interface RegisterCameraSensorRequest {
  equipmentId: string;
}

export interface RegisterMotionSensorRequest {
  equipmentId: string;
}

export interface CaptureCameraMotionRequest {
  equipmentId: string;
  movementDetectedViaVideo: boolean;
}

export interface CaptureMotionSensorReadingRequest {
  equipmentId: string;
  movementDetectedViaSensor: boolean;
}

export interface ReportAnomalyRequest {
  reservationId: string;
  equipmentId: string;
  zoneId: string;
  anomalyDescription: string;
}
