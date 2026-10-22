import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { TechnicianApi } from '../infrastructure/technician-api';
import { Technician } from '../domain/model/technician.entity';

@Injectable({ providedIn: 'root' })
export class TechnicianStore {
  private readonly api        = inject(TechnicianApi);
  private readonly destroyRef = inject(DestroyRef);

  private readonly techniciansSignal = signal<Technician[]>([]);
  private readonly loadingSignal     = signal(false);
  private readonly errorSignal       = signal<string | null>(null);
  private readonly creatingSignal    = signal(false);

  readonly technicians = this.techniciansSignal.asReadonly();
  readonly loading     = this.loadingSignal.asReadonly();
  readonly error       = this.errorSignal.asReadonly();
  readonly creating    = this.creatingSignal.asReadonly();

  constructor() {
    this.load();
  }

  load(): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.api.getTechnicians()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: resources => {
          this.techniciansSignal.set(resources.map(r => new Technician(r)));
          this.loadingSignal.set(false);
        },
        error: err => {
          this.errorSignal.set(this.formatError(err, 'Failed to load technicians'));
          this.loadingSignal.set(false);
        },
      });
  }

  createTechnician(name: string): void {
    this.creatingSignal.set(true);
    this.errorSignal.set(null);
    this.api.createTechnician(name)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: resource => {
          this.techniciansSignal.update(list => [...list, new Technician(resource)]);
          this.creatingSignal.set(false);
        },
        error: err => {
          this.errorSignal.set(this.formatError(err, 'Failed to create technician'));
          this.creatingSignal.set(false);
        },
      });
  }

  private formatError(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) return error.error?.message ?? error.message ?? fallback;
    if (error instanceof Error) return error.message || fallback;
    return fallback;
  }
}
