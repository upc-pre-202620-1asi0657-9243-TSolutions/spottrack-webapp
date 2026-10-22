import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BaseApi } from '../../shared/infrastructure/base-api';
import { MaintenanceTicket, TicketPriority, TicketType } from '../domain/model/maintenance-ticket.entity';
import { MaintenanceSchedule } from '../domain/model/maintenance-schedule.entity';
import { MaintenanceTicketApiEndpoint } from './maintenance-ticket-api-endpoint';
import { MaintenanceScheduleApiEndpoint } from './maintenance-schedule-api-endpoint';
import { MaintenanceTicketResource, MaintenanceLogResource } from './maintenance-response';
import { MaintenanceTicketAssembler } from './maintenance-ticket-assembler';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MaintenanceApi extends BaseApi {
  private readonly ticketEndpoint: MaintenanceTicketApiEndpoint;
  private readonly scheduleEndpoint: MaintenanceScheduleApiEndpoint;
  private readonly ticketAssembler   = new MaintenanceTicketAssembler();
  private readonly ticketsUrl        = `${environment.apiBase}/maintenance/tickets`;

  constructor(private readonly http: HttpClient) {
    super();
    this.ticketEndpoint = new MaintenanceTicketApiEndpoint(http);
    this.scheduleEndpoint = new MaintenanceScheduleApiEndpoint(http);
  }

  getTickets(): Observable<MaintenanceTicket[]> {
    return this.ticketEndpoint.getAll();
  }

  getSchedules(): Observable<MaintenanceSchedule[]> {
    return this.scheduleEndpoint.getAll();
  }
  getScheduleById(id: number): Observable<MaintenanceSchedule> {
    return this.scheduleEndpoint.getById(id);
  }
  createSchedule(schedule: MaintenanceSchedule): Observable<MaintenanceSchedule> {
    return this.scheduleEndpoint.create(schedule);
  }
  updateSchedule(schedule: MaintenanceSchedule): Observable<MaintenanceSchedule> {
    return this.scheduleEndpoint.update(schedule, schedule.id);
  }
  deleteSchedule(id: number): Observable<void> {
    return this.scheduleEndpoint.delete(id);
  }

  createMaintenanceRequest(equipmentId: string, requestedBy: string, description: string): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(`${environment.apiBase}/maintenance/requests`, {
      equipmentId,
      requestedBy,
      description,
    });
  }

  createTicket(maintenanceId: string, priority: TicketPriority, type: TicketType): Observable<MaintenanceTicket> {
    return this.http.post<MaintenanceTicketResource>(this.ticketsUrl, { maintenanceId, priority, type }).pipe(
      map(r => this.ticketAssembler.toEntityFromResource(r))
    );
  }

  assignTicket(ticketId: string, technicianId: string): Observable<MaintenanceTicket> {
    return this.http.patch<MaintenanceTicketResource>(
      `${this.ticketsUrl}/${ticketId}/assign/${technicianId}`, {}
    ).pipe(map(r => this.ticketAssembler.toEntityFromResource(r)));
  }

  modifyTicketStatus(ticketId: string, status: string): Observable<any> {
    return this.http.patch(
      `${this.ticketsUrl}/${ticketId}/status`, { status }
    );
  }

  completeTicket(ticketId: string): Observable<MaintenanceTicket> {
    return this.http.patch<MaintenanceTicketResource>(
      `${this.ticketsUrl}/${ticketId}/complete`, {}
    ).pipe(map(r => this.ticketAssembler.toEntityFromResource(r)));
  }

  registerCompletionLog(ticketId: string, maintenanceId: string, notes: string, cost: number): Observable<MaintenanceLogResource> {
    return this.http.post<MaintenanceLogResource>(
      `${this.ticketsUrl}/${ticketId}/completion-log`, { maintenanceId, notes, cost }
    );
  }

  getCompletionLogs(ticketId: string): Observable<MaintenanceLogResource[]> {
    return this.http.get<MaintenanceLogResource[]>(`${this.ticketsUrl}/${ticketId}/completion-log`);
  }
}
