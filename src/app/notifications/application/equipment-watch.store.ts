import { effect, inject, Injectable, signal, untracked } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { AuthStore } from '../../auth/application/auth.store';
import { ClientNotificationsApi } from '../infrastructure/client-notifications-api';

/**
 * Notification bells the client has turned on (US12): machines they want to hear about
 * once they are released or back from maintenance.
 */
@Injectable({ providedIn: 'root' })
export class EquipmentWatchStore {

  private readonly auth = inject(AuthStore);
  private readonly api  = inject(ClientNotificationsApi);

  private readonly watchedSignal = signal<ReadonlySet<string>>(new Set());
  readonly watched = this.watchedSignal.asReadonly();

  constructor() {
    // Reload on login / account switch; clear on logout.
    effect(() => {
      const signedInClient = !!this.auth.token() && this.auth.isClient();
      untracked(() => signedInClient ? this.load() : this.watchedSignal.set(new Set()));
    });
  }

  isWatching(equipmentId: string): boolean {
    return this.watchedSignal().has(equipmentId);
  }

  watch(equipmentId: string): Observable<void> {
    return this.api.watch(equipmentId).pipe(
      tap(() => this.update(ids => ids.add(equipmentId))),
      map(() => void 0),
    );
  }

  unwatch(equipmentId: string): Observable<void> {
    return this.api.unwatch(equipmentId).pipe(
      tap(() => this.update(ids => ids.delete(equipmentId))),
    );
  }

  /** The bell fired (the machine is free or back in service): the backend no longer waits on it. */
  markFired(equipmentId: string): void {
    this.update(ids => ids.delete(equipmentId));
  }

  private load(): void {
    this.api.getActiveWatches().subscribe({
      next: watches => this.watchedSignal.set(new Set(watches.map(w => w.equipmentId))),
      error: () => {},
    });
  }

  private update(change: (ids: Set<string>) => void): void {
    const next = new Set(this.watchedSignal());
    change(next);
    this.watchedSignal.set(next);
  }
}
