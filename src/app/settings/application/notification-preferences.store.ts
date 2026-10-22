import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { NotificationPreferencesApi } from '../infrastructure/notification-preferences-api';
import { NotificationPreferences } from '../domain/model/notification-preferences.entity';

@Injectable({ providedIn: 'root' })
export class NotificationPreferencesStore {
  private readonly api        = inject(NotificationPreferencesApi);
  private readonly destroyRef = inject(DestroyRef);

  private readonly preferencesSignal = signal<NotificationPreferences | null>(null);
  private readonly loadingSignal     = signal(false);
  private readonly savingSignal      = signal(false);
  private readonly errorSignal       = signal<string | null>(null);
  private readonly savedSignal       = signal(false);

  readonly preferences = this.preferencesSignal.asReadonly();
  readonly loading     = this.loadingSignal.asReadonly();
  readonly saving      = this.savingSignal.asReadonly();
  readonly error       = this.errorSignal.asReadonly();
  readonly saved       = this.savedSignal.asReadonly();

  constructor() {
    this.load();
  }

  load(): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.api.getCurrentUser()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: resource => {
          this.preferencesSignal.set(new NotificationPreferences(resource));
          this.loadingSignal.set(false);
        },
        error: err => {
          this.errorSignal.set(this.formatError(err, 'Failed to load notification preferences'));
          this.loadingSignal.set(false);
        },
      });
  }

  save(notifyOnCritical: boolean, notifyOnWarning: boolean, notificationEmail: string | null): void {
    this.savingSignal.set(true);
    this.errorSignal.set(null);
    this.savedSignal.set(false);
    this.api.updatePreferences({ notifyOnCritical, notifyOnWarning, notificationEmail })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: resource => {
          this.preferencesSignal.set(new NotificationPreferences(resource));
          this.savingSignal.set(false);
          this.savedSignal.set(true);
          setTimeout(() => this.savedSignal.set(false), 4000);
        },
        error: err => {
          this.errorSignal.set(this.formatError(err, 'Failed to save notification preferences'));
          this.savingSignal.set(false);
        },
      });
  }

  private formatError(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) return error.error?.message ?? error.message ?? fallback;
    if (error instanceof Error) return error.message || fallback;
    return fallback;
  }
}
