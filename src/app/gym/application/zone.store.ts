import { inject, Injectable, signal } from '@angular/core';
import { ZoneApi } from '../infrastructure/zone-api';
import { Zone } from '../domain/model/zone.entity';

@Injectable({ providedIn: 'root' })
export class ZoneStore {
  private readonly api = inject(ZoneApi);

  private readonly zonesSignal        = signal<Zone[]>([]);
  private readonly loadingSignal      = signal(false);
  private readonly loadedSignal       = signal(false);
  private readonly errorSignal        = signal<string | null>(null);
  private readonly createLoadingSignal = signal(false);
  private readonly createErrorSignal   = signal<string | null>(null);

  readonly zones         = this.zonesSignal.asReadonly();
  readonly loading       = this.loadingSignal.asReadonly();
  readonly loaded        = this.loadedSignal.asReadonly();
  readonly error         = this.errorSignal.asReadonly();
  readonly createLoading = this.createLoadingSignal.asReadonly();
  readonly createError   = this.createErrorSignal.asReadonly();

  load(gymId: string): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    this.api.getZones(gymId).subscribe({
      next: list => {
        this.zonesSignal.set(list);
        this.loadingSignal.set(false);
        this.loadedSignal.set(true);
      },
      error: () => {
        this.errorSignal.set('map.branches.loadZonesFailed');
        this.loadingSignal.set(false);
        this.loadedSignal.set(true);
      },
    });
  }

  create(gymId: string, branchId: string, zoneName: string, maximumOccupancy: number): void {
    this.createLoadingSignal.set(true);
    this.createErrorSignal.set(null);

    this.api.createZone(gymId, branchId, { zoneName, maximumOccupancy, branchId }).subscribe({
      next: zone => {
        this.zonesSignal.update(list => [...list, zone]);
        this.createLoadingSignal.set(false);
      },
      error: () => {
        this.createErrorSignal.set('branches.zones.error.createFailed');
        this.createLoadingSignal.set(false);
      },
    });
  }

  clearCreateError(): void { this.createErrorSignal.set(null); }
}
