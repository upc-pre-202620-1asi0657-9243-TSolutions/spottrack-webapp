import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { MonitoringStore } from '../../../application/monitoring.store';
import { EquipmentStore } from '../../../../gym/application/equipment.store';
import { EquipmentStatus } from '../../../../gym/domain/model/equipment.entity';
import { PaginatorComponent, paginate } from '../../../../shared/presentation/components/paginator/paginator';

export type CoverageFilter = 'uncovered' | 'all';

@Component({
  selector: 'app-sensor-registration',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    TranslateModule,
    MatIconModule,
    PaginatorComponent,
  ],
  templateUrl: './sensor-registration.html',
  styleUrl: './sensor-registration.scss',
})
export class SensorRegistrationComponent {
  readonly store = inject(MonitoringStore);
  readonly equipmentStore = inject(EquipmentStore);

  // The store's loading/error slots are shared by every monitoring call; this
  // page only reflects its own registration.
  private readonly storeLoading = this.store.actionLoading;
  private readonly storeError   = this.store.actionError;
  readonly saving = signal(false);
  readonly error  = signal<string | null>(null);
  readonly registeredName = signal<string | null>(null);

  readonly motionSensors = this.store.motionSensors;

  readonly search         = signal('');
  readonly coverageFilter = signal<CoverageFilter>('uncovered');
  readonly selectedId     = signal<string | null>(null);

  readonly sensorPage     = signal(0);
  readonly sensorPageSize = signal(5);

  /** Decommissioned machines can't be monitored, so they never show up here. */
  private readonly machines = computed(() =>
    this.equipmentStore.equipment().filter(e => e.status !== EquipmentStatus.DECOMMISSIONED)
  );

  private readonly sensorsByEquipment = computed(() => {
    const counts = new Map<string, number>();
    for (const s of this.motionSensors()) counts.set(s.equipmentId, (counts.get(s.equipmentId) ?? 0) + 1);
    return counts;
  });

  readonly machineCount = computed(() => this.machines().length);

  readonly coveredCount = computed(() =>
    this.machines().filter(m => this.sensorsByEquipment().has(m.uuid)).length
  );

  readonly coveragePct = computed(() =>
    this.machineCount() ? Math.round((this.coveredCount() / this.machineCount()) * 100) : 0
  );

  readonly onlineCount = computed(() => this.motionSensors().filter(s => s.online).length);

  readonly visibleMachines = computed(() => {
    const q = this.search().trim().toLowerCase();
    const onlyUncovered = this.coverageFilter() === 'uncovered';
    return this.machines().filter(m =>
      (!onlyUncovered || !this.sensorsByEquipment().has(m.uuid)) &&
      (!q || `${m.name} ${m.brand} ${m.model}`.toLowerCase().includes(q))
    );
  });

  readonly selectedMachine = computed(() =>
    this.machines().find(m => m.uuid === this.selectedId()) ?? null
  );

  readonly pagedSensors = computed(() =>
    paginate(this.motionSensors(), this.sensorPage(), this.sensorPageSize())
  );

  constructor() {
    this.store.loadMotionSensors();

    // The store has no success signal: a registration that settles without an error landed.
    effect(() => {
      if (this.saving() && !this.storeLoading()) {
        const error = this.storeError();
        this.saving.set(false);
        this.error.set(error);
        if (!error) {
          this.registeredName.set(this.selectedMachine()?.name ?? null);
          this.selectedId.set(null);
          this.sensorPage.set(0);
          setTimeout(() => this.registeredName.set(null), 5000);
        }
      }
    }, { allowSignalWrites: true });
  }

  sensorCount(equipmentId: string): number {
    return this.sensorsByEquipment().get(equipmentId) ?? 0;
  }

  select(equipmentId: string): void {
    this.selectedId.set(equipmentId);
    this.registeredName.set(null);
  }

  submit(): void {
    const id = this.selectedId();
    if (!id || this.saving()) return;
    this.saving.set(true);
    this.error.set(null);
    this.store.registerMotionSensor(id);
  }
}
