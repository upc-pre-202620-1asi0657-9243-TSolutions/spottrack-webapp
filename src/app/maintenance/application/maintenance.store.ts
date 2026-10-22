import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { switchMap } from 'rxjs/operators';
import { MaintenanceApi } from '../infrastructure/maintenance-api';
import { MaintenanceTicket, TicketStatus, TicketPriority, TicketType } from '../domain/model/maintenance-ticket.entity';
import { MaintenanceSchedule, TaskType, ScheduleStatus } from '../domain/model/maintenance-schedule.entity';
import { MaintenanceLogResource } from '../infrastructure/maintenance-response';

const PEAK_RANGES: [number, number][] = [[6, 9], [18, 21]];
export const OFF_PEAK_SUGGESTIONS     = ['10:00', '11:00', '14:00', '15:00'];

@Injectable({ providedIn: 'root' })
export class MaintenanceStore {
  private readonly api        = inject(MaintenanceApi);
  private readonly destroyRef = inject(DestroyRef);

  private readonly ticketsSignal   = signal<MaintenanceTicket[]>([]);
  private readonly schedulesSignal = signal<MaintenanceSchedule[]>([]);
  private readonly loadingSignal   = signal(false);
  private readonly errorSignal     = signal<string | null>(null);
  private readonly lastScheduledSignal = signal<MaintenanceSchedule | null>(null);

  private readonly ticketActionLoadingSignal = signal(false);
  private readonly ticketActionErrorSignal   = signal<string | null>(null);

  readonly tickets       = this.ticketsSignal.asReadonly();
  readonly schedules     = this.schedulesSignal.asReadonly();
  readonly loading       = this.loadingSignal.asReadonly();
  readonly error         = this.errorSignal.asReadonly();
  readonly lastScheduled = this.lastScheduledSignal.asReadonly();

  readonly ticketActionLoading = this.ticketActionLoadingSignal.asReadonly();
  readonly ticketActionError   = this.ticketActionErrorSignal.asReadonly();

  readonly pendingTickets    = computed(() => this.tickets().filter(t => t.status === TicketStatus.OPEN));
  readonly inProgressTickets = computed(() => this.tickets().filter(t => t.status === TicketStatus.IN_PROGRESS));
  readonly resolvedTickets   = computed(() => this.tickets().filter(t => t.status === TicketStatus.RESOLVED));
  readonly totalTickets      = computed(() => this.tickets().length);
  readonly scheduledCount    = computed(() => this.schedules().length);

  readonly suggestedTimes = OFF_PEAK_SUGGESTIONS;

  private static readonly POLL_INTERVAL_MS = 15000;

  constructor() {
    this.loadAll();
    setInterval(() => this.refreshTickets(), MaintenanceStore.POLL_INTERVAL_MS);
  }

  isPeakHour(time: string): boolean {
    if (!time) return false;
    const hours = parseInt(time.split(':')[0], 10);
    return PEAK_RANGES.some(([s, e]) => hours >= s && hours < e);
  }

  /** Assigns a technician to the ticket, which is the control point that moves it into IN_PROGRESS. */
  startTicket(ticketId: string, technicianId: string): void {
    this.ticketActionLoadingSignal.set(true);
    this.ticketActionErrorSignal.set(null);
    this.api.assignTicket(ticketId, technicianId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: updated => {
          this.replaceTicket(updated);
          this.ticketActionLoadingSignal.set(false);
        },
        error: err => {
          this.ticketActionErrorSignal.set(this.formatError(err, 'Failed to assign ticket'));
          this.ticketActionLoadingSignal.set(false);
        },
      });
  }

  /** Registers a completion log entry (accountability record) before resolving the ticket. */
  completeTicket(ticketId: string, maintenanceId: string, notes: string, cost: number): void {
    this.ticketActionLoadingSignal.set(true);
    this.ticketActionErrorSignal.set(null);
    this.api.registerCompletionLog(ticketId, maintenanceId, notes, cost)
      .pipe(
        switchMap(() => this.api.completeTicket(ticketId)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: updated => {
          this.replaceTicket(updated);
          this.ticketActionLoadingSignal.set(false);
        },
        error: err => {
          this.ticketActionErrorSignal.set(this.formatError(err, 'Failed to complete ticket'));
          this.ticketActionLoadingSignal.set(false);
        },
      });
  }

  getCompletionLogs(ticketId: string) {
    return this.api.getCompletionLogs(ticketId);
  }

  /** Ticket creation is a two-step backend flow: request maintenance for the equipment first, then open a ticket against the resulting maintenanceId. */
  createTicket(equipmentId: string, requestedBy: string, description: string, priority: TicketPriority, type: TicketType): void {
    this.ticketActionLoadingSignal.set(true);
    this.ticketActionErrorSignal.set(null);
    this.api.createMaintenanceRequest(equipmentId, requestedBy, description)
      .pipe(
        switchMap(({ id: maintenanceId }) => this.api.createTicket(maintenanceId, priority, type)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: created => {
          this.ticketsSignal.update(list => [created, ...list]);
          this.ticketActionLoadingSignal.set(false);
        },
        error: err => {
          this.ticketActionErrorSignal.set(this.formatError(err, 'Failed to create ticket'));
          this.ticketActionLoadingSignal.set(false);
        },
      });
  }

  scheduleBlock(equipmentId: number, date: string, time: string, taskType: TaskType, notes: string): void {
    const schedule = new MaintenanceSchedule({
      id: 0, equipmentId, scheduledDate: date, scheduledTime: time,
      taskType, notes, status: ScheduleStatus.CONFIRMED,
    });
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.lastScheduledSignal.set(null);
    this.api.createSchedule(schedule)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: created => {
          this.schedulesSignal.update(l => [created, ...l]);
          this.lastScheduledSignal.set(created);
          this.loadingSignal.set(false);
        },
        error: err => {
          this.errorSignal.set(this.formatError(err, 'Failed to schedule maintenance'));
          this.loadingSignal.set(false);
        },
      });
  }

  clearLastScheduled(): void { this.lastScheduledSignal.set(null); }
  clearTicketActionError(): void { this.ticketActionErrorSignal.set(null); }

  private formatError(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) return error.error?.message ?? error.message ?? fallback;
    if (error instanceof Error) return error.message || fallback;
    return fallback;
  }

  private replaceTicket(updated: MaintenanceTicket): void {
    this.ticketsSignal.update(list => list.map(t => t.id === updated.id ? updated : t));
  }

  private loadAll(): void {
    this.loadingSignal.set(true);
    this.api.getTickets().pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: l => this.ticketsSignal.set(l), error: () => {} });
    this.api.getSchedules().pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: l => { this.schedulesSignal.set(l); this.loadingSignal.set(false); }, error: () => this.loadingSignal.set(false) });
  }

  /** Silent background refresh — no loading/error signal churn, so ticket-driven stat cards update without flicker. */
  private refreshTickets(): void {
    this.api.getTickets().subscribe({
      next: l => this.ticketsSignal.set(l),
      error: () => {},
    });
  }
}
