import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { TranslateModule } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { TechnicianStore } from '../../../../settings/application/technician.store';
import { MaintenanceStore } from '../../../application/maintenance.store';
import { EquipmentStore } from '../../../../gym/application/equipment.store';
import { MaintenanceTicket, TicketPriority, TicketStatus } from '../../../domain/model/maintenance-ticket.entity';
import { PaginatorComponent, paginate } from '../../../../shared/presentation/components/paginator/paginator';

export type TicketTab = 'active' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'all';
export type TicketSort = 'newest' | 'oldest' | 'priority';

const PRIORITY_RANK: Record<TicketPriority, number> = {
  [TicketPriority.URGENT]: 0,
  [TicketPriority.HIGH]:   1,
  [TicketPriority.MEDIUM]: 2,
  [TicketPriority.LOW]:    3,
};

/**
 * Everything one technician is responsible for: the board shows at most three
 * tickets per person, so this page lists, filters and pages the whole set.
 */
@Component({
  selector: 'app-technician-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslateModule, MatIconModule, PaginatorComponent],
  templateUrl: './technician-detail.html',
  styleUrl: './technician-detail.scss',
})
export class TechnicianDetailComponent {
  private readonly router  = inject(Router);
  readonly technicianStore = inject(TechnicianStore);
  readonly maintenanceStore = inject(MaintenanceStore);
  readonly equipmentStore   = inject(EquipmentStore);

  readonly id = toSignal(inject(ActivatedRoute).paramMap.pipe(map(p => p.get('id') ?? '')), { initialValue: '' });

  readonly tabs: TicketTab[]  = ['active', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'all'];
  readonly sorts: TicketSort[] = ['newest', 'oldest', 'priority'];

  readonly tab    = signal<TicketTab>('active');
  readonly sort   = signal<TicketSort>('newest');
  readonly search = signal('');

  readonly page     = signal(0);
  readonly pageSize = signal(10);

  readonly technician = computed(() => this.technicianStore.technicians().find(t => t.id === this.id()) ?? null);

  readonly initials = computed(() =>
    (this.technician()?.name ?? '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')
  );

  readonly hue = computed(() => {
    let h = 0;
    for (const c of this.id()) h = (h * 31 + c.charCodeAt(0)) % 360;
    return h;
  });

  /** Assigned (pending / in progress) plus the ones this technician closed. */
  readonly tickets = computed(() => {
    const id = this.id();
    return this.maintenanceStore.tickets().filter(t => t.assignee === id || t.completedBy === id);
  });

  readonly counts = computed<Record<TicketTab, number>>(() => {
    const list = this.tickets();
    const by = (s: TicketStatus) => list.filter(t => t.status === s).length;
    return {
      active:      by(TicketStatus.OPEN) + by(TicketStatus.IN_PROGRESS),
      OPEN:        by(TicketStatus.OPEN),
      IN_PROGRESS: by(TicketStatus.IN_PROGRESS),
      RESOLVED:    by(TicketStatus.RESOLVED),
      all:         list.length,
    };
  });

  readonly state = computed(() =>
    this.counts().IN_PROGRESS ? 'busy' : this.counts().OPEN ? 'assigned' : 'available'
  );

  /** Share of the technician's tickets already resolved. */
  readonly completionPct = computed(() =>
    this.counts().all ? Math.round((this.counts().RESOLVED / this.counts().all) * 100) : 0
  );

  readonly urgentOpen = computed(() =>
    this.tickets().filter(t => t.status !== TicketStatus.RESOLVED &&
      (t.priority === TicketPriority.URGENT || t.priority === TicketPriority.HIGH)).length
  );

  /** Machines this technician works on most, by ticket count. */
  readonly topMachines = computed(() => {
    const counts = new Map<string, number>();
    for (const t of this.tickets()) counts.set(t.equipmentId, (counts.get(t.equipmentId) ?? 0) + 1);
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([equipmentId, count]) => ({ equipmentId, count, pct: (count / Math.max(1, this.counts().all)) * 100 }));
  });

  readonly visibleTickets = computed(() => {
    const tab = this.tab();
    const q = this.search().trim().toLowerCase();
    const list = this.tickets().filter(t =>
      (tab === 'all' || (tab === 'active' ? t.status !== TicketStatus.RESOLVED : t.status === tab)) &&
      (!q || `${this.equipmentName(t.equipmentId)} ${t.description} ${t.id}`.toLowerCase().includes(q))
    );
    const byDate = (a: MaintenanceTicket, b: MaintenanceTicket) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '');
    switch (this.sort()) {
      case 'oldest':   return list.sort((a, b) => byDate(b, a));
      case 'priority': return list.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || byDate(a, b));
      default:         return list.sort(byDate);
    }
  });

  readonly pagedTickets = computed(() => paginate(this.visibleTickets(), this.page(), this.pageSize()));

  constructor() {
    effect(() => {
      this.tab();
      this.sort();
      this.search();
      this.id();
      this.page.set(0);
    }, { allowSignalWrites: true });
  }

  equipmentName(id: string): string {
    return this.equipmentStore.equipment().find(e => e.uuid === id)?.name ?? id;
  }

  ticketCode(t: MaintenanceTicket): string { return `T-${t.id.slice(0, 8)}`; }

  ticketAge(t: MaintenanceTicket): string {
    const h = Math.floor((Date.now() - new Date(t.createdAt).getTime()) / 3600000);
    return h < 24 ? `${h}h` : `${Math.floor(h / 24)}d`;
  }

  openTicket(t: MaintenanceTicket): void {
    this.router.navigate(['/maintenance'], { queryParams: { ticket: t.id } });
  }

  copyId(): void { navigator.clipboard.writeText(this.id()); }
}
