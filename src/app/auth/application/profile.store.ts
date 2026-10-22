import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ProfileApiService, ProfileSummary } from '../infrastructure/profile-api.service';

@Injectable({ providedIn: 'root' })
export class ProfileStore {
  private readonly api        = inject(ProfileApiService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly _profile = signal<ProfileSummary | null>(null);
  private readonly _loading = signal(false);
  private readonly _error   = signal<string | null>(null);

  private readonly _saving      = signal(false);
  private readonly _saveError   = signal<string | null>(null);
  private readonly _saveSuccess = signal(false);

  readonly profile = this._profile.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error   = this._error.asReadonly();

  readonly saving      = this._saving.asReadonly();
  readonly saveError   = this._saveError.asReadonly();
  readonly saveSuccess = this._saveSuccess.asReadonly();

  loadClientProfile(): void {
    this._loading.set(true);
    this._error.set(null);
    this.api.getMyClientProfile()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: profile => { this._profile.set(profile); this._loading.set(false); },
        error: (err: unknown) => {
          this._error.set(err instanceof Error ? err.message : 'Error al cargar el perfil');
          this._loading.set(false);
        },
      });
  }

  loadAdminProfile(): void {
    this._loading.set(true);
    this._error.set(null);
    this.api.getMyAdminProfile()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: profile => { this._profile.set(profile); this._loading.set(false); },
        error: (err: unknown) => {
          this._error.set(err instanceof Error ? err.message : 'Error al cargar el perfil');
          this._loading.set(false);
        },
      });
  }

  updateClientProfile(firstName: string, lastName: string, phoneNumber: string, dni: string): void {
    this.save(this.api.updateClientProfile({ firstName, lastName, phoneNumber, dni }));
  }

  updateAdminProfile(firstName: string, lastName: string, phoneNumber: string, dni: string): void {
    this.save(this.api.updateAdminProfile({ firstName, lastName, phoneNumber, dni }));
  }

  private save(request: ReturnType<ProfileApiService['updateClientProfile']>): void {
    this._saving.set(true);
    this._saveError.set(null);
    this._saveSuccess.set(false);
    request
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: updated => {
          this._profile.set(updated);
          this._saving.set(false);
          this._saveSuccess.set(true);
        },
        error: (err: unknown) => {
          this._saveError.set(err instanceof Error ? err.message : 'No se pudo guardar el perfil');
          this._saving.set(false);
        },
      });
  }

  clearSaveStatus(): void {
    this._saveError.set(null);
    this._saveSuccess.set(false);
  }
}
