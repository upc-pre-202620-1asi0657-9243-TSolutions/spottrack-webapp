import { inject, Injectable, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { BranchApi, BranchResource } from '../infrastructure/branch-api';

@Injectable({ providedIn: 'root' })
export class BranchStore {
  private readonly api = inject(BranchApi);

  private readonly branchesSignal      = signal<BranchResource[]>([]);
  private readonly loadingSignal       = signal(false);
  private readonly errorSignal         = signal<string | null>(null);
  private readonly createLoadingSignal = signal(false);
  private readonly createErrorSignal   = signal<string | null>(null);

  readonly branches      = this.branchesSignal.asReadonly();
  readonly loading       = this.loadingSignal.asReadonly();
  readonly error         = this.errorSignal.asReadonly();
  readonly createLoading = this.createLoadingSignal.asReadonly();
  readonly createError   = this.createErrorSignal.asReadonly();

  load(gymId: string): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    this.api.getBranches(gymId).subscribe({
      next: list => {
        this.branchesSignal.set(list);
        this.loadingSignal.set(false);
      },
      error: () => {
        this.errorSignal.set('branches.error.loadFailed');
        this.loadingSignal.set(false);
      },
    });
  }

  create(gymId: string, name: string, address: string): void {
    this.createLoadingSignal.set(true);
    this.createErrorSignal.set(null);

    this.api.createBranch(gymId, { name, address }).subscribe({
      next: branch => {
        this.branchesSignal.update(list => [...list, branch]);
        this.createLoadingSignal.set(false);
      },
      error: (err: unknown) => {
        let key = 'branches.error.createFailed';
        if (err instanceof HttpErrorResponse && err.status === 409) {
          const code = err.error?.details as string | undefined;
          if (code === 'gym.error.branch.limitReached')
            key = 'branches.error.limitReached';
          else if (code === 'gym.error.branch.noActiveMembership')
            key = 'branches.error.noActiveMembership';
        }
        this.createErrorSignal.set(key);
        this.createLoadingSignal.set(false);
      },
    });
  }

  clearCreateError(): void { this.createErrorSignal.set(null); }
}
