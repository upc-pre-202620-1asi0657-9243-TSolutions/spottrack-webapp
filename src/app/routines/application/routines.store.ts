import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RoutinesApi } from '../infrastructure/routines-api';
import { Routine } from '../domain/model/routine.entity';

@Injectable({ providedIn: 'root' })
export class RoutinesStore {

  private readonly api        = inject(RoutinesApi);
  private readonly destroyRef = inject(DestroyRef);

  private readonly _routines = signal<Routine[]>([]);
  private readonly _loading  = signal(false);
  private readonly _error    = signal<string | null>(null);

  readonly searchQuery  = signal('');
  readonly loading      = this._loading.asReadonly();
  readonly error        = this._error.asReadonly();
  readonly routines     = this._routines.asReadonly();

  readonly filteredRoutines = computed(() => {
    const query = this.searchQuery().toLowerCase();
    return this._routines().filter(r => !query || r.routineName.toLowerCase().includes(query));
  });

  constructor() { this.load(); }

  createRoutine(routineName: string): void {
    this._error.set(null);
    this.api.createRoutine(routineName)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: created => this._routines.update(list => [created, ...list]),
        error: (err: unknown) => {
          this._error.set(err instanceof Error ? err.message : 'Error al crear la rutina');
        },
      });
  }

  private load(): void {
    this._loading.set(true);
    this._error.set(null);

    this.api.getRoutines()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: routines => {
          this._routines.set(routines);
          this._loading.set(false);
        },
        error: (err: unknown) => {
          this._error.set(err instanceof Error ? err.message : 'Error al cargar rutinas');
          this._loading.set(false);
        },
      });
  }
}
