import { computed, DestroyRef, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { Observable, retry } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Equipment, EquipmentStatus } from '../domain/model/equipment.entity';
import { EquipmentApi } from '../infrastructure/equipment-api';
import { ActiveGymStore } from '../../auth/application/active-gym.store';

@Injectable({ providedIn: 'root' })
export class EquipmentStore {

  private readonly activeGymStore = inject(ActiveGymStore);
  private readonly destroyRef     = inject(DestroyRef);

  private readonly equipmentSignal = signal<Equipment[]>([]);
  readonly equipment = this.equipmentSignal.asReadonly();

  private readonly loadingSignal = signal(false);
  readonly loading = this.loadingSignal.asReadonly();

  private readonly errorSignal = signal<string | null>(null);
  readonly error = this.errorSignal.asReadonly();

  readonly equipmentCount     = computed(() => this.equipment().length);
  readonly availableCount     = computed(() => this.equipment().filter(e => e.status === EquipmentStatus.AVAILABLE).length);
  readonly occupiedCount      = computed(() => this.equipment().filter(e => e.status === EquipmentStatus.OCCUPIED).length);
  readonly activeCount        = computed(() => this.equipment().filter(e => e.status === EquipmentStatus.ACTIVE).length);
  readonly maintenanceCount   = computed(() => this.equipment().filter(e => e.status === EquipmentStatus.MAINTENANCE).length);
  readonly outOfServiceCount  = computed(() => this.equipment().filter(e => e.status === EquipmentStatus.OUT_OF_SERVICE).length);
  readonly decommissionedCount = computed(() => this.equipment().filter(e => e.status === EquipmentStatus.DECOMMISSIONED).length);

  /** Equipment that's usable right now: available, occupied by a user, or otherwise active — not sidelined by maintenance/decommission. */
  readonly operationalCount = computed(() => this.equipment().filter(e =>
    e.status === EquipmentStatus.AVAILABLE ||
    e.status === EquipmentStatus.OCCUPIED ||
    e.status === EquipmentStatus.ACTIVE
  ).length);

  private static readonly POLL_INTERVAL_MS = 15000;

  constructor(private api: EquipmentApi) {
    // A client sees only their active gym's equipment via the association-guarded
    // gym-scoped endpoint; an admin has no client-gym association, so activeGym() stays
    // null and they fall back to the admin "my equipment" endpoint. Reloading whenever
    // activeGym() changes makes the map/reservation views populate on login and gym switch.
    effect(() => {
      this.activeGymStore.activeGym();
      untracked(() => this.loadEquipment());
    });
    setInterval(() => this.refreshEquipment(), EquipmentStore.POLL_INTERVAL_MS);
  }

  /** Client → gym-scoped endpoint (their active gym); admin → the admin-owned equipment endpoint. */
  private equipmentSource(): Observable<Equipment[]> {
    const gymId = this.activeGymStore.activeGym()?.gymId;
    return gymId ? this.api.getEquipmentByGym(gymId) : this.api.getEquipment();
  }

  addEquipment(entity: Equipment): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.api.registerEquipment(entity).pipe(retry(2)).subscribe({
      next: created => {
        const registered = (created && created.uuid) ? created : entity;
        this.equipmentSignal.update(list => [...list, registered]);
        this.loadingSignal.set(false);
      },
      error: err => {
        this.equipmentSignal.update(list => [...list, entity]);
        this.errorSignal.set(this.formatError(err, 'Failed to register equipment'));
        this.loadingSignal.set(false);
      },
    });
  }

  updateEquipmentStatus(uuid: string, status: EquipmentStatus): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.api.updateEquipmentStatus(uuid, status).pipe(retry(2)).subscribe({
      next: updated => {
        this.equipmentSignal.update(list => list.map(e => e.uuid === updated.uuid ? updated : e));
        this.loadingSignal.set(false);
      },
      error: err => {
        this.equipmentSignal.update(list => list.map(e => e.uuid === uuid ? Object.assign(Object.create(Object.getPrototypeOf(e)), e, { _status: status } as any) : e));
        this.errorSignal.set(this.formatError(err, 'Failed to update equipment status'));
        this.loadingSignal.set(false);
      },
    });
  }

  defineMaintenanceThreshold(uuid: string, threshold: string): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.api.defineMaintenanceThreshold(uuid, threshold).pipe(retry(2)).subscribe({
      next: updated => {
        this.equipmentSignal.update(list => list.map(e => e.uuid === updated.uuid ? updated : e));
        this.loadingSignal.set(false);
      },
      error: err => {
        this.errorSignal.set(this.formatError(err, 'Failed to define maintenance threshold'));
        this.loadingSignal.set(false);
      },
    });
  }

  decommissionEquipment(uuid: string): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.api.decommissionEquipment(uuid).pipe(retry(2)).subscribe({
      next: () => {
        this.equipmentSignal.update(list => list.filter(e => e.uuid !== uuid));
        this.loadingSignal.set(false);
      },
      error: err => {
        this.errorSignal.set(this.formatError(err, 'Failed to decommission equipment'));
        this.loadingSignal.set(false);
      },
    });
  }

  private loadEquipment(): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.equipmentSource().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: list => {
        this.equipmentSignal.set(list);
        this.loadingSignal.set(false);
      },
      error: () => {
        this.loadingSignal.set(false);
      },
    });
  }

  /** Silent background refresh — no loading/error signal churn, so status cards update without flicker. */
  private refreshEquipment(): void {
    this.equipmentSource().subscribe({
      next: list => this.equipmentSignal.set(list),
      error: () => {},
    });
  }

  private formatError(error: unknown, fallback: string): string {
    if (error instanceof Error) return error.message || fallback;
    return fallback;
  }
}
