export interface AlertResource {
  id:          number;
  equipmentId: string;
  severity:    'WARNING' | 'CRITICAL';
  message:     string;
  isResolved:  boolean;
  createdAt:   string;
}

export type AlertResponse = AlertResource[];
