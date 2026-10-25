import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { TechnicianStore } from '../../../../settings/application/technician.store';
import { MaintenanceStore } from '../../../application/maintenance.store';
import { EquipmentStore } from '../../../../gym/application/equipment.store';
import { MaintenanceTicket, TicketStatus } from '../../../domain/model/maintenance-ticket.entity';
import { PaginatorComponent, paginate } from '../../../../shared/presentation/components/paginator/paginator';

export type WorkloadFilter = 'all' | 'available' | 'assigned' | 'busy';
export type TechnicianSort = 'name' | 'workload' | 'completed';

/** A technician plus the workload derived from the ticket board. */
interface TechnicianRow {
  id:         string;
  name:       string;
  initials:   string;
  hue:        number;
  pending:    MaintenanceTicket[];
  inProgress: MaintenanceTicket[];
  completed:  number;
  state:      Exclude<WorkloadFilter, 'all'>;
}

@Component({
  selector: 'app-technicians',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslateModule, MatIconModule, PaginatorComponent],
  templateUrl: './technicians.html',
  styleUrl: './technicians.scss',
})
export class TechniciansComponent {
  readonly technicianStore = inject(TechnicianStore);
  readonly maintenanceStore = inject(MaintenanceStore);
  readonly equipmentStore   = inject(EquipmentStore);

  readonly filters: WorkloadFilter[] = ['all', 'available', 'assigned', 'busy'];
  readonly sorts: TechnicianSort[]   = ['name', 'workload', 'completed'];

  readonly search = signal('');
  readonly filter = signal<WorkloadFilter>('all');
  readonly sort   = signal<TechnicianSort>('name');

  readonly page     = signal(0);
  readonly pageSize = signal(12);

  // ── Add technician dialog ─────────────────────────────────────────────────
  readonly showAdd   = signal(false);
  readonly nameInput = signal('');
  readonly nameError = signal<string | null>(null);
  private pendingCreate = false;

  readonly rows = computed<TechnicianRow[]>(() => {
    const tickets = this.maintenanceStore.tickets();
    return this.technicianStore.technicians().map(t => {
      const pending    = tickets.filter(k => k.assignee === t.id && k.status === TicketStatus.OPEN);
      const inProgress = tickets.filter(k => k.assignee === t.id && k.status === TicketStatus.IN_PROGRESS);
      const completed  = tickets.filter(k => k.completedBy === t.id && k.status === TicketStatus.RESOLVED).length;
      return {
        id: t.id,
        name: t.name,
        initials: this.initials(t.name),
        hue: this.hue(t.id),
        pending,
        inProgress,
        completed,
        state: inProgress.length ? 'busy' : pending.length ? 'assigned' : 'available',
      };
    });
  });

  readonly counts = computed<Record<WorkloadFilter, number>>(() => {
    const rows = this.rows();
    return {
      all:       rows.length,
      available: rows.filter(r => r.state === 'available').length,
      assigned:  rows.filter(r => r.state === 'assigned').length,
      busy:      rows.filter(r => r.state === 'busy').length,
    };
  });

  /** Open tickets nobody has picked up, so the page nudges toward assigning them. */
  readonly unassignedTickets = computed(() =>
    this.maintenanceStore.tickets().filter(t => t.status !== TicketStatus.RESOLVED && !t.assignee).length
  );

  readonly totalCompleted = computed(() => this.rows().reduce((sum, r) => sum + r.completed, 0));

  readonly visibleRows = computed(() => {
    const q = this.search().trim().toLowerCase();
    const f = this.filter();
    const rows = this.rows().filter(r =>
      (f === 'all' || r.state === f) &&
      (!q || r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q))
    );
    const workload = (r: TechnicianRow) => r.inProgress.length * 2 + r.pending.length;
    switch (this.sort()) {
      case 'workload':  return rows.sort((a, b) => workload(b) - workload(a) || a.name.localeCompare(b.name));
      case 'completed': return rows.sort((a, b) => b.completed - a.completed || a.name.localeCompare(b.name));
      default:          return rows.sort((a, b) => a.name.localeCompare(b.name));
    }
  });

  readonly pagedRows = computed(() => paginate(this.visibleRows(), this.page(), this.pageSize()));

  constructor() {
    // A new search, filter or sort starts on the first page.
    effect(() => {
      this.search();
      this.filter();
      this.sort();
      this.page.set(0);
    }, { allowSignalWrites: true });

    // The store has no success signal: a create that settles without an error landed.
    effect(() => {
      const creating = this.technicianStore.creating();
      if (this.pendingCreate && !creating) {
        this.pendingCreate = false;
        if (!this.technicianStore.error()) this.closeAdd();
      }
    }, { allowSignalWrites: true });
  }

  equipmentName(id: string): string {
    return this.equipmentStore.equipment().find(e => e.uuid === id)?.name ?? id;
  }

  openAdd(): void {
    this.nameInput.set('');
    this.nameError.set(null);
    this.showAdd.set(true);
  }

  closeAdd(): void { this.showAdd.set(false); }

  addTechnician(): void {
    const name = this.nameInput().trim();
    if (!name) {
      this.nameError.set('settings.technicians.error.nameRequired');
      return;
    }
    if (this.technicianStore.technicians().some(t => t.name.toLowerCase() === name.toLowerCase())) {
      this.nameError.set('technicians.add.duplicate');
      return;
    }
    this.pendingCreate = true;
    this.technicianStore.createTechnician(name);
  }

  copyId(id: string): void { navigator.clipboard.writeText(id); }

  private initials(name: string): string {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '?';
  }

  /** Stable avatar colour per technician. */
  private hue(id: string): number {
    let h = 0;
    for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 360;
    return h;
  }
}
