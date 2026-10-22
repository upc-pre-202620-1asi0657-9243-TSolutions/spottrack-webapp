import { BaseResource } from '../../shared/infrastructure/base-response';

export interface MaintenanceTicketResource {
  id:                 string;
  maintenanceId:      string;
  equipmentId:        string;
  technicianId:       string | null;
  description:        string;
  priority:           string;
  type:               string;
  ticketStatus:        string;
  maintenanceStatus:  string;
  createdAt:          string;
}

export type MaintenanceTicketResponse = MaintenanceTicketResource[];

export interface MaintenanceLogResource {
  id:            string;
  ticketId:      string;
  maintenanceId: string;
  notes:         string;
  completedAt:   string;
}

export interface MaintenanceScheduleResource extends BaseResource {
  id:             number;
  equipment_id:   number;
  scheduled_date: string;
  scheduled_time: string;
  task_type:      string;
  notes:          string;
  status:         string;
}

export type MaintenanceScheduleResponse = MaintenanceScheduleResource[];
