import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { MaintenanceStore } from '../../../application/maintenance.store';
import { EquipmentStore } from '../../../../gym/application/equipment.store';
import { AdminGymStore } from '../../../../gym/application/admin-gym.store';
import { ZoneStore } from '../../../../gym/application/zone.store';
import { EquipmentStatus } from '../../../../gym/domain/model/equipment.entity';
import { AuthStore } from '../../../../auth/application/auth.store';
import { TicketPriority, TicketStatus, TicketType } from '../../../domain/model/maintenance-ticket.entity';

export const DESCRIPTION_MAX = 500;

const STATUS_ICONS: Record<EquipmentStatus, string> = {
  [EquipmentStatus.AVAILABLE]:      'check_circle',
  [EquipmentStatus.OCCUPIED]:       'person',
  [EquipmentStatus.ACTIVE]:         'bolt',
  [EquipmentStatus.MAINTENANCE]:    'build',
  [EquipmentStatus.OUT_OF_SERVICE]: 'cancel',
  [EquipmentStatus.DECOMMISSIONED]: 'delete_forever',
};

const TYPE_ICONS: Record<TicketType, string> = {
  [TicketType.CORRECTIVE]: 'build',
  [TicketType.PREVENTIVE]: 'event_repeat',
};

const PRIORITY_ICONS: Record<TicketPriority, string> = {
  [TicketPriority.LOW]:    'south',
  [TicketPriority.MEDIUM]: 'drag_handle',
  [TicketPriority.HIGH]:   'north',
  [TicketPriority.URGENT]: 'priority_high',
};

@Component({
  selector: 'app-new-ticket',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslateModule, MatIconModule],
  templateUrl: './new-ticket.html',
  styleUrl:    './new-ticket.scss',
})
export class NewTicketComponent {
  private readonly router     = inject(Router);
  private readonly route      = inject(ActivatedRoute);
  private readonly authStore  = inject(AuthStore);
  private readonly adminGymStore = inject(AdminGymStore);
  readonly zoneStore      = inject(ZoneStore);
  readonly store          = inject(MaintenanceStore);
  readonly equipmentStore = inject(EquipmentStore);

  readonly priorities = Object.values(TicketPriority);
  readonly types      = Object.values(TicketType);
  readonly today      = new Date().toISOString().split('T')[0];
  readonly descriptionMax = DESCRIPTION_MAX;

  // ── Form state ────────────────────────────────────────────────────────────
  readonly equipmentId = signal<string | null>(this.route.snapshot.queryParamMap.get('equipment'));
  readonly type        = signal<TicketType>(TicketType.CORRECTIVE);
  readonly priority    = signal<TicketPriority>(TicketPriority.MEDIUM);
  readonly description = signal('');
  readonly date        = signal(this.today);
  readonly time        = signal('');
  readonly touched     = signal(false);

  readonly search = signal('');

  readonly isPeak    = computed(() => this.store.isPeakHour(this.time()));
  readonly isOffPeak = computed(() => !!this.time() && !this.isPeak());

  /** Decommissioned machines are retired, so they can't get new tickets. */
  readonly machines = computed(() =>
    this.equipmentStore.equipment().filter(e => e.status !== EquipmentStatus.DECOMMISSIONED)
  );

  readonly visibleMachines = computed(() => {
    const q = this.search().trim().toLowerCase();
    return this.machines().filter(m => !q || `${m.name} ${m.brand} ${m.model}`.toLowerCase().includes(q));
  });

  readonly selected = computed(() => this.machines().find(m => m.uuid === this.equipmentId()) ?? null);

  readonly selectedZone = computed(() => {
    const id = this.selected()?.zoneId;
    return id ? this.zoneStore.zones().find(z => z.zoneId === id)?.zoneName ?? null : null;
  });

  /** Tickets still open or in progress on the selected machine, so admins don't file duplicates. */
  readonly openTickets = computed(() => {
    const id = this.equipmentId();
    return id
      ? this.store.tickets().filter(t => t.equipmentId === id && t.status !== TicketStatus.RESOLVED)
      : [];
  });

  readonly isValid = computed(() => !!this.selected() && this.description().trim().length > 0);

  constructor() {
    this.adminGymStore.load();
    effect(() => {
      const gymId = this.adminGymStore.primaryGym()?.gymId;
      if (gymId) this.zoneStore.load(gymId);
    });
  }

  typeIcon(t: TicketType): string         { return TYPE_ICONS[t] ?? 'build'; }
  priorityIcon(p: TicketPriority): string { return PRIORITY_ICONS[p] ?? 'drag_handle'; }
  statusIcon(s: EquipmentStatus): string  { return STATUS_ICONS[s] ?? 'help'; }

  selectMachine(uuid: string): void {
    this.equipmentId.set(uuid);
    this.search.set('');
  }

  clearMachine(): void { this.equipmentId.set(null); }

  applySuggestion(t: string): void { this.time.set(t); }

  submit(): void {
    this.touched.set(true);
    const machine = this.selected();
    if (!this.isValid() || !machine) return;
    const requestedBy = this.authStore.currentUser()?.email ?? '';
    this.store.createTicket(machine.uuid, requestedBy, this.description().trim(), this.priority(), this.type());
    this.router.navigate(['/maintenance']);
  }

  cancel(): void { this.router.navigate(['/maintenance']); }
}
