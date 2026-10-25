import { Component, computed, effect, HostListener, inject, input, output, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MaintenanceStore } from '../../../application/maintenance.store';
import { EquipmentStore } from '../../../../gym/application/equipment.store';
import { TechnicianStore } from '../../../../settings/application/technician.store';
import { MaintenanceTicket, TicketPriority, TicketStatus, TicketType } from '../../../domain/model/maintenance-ticket.entity';
import { MaintenanceLogResource } from '../../../infrastructure/maintenance-response';
import { TicketChanges } from '../../../infrastructure/maintenance-api';

interface ActivityItem {
  icon:   string;
  tone:   'neutral' | 'accent' | 'success';
  key:    string;
  params: Record<string, string>;
  note?:  string;
  at:     string | null;
}

export const PRIORITY_ICONS: Record<TicketPriority, string> = {
  [TicketPriority.LOW]:    'south',
  [TicketPriority.MEDIUM]: 'drag_handle',
  [TicketPriority.HIGH]:   'north',
  [TicketPriority.URGENT]: 'priority_high',
};

export const TYPE_ICONS: Record<TicketType, string> = {
  [TicketType.CORRECTIVE]: 'build',
  [TicketType.PREVENTIVE]: 'event_repeat',
};

/**
 * Full-screen ticket view in the spirit of a task tracker: properties edit in
 * place and save immediately, the description edits inline, and an activity
 * column traces the ticket's life. Status moves only through the start and
 * complete control points, which the parent owns.
 */
@Component({
  selector: 'app-ticket-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslateModule, MatIconModule, MatMenuModule],
  templateUrl: './ticket-detail.html',
  styleUrl: './ticket-detail.scss',
})
export class TicketDetailComponent {
  readonly store           = inject(MaintenanceStore);
  readonly equipmentStore  = inject(EquipmentStore);
  readonly technicianStore = inject(TechnicianStore);

  readonly ticket  = input.required<MaintenanceTicket>();
  readonly hasPrev = input(false);
  readonly hasNext = input(false);
  /** True when a move to In progress was refused because nobody is assigned yet. */
  readonly needsTechnician = input(false);

  readonly closed            = output<void>();
  /** The parent applies the move rules (completion log, technician required). */
  readonly statusChange      = output<TicketStatus>();
  readonly prev              = output<void>();
  readonly next              = output<void>();

  readonly statuses   = [TicketStatus.OPEN, TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED];
  readonly priorities = Object.values(TicketPriority);
  readonly types      = Object.values(TicketType);

  readonly logs        = signal<MaintenanceLogResource[]>([]);
  readonly logsLoading = signal(false);

  readonly editingDescription = signal(false);
  readonly descriptionDraft   = signal('');
  readonly descriptionOpen    = signal(false);
  readonly justSaved          = signal(false);

  readonly saving    = this.store.ticketSaving;
  readonly saveError = this.store.ticketSaveError;

  readonly isResolved = computed(() => this.ticket().status === TicketStatus.RESOLVED);
  readonly equipment  = computed(() =>
    this.equipmentStore.equipment().find(e => e.uuid === this.ticket().equipmentId) ?? null
  );
  readonly code = computed(() => `T-${this.ticket().id.slice(0, 8)}`);

  /** The technician on the ticket, whether it's working on it or closed it. */
  readonly technicianId = computed(() => this.ticket().assignee || this.ticket().completedBy || '');

  readonly longDescription = computed(() => (this.ticket().description ?? '').length > 280);

  readonly activity = computed<ActivityItem[]>(() => {
    const t = this.ticket();
    const items: ActivityItem[] = [
      { icon: 'add_circle', tone: 'neutral', key: 'maintenance.detail.activity.created', params: {}, at: t.createdAt },
    ];
    if (this.technicianId()) {
      items.push({
        icon: 'person', tone: 'accent', key: 'maintenance.detail.activity.assigned',
        params: { name: this.technicianName(this.technicianId()) }, at: null,
      });
    }
    for (const log of this.logs()) {
      items.push({
        icon: 'task_alt', tone: 'success', key: 'maintenance.detail.activity.completed',
        params: {}, note: log.notes, at: log.completedAt,
      });
    }
    return items;
  });

  private loadedFor: string | null = null;
  private savedTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingSave = false;

  constructor() {
    // Reload the completion log whenever the panel switches to another ticket.
    effect(() => {
      const id = this.ticket().id;
      untracked(() => {
        if (id === this.loadedFor) return;
        this.loadedFor = id;
        this.editingDescription.set(false);
        this.descriptionOpen.set(false);
        this.store.clearTicketSaveError();
        this.loadLogs(id);
      });
    });

    // Flash "Saved" once an edit lands.
    effect(() => {
      const saving = this.saving();
      untracked(() => {
        if (saving || !this.pendingSave) return;
        this.pendingSave = false;
        if (this.saveError()) return;
        this.justSaved.set(true);
        if (this.savedTimer) clearTimeout(this.savedTimer);
        this.savedTimer = setTimeout(() => this.justSaved.set(false), 2000);
      });
    });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.editingDescription()) this.cancelDescription();
    else this.closed.emit();
  }

  technicianName(id: string): string {
    return this.technicianStore.technicians().find(t => t.id === id)?.name ?? id;
  }

  priorityIcon(p: TicketPriority): string { return PRIORITY_ICONS[p] ?? 'drag_handle'; }
  typeIcon(t: TicketType): string         { return TYPE_ICONS[t] ?? 'build'; }

  /** Inline colour: menu items render in an overlay outside this component's styles. */
  priorityColor(p: TicketPriority): string {
    return { LOW: 'var(--text-muted)', MEDIUM: 'var(--info)', HIGH: 'var(--warning)', URGENT: 'var(--danger)' }[p];
  }

  setPriority(priority: TicketPriority): void {
    if (priority !== this.ticket().priority) this.save({ priority });
  }

  setType(type: TicketType): void {
    if (type !== this.ticket().type) this.save({ type });
  }

  assign(technicianId: string): void {
    if (technicianId !== this.ticket().assignee) this.save({ technicianId });
  }

  moveTo(status: TicketStatus): void {
    if (status !== this.ticket().status) this.statusChange.emit(status);
  }

  editDescription(): void {
    if (this.isResolved()) return;
    this.descriptionDraft.set(this.ticket().description ?? '');
    this.editingDescription.set(true);
  }

  cancelDescription(): void { this.editingDescription.set(false); }

  saveDescription(): void {
    const description = this.descriptionDraft().trim();
    if (!description) return;
    if (description !== this.ticket().description) this.save({ description });
    this.editingDescription.set(false);
  }

  copyId(): void { navigator.clipboard.writeText(this.ticket().id); }

  private save(change: Partial<TicketChanges>): void {
    const t = this.ticket();
    this.pendingSave = true;
    this.store.updateTicket(t.id, {
      description: t.description,
      priority:    t.priority,
      type:        t.type,
      technicianId: null,
      ...change,
    });
  }

  private loadLogs(ticketId: string): void {
    this.logs.set([]);
    this.logsLoading.set(true);
    this.store.getCompletionLogs(ticketId).subscribe({
      next:  logs => { this.logs.set(logs); this.logsLoading.set(false); },
      error: () => this.logsLoading.set(false),
    });
  }
}
