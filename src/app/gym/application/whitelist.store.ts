import { inject, Injectable, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { WhitelistApi, WhitelistEntryResource } from '../infrastructure/whitelist-api';

@Injectable({ providedIn: 'root' })
export class WhitelistStore {
  private readonly api = inject(WhitelistApi);

  private readonly whitelistSignal  = signal<WhitelistEntryResource[]>([]);
  private readonly loadingSignal    = signal(false);
  private readonly errorSignal      = signal<string | null>(null);
  // Separate signal so the add-form error doesn't collide with the load error banner.
  private readonly addErrorSignal   = signal<string | null>(null);

  readonly whitelist = this.whitelistSignal.asReadonly();
  readonly loading   = this.loadingSignal.asReadonly();
  readonly error     = this.errorSignal.asReadonly();
  readonly addError  = this.addErrorSignal.asReadonly();

  load(gymId: string): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    this.api.getWhitelist(gymId).subscribe({
      next: list => {
        this.whitelistSignal.set(list);
        this.loadingSignal.set(false);
      },
      error: () => {
        this.errorSignal.set('whitelist.error.loadFailed');
        this.loadingSignal.set(false);
      },
    });
  }

  addDni(gymId: string, dni: string): void {
    this.addErrorSignal.set(null);

    this.api.addDni(gymId, dni).subscribe({
      next: entry => {
        this.whitelistSignal.update(list => [...list, entry]);
      },
      error: (err: unknown) => {
        const isDuplicate = err instanceof HttpErrorResponse && err.status === 409;
        this.addErrorSignal.set(
          isDuplicate ? 'whitelist.error.duplicate' : 'whitelist.error.addFailed'
        );
      },
    });
  }

  removeDni(gymId: string, dni: string): void {
    this.api.removeDni(gymId, dni).subscribe({
      next: () => {
        this.whitelistSignal.update(list => list.filter(e => e.dni !== dni));
      },
      error: () => {
        this.errorSignal.set('whitelist.error.loadFailed');
      },
    });
  }

  clearAddError(): void { this.addErrorSignal.set(null); }
}
