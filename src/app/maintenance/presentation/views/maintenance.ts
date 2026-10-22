import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MaintenanceStore } from '../../application/maintenance.store';
import { EquipmentStore } from '../../../gym/application/equipment.store';
import { TechnicianStore } from '../../../settings/application/technician.store';
import { MaintenanceTicket, TicketPriority, TicketStatus } from '../../domain/model/maintenance-ticket.entity';
import { MaintenanceLogResource } from '../../infrastructure/maintenance-response';
import { ContextMenuDirective } from '../../../shared/presentation/directives/context-menu.directive';
import { ContextMenuItem } from '../../../shared/application/context-menu.service';

type ModalMode = 'start' | 'complete' | 'log' | null;

@Component({
  selector: 'app-maintenance',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslateModule, MatIconModule, MatFormFieldModule, MatSelectModule, ContextMenuDirective],
  templateUrl: './maintenance.html',
  styleUrl:    './maintenance.scss',
})
export class MaintenanceComponent {
  readonly store            = inject(MaintenanceStore);
  readonly equipmentStore   = inject(EquipmentStore);
  readonly technicianStore  = inject(TechnicianStore);

  // ── Filters ─────────────────────────────────────────────────────────────
  readonly searchQuery    = signal('');
  readonly statusFilter   = signal<TicketStatus | ''>('');
  readonly priorityFilter = signal<TicketPriority | ''>('');

  private filteredTickets = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const s = this.statusFilter();
    const p = this.priorityFilter();
    return this.store.tickets().filter(t => {
      const name = this.equipmentName(t.equipmentId).toLowerCase();
      const matchQ = !q || name.includes(q) || t.description.toLowerCase().includes(q) || this.ticketId(t).toLowerCase().includes(q);
      const matchS = !s || t.status === s;
      const matchP = !p || t.priority === p;
      return matchQ && matchS && matchP;
    });
  });

  readonly pendingFiltered    = computed(() => this.filteredTickets().filter(t => t.status === TicketStatus.OPEN));
  readonly inProgressFiltered = computed(() => this.filteredTickets().filter(t => t.status === TicketStatus.IN_PROGRESS));
  readonly resolvedFiltered   = computed(() => this.filteredTickets().filter(t => t.status === TicketStatus.RESOLVED));

  // ── Control-point modal (assign-to-start / completion-log-to-resolve) ─────
  readonly modalMode      = signal<ModalMode>(null);
  readonly modalTicket    = signal<MaintenanceTicket | null>(null);
  readonly technicianInput = signal('');
  readonly notesInput     = signal('');
  readonly costInput      = signal<number | null>(null);
  readonly logEntries     = signal<MaintenanceLogResource[]>([]);
  readonly logLoading     = signal(false);

  readonly actionLoading = this.store.ticketActionLoading;
  readonly actionError   = this.store.ticketActionError;

  private submitting = false;

  constructor() {
    effect(() => {
      if (!this.submitting) return;
      if (this.store.ticketActionLoading()) return;
      this.submitting = false;
      if (!this.store.ticketActionError()) this.closeModal();
    });
  }

  ticketId(t: MaintenanceTicket): string {
    return `T-${t.id.slice(0, 8)}`;
  }

  ticketAge(t: MaintenanceTicket): string {
    const diff = Date.now() - new Date(t.createdAt).getTime();
    const h    = Math.floor(diff / 3600000);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  }

  equipmentName(id: string): string {
    return this.equipmentStore.equipment().find(e => e.uuid === id)?.name ?? id;
  }

  openStartModal(t: MaintenanceTicket): void {
    this.modalTicket.set(t);
    this.technicianInput.set('');
    this.store.clearTicketActionError();
    this.modalMode.set('start');
  }

  openCompleteModal(t: MaintenanceTicket): void {
    this.modalTicket.set(t);
    this.notesInput.set('');
    this.costInput.set(null);
    this.store.clearTicketActionError();
    this.modalMode.set('complete');
  }

  openLogModal(t: MaintenanceTicket): void {
    this.modalTicket.set(t);
    this.logEntries.set([]);
    this.logLoading.set(true);
    this.modalMode.set('log');
    this.store.getCompletionLogs(t.id).subscribe({
      next:  logs => { this.logEntries.set(logs); this.logLoading.set(false); },
      error: () => this.logLoading.set(false),
    });
  }

  closeModal(): void {
    this.modalMode.set(null);
    this.modalTicket.set(null);
  }

  confirmStart(): void {
    const t = this.modalTicket();
    const technicianId = this.technicianInput().trim();
    if (!t || !technicianId) return;
    this.submitting = true;
    this.store.startTicket(t.id, technicianId);
  }

  isCostValid(): boolean {
    const cost = this.costInput();
    return cost !== null && cost >= 0;
  }

  confirmComplete(): void {
    const t = this.modalTicket();
    const notes = this.notesInput().trim();
    const cost = this.costInput();
    if (!t || !notes || cost === null || cost < 0) return;
    this.submitting = true;
    this.store.completeTicket(t.id, t.maintenanceId, notes, cost);
  }

  pendingMenu(t: MaintenanceTicket): ContextMenuItem[] {
    return [
      { label: 'Start ticket',  icon: 'play_arrow',   action: () => this.openStartModal(t) },
      { label: '', icon: '', separator: true, action: () => {} },
      { label: 'View log',      icon: 'history',      action: () => this.openLogModal(t) },
      { label: 'Copy ticket ID', icon: 'content_copy', action: () => navigator.clipboard.writeText(this.ticketId(t)) },
    ];
  }

  inProgressMenu(t: MaintenanceTicket): ContextMenuItem[] {
    return [
      { label: 'Mark complete', icon: 'check_circle', action: () => this.openCompleteModal(t) },
      { label: '', icon: '', separator: true, action: () => {} },
      { label: 'View log',      icon: 'history',      action: () => this.openLogModal(t) },
      { label: 'Copy ticket ID', icon: 'content_copy', action: () => navigator.clipboard.writeText(this.ticketId(t)) },
    ];
  }

  resolvedMenu(t: MaintenanceTicket): ContextMenuItem[] {
    return [
      { label: 'View log',      icon: 'history',      action: () => this.openLogModal(t) },
      { label: 'Copy ticket ID', icon: 'content_copy', action: () => navigator.clipboard.writeText(this.ticketId(t)) },
    ];
  }
}
