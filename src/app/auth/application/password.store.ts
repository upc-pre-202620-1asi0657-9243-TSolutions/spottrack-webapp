import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PasswordApi } from '../infrastructure/password-api';

@Injectable({ providedIn: 'root' })
export class PasswordStore {
  private readonly api        = inject(PasswordApi);
  private readonly destroyRef = inject(DestroyRef);

  // ── Change-password ───────────────────────────────────────────────────────────
  private readonly _changePwdLoading = signal(false);
  private readonly _changePwdError   = signal<string | null>(null);
  private readonly _changePwdSuccess = signal(false);

  readonly changePwdLoading = this._changePwdLoading.asReadonly();
  readonly changePwdError   = this._changePwdError.asReadonly();
  readonly changePwdSuccess = this._changePwdSuccess.asReadonly();

  changePassword(currentPassword: string, newPassword: string): void {
    this._changePwdLoading.set(true);
    this._changePwdError.set(null);
    this._changePwdSuccess.set(false);

    this.api.changePassword(currentPassword, newPassword)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this._changePwdLoading.set(false);
          this._changePwdSuccess.set(true);
        },
        error: (err) => {
          this._changePwdLoading.set(false);
          const code: string = err?.error?.code ?? '';
          if (code === 'auth.error.wrongPassword' || err?.status === 401) {
            this._changePwdError.set('auth.changePassword.error.wrongCurrent');
          } else {
            this._changePwdError.set('auth.changePassword.error.failed');
          }
        },
      });
  }

  resetChangePwd(): void {
    this._changePwdLoading.set(false);
    this._changePwdError.set(null);
    this._changePwdSuccess.set(false);
  }

  // ── Forgot-password ───────────────────────────────────────────────────────────
  private readonly _fpLoading = signal(false);
  private readonly _fpError   = signal<string | null>(null);
  private readonly _fpStep    = signal<1 | 2 | 'success'>(1);
  private readonly _fpEmail   = signal('');

  readonly fpLoading = this._fpLoading.asReadonly();
  readonly fpError   = this._fpError.asReadonly();
  readonly fpStep    = this._fpStep.asReadonly();
  readonly fpEmail   = this._fpEmail.asReadonly();

  sendForgotPassword(email: string): void {
    this._fpLoading.set(true);
    this._fpError.set(null);

    this.api.forgotPassword(email)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next:  () => { this._fpLoading.set(false); this._fpEmail.set(email); this._fpStep.set(2); },
        error: () => {
          // Always advance to step 2 — do not reveal whether the email exists.
          this._fpLoading.set(false);
          this._fpEmail.set(email);
          this._fpStep.set(2);
        },
      });
  }

  verifyForgotPassword(email: string, dni: string, newPassword: string): void {
    this._fpLoading.set(true);
    this._fpError.set(null);

    this.api.forgotPasswordVerify(email, dni, newPassword)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next:  () => { this._fpLoading.set(false); this._fpStep.set('success'); },
        error: () => {
          this._fpLoading.set(false);
          this._fpError.set('auth.forgotPassword.error.failed');
        },
      });
  }

  resetForgotPassword(): void {
    this._fpLoading.set(false);
    this._fpError.set(null);
    this._fpStep.set(1);
    this._fpEmail.set('');
  }
}
