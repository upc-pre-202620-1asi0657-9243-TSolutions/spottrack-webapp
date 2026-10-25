import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { MaintenanceStore } from '../../application/maintenance.store';
import { EquipmentStore } from '../../../gym/application/equipment.store';
import { TechnicianStore } from '../../../settings/application/technician.store';
import { MaintenanceTicket, TicketPriority, TicketStatus } from '../../domain/model/maintenance-ticket.entity';
import { MaintenanceLogResource } from '../../infrastructure/maintenance-response';
import { ContextMenuDirective } from '../../../shared/presentation/directives/context-menu.directive';
import { ContextMenuItem } from '../../../shared/application/context-menu.service';
import { PaginatorComponent, paginate } from '../../../shared/presentation/components/paginator/paginator';
import { TicketDetailComponent } from '../components/ticket-detail/ticket-detail';

type ModalMode = 'detail' | 'complete' | 'log' | null;
export type TicketView = 'board' | 'list';

const VIEW_STORAGE_KEY = 'spottrack.maintenance.view';

@Component({
  selector: 'app-maintenance',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslateModule, MatIconModule, MatFormFieldModule, MatSelectModule, ContextMenuDirective, PaginatorComponent, TicketDetailComponent, DragDropModule],
  templateUrl: './maintenance.html',
  styleUrl:    './maintenance.scss',
})
export class MaintenanceComponent {
  readonly store            = inject(MaintenanceStore);
  readonly equipmentStore   = inject(EquipmentStore);
  readonly technicianStore  = inject(TechnicianStore);

  readonly TicketStatus = TicketStatus;

  // ── Filters ─────────────────────────────────────────────────────────────
  readonly searchQuery    = signal('');
  readonly statusFilter   = signal<TicketStatus | ''>('');
  readonly priorityFilter = signal<TicketPriority | ''>('');

