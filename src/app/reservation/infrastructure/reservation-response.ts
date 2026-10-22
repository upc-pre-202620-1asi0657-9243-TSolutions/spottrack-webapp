export interface ReservationResource {
  id:          string;
  clientId:    number;
  equipmentId: string;
  status:      string;
  startedAt:   string;
  timerExpiry: string | null;
  startTime:   string;
  endTime:     string;
}

export interface ReservationRequestResource {
  id:          string;
  clientId:    number;
  equipmentId: string;
  status:      string;
  requestedAt: string;
}
