import { MaintenanceTicket, TicketStatus, TicketPriority, TicketType } from '../domain/model/maintenance-ticket.entity';
import { MaintenanceTicketResource } from './maintenance-response';

export class MaintenanceTicketAssembler {
  toEntityFromResource(r: MaintenanceTicketResource): MaintenanceTicket {
    const status = (r.ticketStatus as TicketStatus) || TicketStatus.OPEN;
    return new MaintenanceTicket({
      id:            r.id,
      maintenanceId: r.maintenanceId,
      equipmentId:   r.equipmentId,
      status,
      priority:      (r.priority as TicketPriority) || TicketPriority.MEDIUM,
      type:          (r.type as TicketType) || TicketType.CORRECTIVE,
      createdAt:     r.createdAt,
      description:   r.description,
      // A pending ticket can already have its technician; only resolved ones move it to completedBy.
      assignee:      status !== TicketStatus.RESOLVED ? (r.technicianId ?? '') : '',
      completedBy:   status === TicketStatus.RESOLVED ? (r.technicianId ?? '') : '',
    });
  }
}
