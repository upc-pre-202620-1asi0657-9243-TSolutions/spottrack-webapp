import { computed, inject, Injectable, signal } from '@angular/core';
import { GymAdminApi } from '../infrastructure/gym-admin-api';
import { GymSummaryResource } from '../infrastructure/gym-api';

@Injectable({ providedIn: 'root' })
export class AdminGymStore {
  private readonly api = inject(GymAdminApi);

  private readonly myGymsSignal        = signal<GymSummaryResource[]>([]);
  private readonly loadingSignal       = signal(false);
  private readonly errorSignal         = signal<string | null>(null);
  private readonly loadedSignal        = signal(false);
  private readonly createLoadingSignal = signal(false);
  private readonly createErrorSignal   = signal<string | null>(null);

  readonly myGyms        = this.myGymsSignal.asReadonly();
  readonly loading       = this.loadingSignal.asReadonly();
  readonly error         = this.errorSignal.asReadonly();
  readonly loaded        = this.loadedSignal.asReadonly();
  readonly createLoading = this.createLoadingSignal.asReadonly();
  readonly createError   = this.createErrorSignal.asReadonly();

  readonly primaryGym = computed(() => this.myGymsSignal()[0] ?? null);
  readonly hasNoGym   = computed(
    () => this.loadedSignal() && !this.loadingSignal() && this.myGymsSignal().length === 0
  );

  load(): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    this.api.getMyGyms().subscribe({
      next: list => {
        this.myGymsSignal.set(list);
        this.loadingSignal.set(false);
        this.loadedSignal.set(true);
      },
      error: () => {
        this.errorSignal.set('gym.error.myGymsFailed');
        this.loadingSignal.set(false);
        this.loadedSignal.set(true);
      },
    });
  }

  create(gymName: string): void {
    this.createLoadingSignal.set(true);
    this.createErrorSignal.set(null);

    this.api.createGym(gymName).subscribe({
      next: gym => {
        this.myGymsSignal.update(list => [...list, gym]);
        this.createLoadingSignal.set(false);
      },
      error: () => {
        this.createErrorSignal.set('gym.error.createFailed');
        this.createLoadingSignal.set(false);
      },
    });
  }

  reset(): void {
    this.myGymsSignal.set([]);
    this.loadingSignal.set(false);
    this.errorSignal.set(null);
    this.loadedSignal.set(false);
    this.createLoadingSignal.set(false);
    this.createErrorSignal.set(null);
  }
}
