import { computed, DestroyRef, effect, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AnalyticsApi } from '../infrastructure/analytics-api';
import { EquipmentResource } from '../infrastructure/analytics-response';
import { UsageHeatmapApi } from '../infrastructure/usage-heatmap-api';
import { UsageHeatmapResource } from '../infrastructure/usage-heatmap-response';
import { RelocationInsightsResource } from '../infrastructure/relocation-insights-response';
import { lastDays } from './usage-heatmap.store';
import { AdminGymStore } from '../../gym/application/admin-gym.store';

// ── Hourly occupancy point ────────────────────────────────────────────────────
export interface HourlyPoint { hour: string; occupancy: number; /** Reached the stress threshold. */ peak: boolean; }

// ── Consecutive stress-peak hours, e.g. 18:00 - 20:00 at up to 94% ──────────
export interface PeakSlot { range: string; maxOccupancy: number; }

// ── Usage per weekday (hours), for the window and the one right before ───────
export interface WeekDay { day: string; usage: number; prevUsage: number; }

// ── Occupancy grid: one row per weekday, one cell per opening hour ────────────
export interface DayHourCell {
  hour:      string;
  /** null when the window never reached this slot (e.g. a weekday outside it). */
  occupancy: number | null;
  peak:      boolean;
}
export interface DayHourRow { day: string; cells: DayHourCell[]; }

// ── Relocation recommendation (computed by the backend) ──────────────────────
export interface RelocationRec {
  equipmentId:          string;
  machine:              string;
  fromBranch:           string;
  fromOccupancy:        number;
  toBranch:             string;
  toOccupancy:          number;
  /** % of opening hours the machine itself was in use. */
  machineUtilization:   number;
  /** Backend explanation with the figures behind the suggestion. */
  reason:               string;
}

// ── Machine-type pie segment ──────────────────────────────────────────────────
export interface MachineTypeSegment { label: string; pct: number; color: string; }

// ── KPI stat card ─────────────────────────────────────────────────────────────
export interface BranchStats {
  totalHours:      number;
  /** % change vs the previous window; null when the previous window had no use to compare with. */
  hoursChange:     number | null;
  occupancy:       number;
  occupancyChange: number;
  peak:            number;
  peakTime:        string;
  /** Equipment with no use at all in the window. */
  inactive:        number;
  /** Change in that count vs the previous window. */
  inactiveChange:  number;
}

// ── Executive summary, derived from the same measured data ───────────────────
export interface ExecutiveSummary {
  hoursChange:     number | null;
  /** Hours of the day whose occupancy reached the stress threshold, e.g. ['18:00', '19:00']. */
  stressHours:     string[];
  inactive:        number;
  equipmentCount:  number;
}

/** Hourly occupancy at or above this % counts as a stress peak (same line as the chart's 90% guide). */
export const STRESS_OCCUPANCY = 90;

const WEEKDAY_LABELS: Record<string, string> = {
  MONDAY: 'Lun', TUESDAY: 'Mar', WEDNESDAY: 'Mié', THURSDAY: 'Jue',
  FRIDAY: 'Vie', SATURDAY: 'Sáb', SUNDAY: 'Dom',
};

const CARDIO_NAMES = /treadmill|bike|cycl|elliptic|row|cardio|cinta|remo|bicicleta|elíptic|escalador|stair/;
const FREE_WEIGHT_NAMES = /rack|banco|bench|barra|barbell|mancuerna|dumbbell|kettlebell|disco|plate|peso libre/;

/** Cardio and Fuerza use the same words as the gym map; free-weight gear (racks, benches, bars) is Pesas. */
function machineCategory(name: string): 'Cardio' | 'Fuerza' | 'Pesas' {
  const n = name.toLowerCase();
  if (CARDIO_NAMES.test(n)) return 'Cardio';
  if (FREE_WEIGHT_NAMES.test(n)) return 'Pesas';
  return 'Fuerza';
}