  readonly filteredTickets = computed(() => {
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

  /** Board columns; dragging a card into another column changes its status. */
  readonly columns = computed(() => [
    { status: TicketStatus.OPEN,        key: 'pending',    tone: 'red',   tickets: this.pendingFiltered() },
    { status: TicketStatus.IN_PROGRESS, key: 'inProgress', tone: 'amber', tickets: this.inProgressFiltered() },
    { status: TicketStatus.RESOLVED,    key: 'completed',  tone: 'green', tickets: this.resolvedFiltered() },
  ]);

  // ── Board / list view ───────────────────────────────────────────────────
  readonly view = signal<TicketView>(this.readStoredView());

  readonly listPage     = signal(0);
  readonly listPageSize = signal(10);

  /** Newest first, so fresh tickets lead the list. */
  readonly listTickets = computed(() =>
    [...this.filteredTickets()].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
  );

  readonly pagedList = computed(() => paginate(this.listTickets(), this.listPage(), this.listPageSize()));

  // ── Control-point modal (assign-to-start / completion-log-to-resolve) ─────
  readonly modalMode      = signal<ModalMode>(null);
  readonly modalTicket    = signal<MaintenanceTicket | null>(null);
  readonly notesInput     = signal('');
  readonly costInput      = signal<number | null>(null);
  readonly logEntries     = signal<MaintenanceLogResource[]>([]);
  readonly logLoading     = signal(false);

  readonly actionLoading = this.store.ticketActionLoading;
  readonly actionError   = this.store.ticketActionError;

  // A signal, not a plain field: the effect must re-run when a submit starts.
  // With a field, the first run returned before reading any signal, so the
  // effect tracked nothing and the modal never closed after Start/Complete.
  private readonly submitting = signal(false);

  constructor() {
    effect(() => {
      if (!this.submitting()) return;
      if (this.store.ticketActionLoading()) return;
      this.submitting.set(false);
      if (!this.store.ticketActionError()) this.closeModal();
    }, { allowSignalWrites: true });

    // A new search or filter starts the list on its first page.
    effect(() => {
      this.searchQuery();
      this.statusFilter();
      this.priorityFilter();
      this.listPage.set(0);
    }, { allowSignalWrites: true });
  }

  setView(view: TicketView): void {
    this.view.set(view);
    try { localStorage.setItem(VIEW_STORAGE_KEY, view); } catch { /* storage blocked: keep it for this visit */ }
  }

  private readStoredView(): TicketView {
    try { return localStorage.getItem(VIEW_STORAGE_KEY) === 'list' ? 'list' : 'board'; } catch { return 'board'; }
  }

  rowMenu(t: MaintenanceTicket): ContextMenuItem[] {
    if (t.status === TicketStatus.OPEN) return this.pendingMenu(t);
    if (t.status === TicketStatus.IN_PROGRESS) return this.inProgressMenu(t);
    return this.resolvedMenu(t);
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

  technicianName(id: string): string {
    return this.technicianStore.technicians().find(t => t.id === id)?.name ?? id;
  }

  equipmentOf(id: string) {
    return this.equipmentStore.equipment().find(e => e.uuid === id) ?? null;
  }

  /** Set when a move to In progress was refused for lack of a technician; the panel asks for one. */
  readonly needsTechnician = signal(false);

  readonly moveError = this.store.ticketMoveError;

  /**
   * One rule set for every way of moving a ticket (drag, menus, panel):
   * completing asks for the completion log, and work can only start once a
   * technician is on the ticket — otherwise its panel opens to pick one.
   */
  requestMove(t: MaintenanceTicket, status: TicketStatus): void {
    if (t.status === status || t.status === TicketStatus.RESOLVED) return;
    if (status === TicketStatus.RESOLVED) {
      this.openCompleteModal(t);
      return;
    }
    if (status === TicketStatus.IN_PROGRESS && !t.assignee) {
      this.openDetail(t);
      this.needsTechnician.set(true);
      return;
    }
    this.store.moveTicket(t, status);
  }

  onDrop(event: CdkDragDrop<TicketStatus, TicketStatus, MaintenanceTicket>): void {
    if (event.previousContainer === event.container) return;
    this.requestMove(event.item.data, event.container.data);
  }

  openDetail(t: MaintenanceTicket): void {
    this.needsTechnician.set(false);
    this.modalTicket.set(t);
    this.store.clearTicketActionError();
    this.modalMode.set('detail');
  }

  /** The open ticket as the store has it now, so in-place edits show up immediately. */
  readonly detailTicket = computed(() => {
    const id = this.modalTicket()?.id;
    return this.store.tickets().find(t => t.id === id) ?? this.modalTicket();
  });

  /** Position in the list order, for the panel's previous / next arrows. */
  readonly detailIndex = computed(() => this.listTickets().findIndex(t => t.id === this.modalTicket()?.id));

  stepDetail(delta: number): void {
    const target = this.listTickets()[this.detailIndex() + delta];
    if (target) this.modalTicket.set(target);
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

  isCostValid(): boolean {
    const cost = this.costInput();
    return cost !== null && cost >= 0;
  }

  confirmComplete(): void {
    const t = this.modalTicket();
    const notes = this.notesInput().trim();
    const cost = this.costInput();
    if (!t || !notes || cost === null || cost < 0) return;
    this.submitting.set(true);
    this.store.completeTicket(t.id, t.maintenanceId, notes, cost);
  }

  pendingMenu(t: MaintenanceTicket): ContextMenuItem[] {
    return [
      { label: 'View details',  icon: 'open_in_full', action: () => this.openDetail(t) },
      { label: 'Move to In progress', icon: 'play_arrow', action: () => this.requestMove(t, TicketStatus.IN_PROGRESS) },
      { label: '', icon: '', separator: true, action: () => {} },
      { label: 'View log',      icon: 'history',      action: () => this.openLogModal(t) },
      { label: 'Copy ticket ID', icon: 'content_copy', action: () => navigator.clipboard.writeText(this.ticketId(t)) },
    ];
  }

  inProgressMenu(t: MaintenanceTicket): ContextMenuItem[] {
    return [
      { label: 'View details',  icon: 'open_in_full', action: () => this.openDetail(t) },
      { label: 'Mark complete', icon: 'check_circle', action: () => this.openCompleteModal(t) },
      { label: 'Move back to Pending', icon: 'undo', action: () => this.requestMove(t, TicketStatus.OPEN) },
      { label: '', icon: '', separator: true, action: () => {} },
      { label: 'View log',      icon: 'history',      action: () => this.openLogModal(t) },
      { label: 'Copy ticket ID', icon: 'content_copy', action: () => navigator.clipboard.writeText(this.ticketId(t)) },
    ];
  }

  resolvedMenu(t: MaintenanceTicket): ContextMenuItem[] {
    return [
      { label: 'View details',  icon: 'open_in_full', action: () => this.openDetail(t) },
      { label: 'View log',      icon: 'history',      action: () => this.openLogModal(t) },
      { label: 'Copy ticket ID', icon: 'content_copy', action: () => navigator.clipboard.writeText(this.ticketId(t)) },
    ];
  }
}
