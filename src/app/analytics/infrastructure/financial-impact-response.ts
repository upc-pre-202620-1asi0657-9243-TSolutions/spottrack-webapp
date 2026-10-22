export type { ActivityReportResource, ActivityReportResponse, EquipmentResource, EquipmentResponse } from './analytics-response';

export interface MaintenanceTicketResource {
  id:                string;
  maintenanceId:     string;
  equipmentId:        string;
  technicianId:       string | null;
  description:        string;
  priority:           string;
  type:               'CORRECTIVE' | 'PREVENTIVE';
  ticketStatus:       string;
  maintenanceStatus:  string;
  createdAt:          string;
}

export type MaintenanceTicketResponse = MaintenanceTicketResource[];

export interface MaintenanceLogResource {
  id:            string;
  ticketId:      string;
  maintenanceId: string;
  notes:         string;
  cost:          number;
  completedAt:   string;
}

export type MaintenanceLogResponse = MaintenanceLogResource[];

/**
 * Shape returned by GET /maintenance-quotes (analytics bounded context).
 * sparePartsCost is what backs financial-impact's "inventory" cost breakdown
 * — spare parts are a cost line item on a maintenance quote, not a separate
 * gym-level inventory concept.
 */
export interface MaintenanceQuoteResource {
  id:                     number;
  maintenanceQuoteId:     number;
  equipmentId:            string | null;
  correctiveActionsCost:  number;
  sparePartsCost:         number;
  preventiveCost:         number;
  totalMaintenanceCost:   number;
}

export type MaintenanceQuoteResponse = MaintenanceQuoteResource[];
