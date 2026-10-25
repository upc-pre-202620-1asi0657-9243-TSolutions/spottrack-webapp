import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UsageHeatmapApi } from '../infrastructure/usage-heatmap-api';
import { UsageHeatmapResource } from '../infrastructure/usage-heatmap-response';

export type UsageWindow = 'today' | 'week' | 'month';

const WINDOW_DAYS: Record<UsageWindow, number> = { today: 1, week: 7, month: 30 };

/** Local calendar date as yyyy-MM-dd (toISOString would shift it to UTC). */
export function isoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Inclusive range ending today that spans the given number of days. */
export function lastDays(days: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  from.setDate(to.getDate() - (days - 1));
  return { from: isoDate(from), to: isoDate(to) };
}

/**
 * Gym-wide usage history for the heat map. One request covers every branch;
 * views normalise the heat within whatever scope they show.
 */
@Injectable({ providedIn: 'root' })
export class UsageHeatmapStore {
  private readonly api        = inject(UsageHeatmapApi);
  private readonly destroyRef = inject(DestroyRef);

  private readonly _heatmap = signal<UsageHeatmapResource | null>(null);
  private readonly _loading = signal(false);
  private readonly _error   = signal<string | null>(null);
  private gymId: string | null = null;

  readonly window  = signal<UsageWindow>('week');
  readonly heatmap = this._heatmap.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error   = this._error.asReadonly();

  /** Minutes of real use per equipment uuid within the selected window. */
  readonly activeMinutesByUuid = computed((): Record<string, number> => {
    const result: Record<string, number> = {};
    for (const e of this._heatmap()?.equipment ?? []) result[e.equipmentId] = e.activeMinutes;
    return result;
  });

  readonly hasUsage = computed(() => (this._heatmap()?.equipment ?? []).some(e => e.activeMinutes > 0));

  load(gymId: string): void {
    this.gymId = gymId;
    const { from, to } = lastDays(WINDOW_DAYS[this.window()]);
    this._loading.set(true);
    this._error.set(null);
    this.api.getGymUsage(gymId, from, to)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: heatmap => {
          this._heatmap.set(heatmap);
          this._loading.set(false);
        },
        error: (err: unknown) => {
          this._error.set(err instanceof Error ? err.message : 'Error loading usage history');
          this._loading.set(false);
        },
      });
  }

  setWindow(window: UsageWindow): void {
    this.window.set(window);
    if (this.gymId) this.load(this.gymId);
  }

  reset(): void {
    this.gymId = null;
    this._heatmap.set(null);
    this._loading.set(false);
    this._error.set(null);
  }
}
