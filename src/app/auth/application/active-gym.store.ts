import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ClientGymAssociationApi,
  ClientGymAssociationResource,
} from '../infrastructure/client-gym-association-api';

@Injectable({ providedIn: 'root' })
export class ActiveGymStore {
  private readonly api = inject(ClientGymAssociationApi);

  private readonly associationsSignal   = signal<ClientGymAssociationResource[]>([]);
  private readonly loadingSignal        = signal(false);
  private readonly loadedSignal         = signal(false);
  private readonly errorSignal          = signal<string | null>(null);
  // Separate signal for associateToGym so the association screen can show
  // whitelist-denial errors without interfering with general load/switch errors.
  private readonly associateErrorSignal = signal<string | null>(null);

  readonly associations   = this.associationsSignal.asReadonly();
  readonly loading        = this.loadingSignal.asReadonly();
  readonly loaded         = this.loadedSignal.asReadonly();
  readonly error          = this.errorSignal.asReadonly();
  readonly associateError = this.associateErrorSignal.asReadonly();

  // The currently active gym, derived from the list. Null when list is empty
  // or (in the unlikely event of backend inconsistency) no item is flagged active.
  readonly activeGym = computed(() =>
    this.associationsSignal().find(a => a.active) ?? null
  );

  // True when the client has no gym associations at all, OR when none is active.
  // Route guards and the membership interceptor use this to decide whether to
  // redirect to /gym/associate before attempting any gym-scoped API call.
  readonly hasNoActiveGym = computed(() =>
    this.associationsSignal().length === 0 || this.activeGym() === null
  );

  // Called by AuthStore immediately after a successful client login so that
  // hasNoActiveGym() is accurate before the first protected page renders.
  // ActiveGymStore intentionally does NOT inject AuthStore to avoid a cycle.
  loadAssociations(): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    this.api.getAssociations().subscribe({
      next: list => {
        this.associationsSignal.set(list);
        this.loadingSignal.set(false);
        this.loadedSignal.set(true);
      },
      error: () => {
        this.errorSignal.set('gym.error.loadFailed');
        this.loadingSignal.set(false);
        this.loadedSignal.set(true);
      },
    });
  }

  switchActiveGym(gymId: string): void {
    this.errorSignal.set(null);

    this.api.changeActiveGym(gymId).subscribe({
      next: updated => {
        // Flip the active flag locally to avoid a full reload.
        this.associationsSignal.update(list =>
          list.map(a => ({ ...a, active: a.gymId === updated.gymId }))
        );
      },
      error: (err: unknown) => {
        // 403: the admin removed this client from the gym's whitelist after association.
        const isForbidden =
          err instanceof HttpErrorResponse && err.status === 403;
        this.errorSignal.set(
          isForbidden ? 'gym.error.access.revoked' : 'gym.error.switchFailed'
        );
      },
    });
  }

  associateToGym(gymId: string): void {
    this.associateErrorSignal.set(null);

    this.api.associateGym(gymId).subscribe({
      next: created => {
        // If this is the first association, mark it active locally;
        // the backend already flags it active on first association.
        this.associationsSignal.update(list => [...list, created]);
      },
      error: (err: unknown) => {
        // 403: DNI not whitelisted. 409: association already exists.
        const status = err instanceof HttpErrorResponse ? err.status : 0;
        const key =
          status === 403 ? 'gym.error.access.notWhitelisted' :
          status === 409 ? 'gym.error.associateAlreadyExists' :
          'gym.error.associateFailed';
        this.associateErrorSignal.set(key);
      },
    });
  }

  // Called by AuthStore on logout to prevent stale gym data from bleeding
  // into a subsequent session (e.g. admin logging in after the client).
  reset(): void {
    this.associationsSignal.set([]);
    this.errorSignal.set(null);
    this.associateErrorSignal.set(null);
    this.loadingSignal.set(false);
    this.loadedSignal.set(false);
  }

  clearError(): void          { this.errorSignal.set(null); }
  clearAssociateError(): void { this.associateErrorSignal.set(null); }
}
