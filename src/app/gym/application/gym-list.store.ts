import { inject, Injectable, signal } from '@angular/core';
import { GymApi, GymSummaryResource } from '../infrastructure/gym-api';

@Injectable({ providedIn: 'root' })
export class GymListStore {
  private readonly api = inject(GymApi);

  private readonly gymsSignal    = signal<GymSummaryResource[]>([]);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal   = signal<string | null>(null);

  readonly gyms    = this.gymsSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly error   = this.errorSignal.asReadonly();

  load(): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    this.api.getAll().subscribe({
      next: list => {
        this.gymsSignal.set(list);
        this.loadingSignal.set(false);
      },
      error: () => {
        this.errorSignal.set('gym.associate.loadError');
        this.loadingSignal.set(false);
      },
    });
  }
}
