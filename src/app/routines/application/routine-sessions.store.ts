import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RoutineSessionsApi } from '../infrastructure/routine-sessions-api';
import { RoutineSession, RoutineSessionStatus } from '../domain/model/routine-session.entity';

@Injectable({ providedIn: 'root' })
export class RoutineSessionsStore {

  private readonly api        = inject(RoutineSessionsApi);
  private readonly destroyRef = inject(DestroyRef);

  private readonly _sessions = signal<RoutineSession[]>([]);
  private readonly _loading  = signal(false);
  private readonly _error    = signal<string | null>(null);

  private readonly _actionLoading = signal(false);
  private readonly _actionError   = signal<string | null>(null);

  readonly loading  = this._loading.asReadonly();
  readonly error    = this._error.asReadonly();
  readonly sessions = this._sessions.asReadonly();

  readonly actionLoading = this._actionLoading.asReadonly();
  readonly actionError   = this._actionError.asReadonly();

  readonly activeSessionByRoutine = computed(() => {
    const map = new Map<number, RoutineSession>();
    for (const session of this._sessions()) {
      if (session.status === RoutineSessionStatus.STARTED) map.set(session.routineId, session);
    }
    return map;
  });

  constructor() { this.load(); }

  start(routineId: number): void {
    this._actionLoading.set(true);
    this._actionError.set(null);
    this.api.startSession(routineId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: created => {
          this._sessions.update(list => [created, ...list]);
          this._actionLoading.set(false);
        },
        error: (err: unknown) => {
          this._actionError.set(err instanceof Error ? err.message : 'Error al iniciar la rutina');
          this._actionLoading.set(false);
        },
      });
  }

  complete(sessionId: number): void {
    this._actionLoading.set(true);
    this._actionError.set(null);
    this.api.completeSession(sessionId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: updated => {
          this.replaceSession(updated);
          this._actionLoading.set(false);
        },
        error: (err: unknown) => {
          this._actionError.set(err instanceof Error ? err.message : 'Error al completar la rutina');
          this._actionLoading.set(false);
        },
      });
  }

  markMissed(sessionId: number): void {
    this._actionLoading.set(true);
    this._actionError.set(null);
    this.api.markMissed(sessionId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: updated => {
          this.replaceSession(updated);
          this._actionLoading.set(false);
        },
        error: (err: unknown) => {
          this._actionError.set(err instanceof Error ? err.message : 'Error al marcar la rutina como perdida');
          this._actionLoading.set(false);
        },
      });
  }

  setExerciseCompletion(sessionId: number, exerciseBlockId: number, completed: boolean): void {
    this._actionError.set(null);
    this.api.setExerciseCompletion(sessionId, exerciseBlockId, completed)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: updated => this.replaceSession(updated),
        error: (err: unknown) => {
          this._actionError.set(err instanceof Error ? err.message : 'Error al actualizar el ejercicio');
        },
      });
  }

  private replaceSession(updated: RoutineSession): void {
    this._sessions.update(list => list.map(s => s.id === updated.id ? updated : s));
  }

  private load(): void {
    this._loading.set(true);
    this._error.set(null);
    this.api.getSessions()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: sessions => {
          this._sessions.set(sessions);
          this._loading.set(false);
        },
        error: () => this._loading.set(false),
      });
  }
}