function hourLabel(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

function toHours(minutes: number): number {
  return Math.round((minutes / 60) * 10) / 10;
}

/** Smallest 1/2/5×10ⁿ value at or above `value`, so the bar chart axis has round ticks. */
function niceCeiling(value: number): number {
  if (value <= 0) return 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const step = [1, 2, 5, 10].find(f => f * magnitude >= value) ?? 10;
  return step * magnitude;
}

@Injectable({ providedIn: 'root' })
export class AnalyticsStore {

  private readonly api           = inject(AnalyticsApi);
  private readonly usageApi      = inject(UsageHeatmapApi);
  private readonly adminGymStore = inject(AdminGymStore);
  private readonly destroyRef    = inject(DestroyRef);

  // ── Raw signals ───────────────────────────────────────────────────────────
  private readonly _equipments = signal<EquipmentResource[]>([]);
  /** Usage measured by the backend from real sensor sessions for the selected period and branch. */
  private readonly _usage      = signal<UsageHeatmapResource | null>(null);
  /** Branch demand and relocation suggestions for the selected period. */
  private readonly _insights   = signal<RelocationInsightsResource | null>(null);
  private readonly _loading    = signal(false);
  private readonly _error      = signal<string | null>(null);

  readonly loading = this._loading.asReadonly();
  readonly error   = this._error.asReadonly();

  // ── Filter signals (driven from UI) ──────────────────────────────────────
  /** 'all' or a branchId of the admin's gym. */
  readonly selectedBranch  = signal<string>('all');
  readonly selectedPeriod  = signal<'month' | 'quarter' | 'year'>('month');

  private readonly periodDays = computed(() =>
    ({ month: 30, quarter: 90, year: 365 })[this.selectedPeriod()]
  );

  /** Real branches of the gym, for the branch filter. */
  readonly branches = computed(() =>
    (this._insights()?.branches ?? []).map(b => ({ branchId: b.branchId, name: b.name }))
  );

  // ── KPI stat cards ────────────────────────────────────────────────────────
  readonly stats = computed<BranchStats>(() => {
    const usage = this._usage();
    if (!usage) {
      return { totalHours: 0, hoursChange: null, occupancy: 0, occupancyChange: 0,
               peak: 0, peakTime: '—', inactive: 0, inactiveChange: 0 };
    }

    const minutes         = (usage.daily ?? []).reduce((s, d) => s + d.activeMinutes, 0);
    const previousMinutes = (usage.daily ?? []).reduce((s, d) => s + d.previousActiveMinutes, 0);
    const peakHour        = usage.peakHour;

    return {
      totalHours:      Math.round(minutes / 60),
      hoursChange:     previousMinutes > 0 ? Math.round(((minutes - previousMinutes) / previousMinutes) * 100) : null,
      occupancy:       usage.occupancyRate,
      occupancyChange: Math.round((usage.occupancyRate - usage.previousOccupancyRate) * 10) / 10,
      peak:            usage.peakOccupancyRate,
      peakTime:        peakHour === null ? '—' : `${hourLabel(peakHour)} - ${hourLabel(peakHour + 1)}`,
      inactive:        usage.inactiveEquipmentCount ?? 0,
      inactiveChange:  (usage.inactiveEquipmentCount ?? 0) - (usage.previousInactiveEquipmentCount ?? 0),
    };
  });

  // ── Bar chart: usage per weekday, measured from sensor sessions ──────────
  readonly weeklyData = computed<WeekDay[]>(() =>
    (this._usage()?.daily ?? []).map(d => ({
      day:       WEEKDAY_LABELS[d.dayOfWeek] ?? d.dayOfWeek,
      usage:     toHours(d.activeMinutes),
      prevUsage: toHours(d.previousActiveMinutes),
    }))
  );

  /** Top of the bar chart axis: the highest bar (current or previous), rounded up. */
  readonly maxCapacity = computed(() =>
    niceCeiling(Math.max(0, ...this.weeklyData().flatMap(b => [b.usage, b.prevUsage])))
  );

  /** Axis labels from top to bottom. */
  readonly barTicks = computed(() => {
    const max = this.maxCapacity();
    return [1, 0.75, 0.5, 0.25, 0].map(f => Math.round(max * f * 100) / 100);
  });

  // ── Line chart: hourly occupancy measured from sensor sessions ────────
  readonly hourlyData = computed<HourlyPoint[]>(() =>
    (this._usage()?.hourly ?? []).map(h => ({
      hour:      hourLabel(h.hour),
      occupancy: h.occupancyRate,
      peak:      h.occupancyRate >= STRESS_OCCUPANCY,
    }))
  );

  /** Opening hours of the grid's columns, e.g. ['06:00', ..., '21:00']. */
  readonly gridHours = computed<string[]>(() => {
    const usage = this._usage();
    if (!usage) return [];
    return Array.from({ length: usage.closingHour - usage.openingHour }, (_, i) => hourLabel(usage.openingHour + i));
  });

  /** Occupancy of every opening hour on every weekday, Monday first. */
  readonly dayHourGrid = computed<DayHourRow[]>(() => {
    const usage = this._usage();
    if (!usage) return [];
    const rates = new Map((usage.hourlyByDay ?? []).map(o => [`${o.dayOfWeek}-${o.hour}`, o.occupancyRate]));
    return Object.entries(WEEKDAY_LABELS).map(([dayOfWeek, day]) => ({
      day,
      cells: Array.from({ length: usage.closingHour - usage.openingHour }, (_, i) => {
        const hour      = usage.openingHour + i;
        const occupancy = rates.get(`${dayOfWeek}-${hour}`) ?? null;
        return { hour: hourLabel(hour), occupancy, peak: occupancy !== null && occupancy >= STRESS_OCCUPANCY };
      }),
    }));
  });

  /** Weekday + hour slots that reached the stress threshold, busiest first. */
  readonly dayHourPeaks = computed(() =>
    this.dayHourGrid()
      .flatMap(r => r.cells.filter(c => c.peak).map(c => ({ day: r.day, hour: c.hour, occupancy: c.occupancy as number })))
      .sort((a, b) => b.occupancy - a.occupancy)
  );

  /** Whether any session fell inside opening hours in the selected window. */
  readonly hasHourlyUsage = computed(() => (this._usage()?.hourly ?? []).some(h => h.occupancyRate > 0));

  /** Stress-peak hours merged into consecutive time slots, in order of the day. */
  readonly peakSlots = computed<PeakSlot[]>(() => {
    const slots: PeakSlot[] = [];
    let start: number | null = null;
    let max = 0;
    const hourly = this._usage()?.hourly ?? [];
    hourly.forEach((h, i) => {
      if (h.occupancyRate >= STRESS_OCCUPANCY) {
        if (start === null) { start = h.hour; max = 0; }
        max = Math.max(max, h.occupancyRate);
      }
      const next = hourly[i + 1];
      const slotEnds = start !== null && (!next || next.occupancyRate < STRESS_OCCUPANCY || next.hour !== h.hour + 1);
      if (slotEnds && start !== null) {
        slots.push({ range: `${hourLabel(start)} - ${hourLabel(h.hour + 1)}`, maxOccupancy: max });
        start = null;
      }
    });
    return slots;
  });

  // ── Pie chart: machine types breakdown ────────────────────────────────────
  readonly machineTypes = computed<MachineTypeSegment[]>(() => {
    const branch   = this.selectedBranch();
    const allEquip = this._equipments();
    // A branch heatmap lists exactly the equipment of that branch.
    const inBranch = new Set((this._usage()?.equipment ?? []).map(e => e.equipmentId));
    const equips   = branch === 'all' ? allEquip : allEquip.filter(e => inBranch.has(e.equipmentId));

    // Grouped by name, like the gym map does: zone ids are UUIDs, so they can't tell types apart.
    const counts = { Cardio: 0, Fuerza: 0, Pesas: 0 };
    for (const e of equips) counts[machineCategory(e.equipmentName)]++;
    const total = equips.length || 1;

    return [
      { label: 'Cardio', pct: Math.round((counts.Cardio / total) * 100), color: 'var(--accent)' },
      { label: 'Fuerza', pct: Math.round((counts.Fuerza / total) * 100), color: 'var(--teal)' },
      { label: 'Pesas',  pct: Math.round((counts.Pesas  / total) * 100), color: 'var(--success)' },
    ];
  });

  pieGradient(): string {
    let cur = 0;
    if (this.machineTypes().every(t => t.pct === 0)) return 'var(--surface-3) 0% 100%';
    const types = this.machineTypes();
    return types.map((t, i) => {
      // Rounded percentages can sum to 99 or 101; the last slice always closes the circle.
      const start = cur; cur = i === types.length - 1 ? 100 : cur + t.pct;
      return `${t.color} ${start}% ${cur}%`;
    }).join(', ');
  }

  // ── Relocation recommendations (backend: idle branch → saturated branch) ──
  readonly relocationData = computed<RelocationRec[]>(() => {
    const branch      = this.selectedBranch();
    const suggestions = this._insights()?.suggestions ?? [];
    return suggestions
      .filter(s => branch === 'all' || s.fromBranchId === branch || s.toBranchId === branch)
      .map(s => ({
        equipmentId:        s.equipmentId,
        machine:            s.equipmentName,
        fromBranch:         s.fromBranchName,
        fromOccupancy:      s.fromBranchUtilizationRate,
        toBranch:           s.toBranchName,
        toOccupancy:        s.toBranchUtilizationRate,
        machineUtilization: s.equipmentUtilizationRate,
        reason:             s.reason,
      }));
  });

  // ── Executive summary ─────────────────────────────────────────────────────
  readonly executiveSummary = computed<ExecutiveSummary>(() => ({
    hoursChange:    this.stats().hoursChange,
    stressHours:    this.hourlyData().filter(h => h.peak).map(h => h.hour),
    inactive:       this.stats().inactive,
    equipmentCount: this._usage()?.equipmentCount ?? 0,
  }));

  // ── SVG line chart geometry ───────────────────────────────────────────────
  readonly SVG_W = 1160;
  readonly SVG_H = 200;

  readonly linePoints = computed(() =>
    this.hourlyData().map((d, i) => ({
      x: (i / Math.max(this.hourlyData().length - 1, 1)) * this.SVG_W,
      y: this.SVG_H - (d.occupancy / 100) * this.SVG_H,
      ...d,
    }))
  );

  readonly polylinePoints = computed(() =>
    this.linePoints().map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  );

  readonly areaPath = computed(() => {
    const pts = this.linePoints();
    if (!pts.length) return '';
    return `M${pts[0].x},${this.SVG_H} ${pts.map(p => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')} L${pts[pts.length - 1].x},${this.SVG_H} Z`;
  });

  readonly threshold90Y = this.SVG_H - (STRESS_OCCUPANCY / 100) * this.SVG_H;

  // ── Constructor: load data ────────────────────────────────────────────────
  constructor() {
    this.load();
    // Re-measure whenever the admin's gym is known or the period/branch changes.
    effect(() => {
      const gymId  = this.adminGymStore.primaryGym()?.gymId;
      const days   = this.periodDays();
      const branch = this.selectedBranch();
      if (gymId) this.loadUsage(gymId, branch, days);
    });
    effect(() => {
      const gymId = this.adminGymStore.primaryGym()?.gymId;
      const days  = this.periodDays();
      if (gymId) this.loadInsights(gymId, days);
    });
  }

  private loadUsage(gymId: string, branch: string, days: number): void {
    const { from, to } = lastDays(days);
    const request = branch === 'all'
      ? this.usageApi.getGymUsage(gymId, from, to)
      : this.usageApi.getBranchUsage(branch, from, to);
    request
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next:  usage => this._usage.set(usage),
        error: () => this._usage.set(null),
      });
  }

  private loadInsights(gymId: string, days: number): void {
    const { from, to } = lastDays(days);
    this.usageApi.getRelocationInsights(gymId, from, to)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next:  insights => this._insights.set(insights),
        error: () => this._insights.set(null),
      });
  }

  load(): void {
    this._loading.set(true);
    this._error.set(null);

    this.api.getAnalyticsData()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ equipments }) => {
          this._equipments.set(equipments);
          this._loading.set(false);
        },
        error: (err: unknown) => {
          this._error.set(err instanceof Error ? err.message : 'Error al cargar analytics');
          this._loading.set(false);
        },
      });
  }

  /** Called by AuthStore on logout to prevent stale analytics data from bleeding into the next session. */
  reset(): void {
    this._equipments.set([]);
    this._usage.set(null);
    this._insights.set(null);
    this.selectedBranch.set('all');
    this._loading.set(false);
    this._error.set(null);
  }
}
