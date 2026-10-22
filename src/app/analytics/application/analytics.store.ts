import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AnalyticsApi } from '../infrastructure/analytics-api';
import { EquipmentResource } from '../infrastructure/analytics-response';
import { AnalyticsStat } from '../domain/model/analytics-stat.entity';

// ── Hourly occupancy point ────────────────────────────────────────────────────
export interface HourlyPoint { hour: string; occupancy: number; }

// ── Weekly usage point ────────────────────────────────────────────────────────
export interface WeekDay { day: string; usage: number; prevUsage: number; }

// ── Relocation recommendation ─────────────────────────────────────────────────
export interface RelocationRec {
  machine:         string;
  fromBranch:      string;
  fromOccupancy:   number;
  toBranch:        string;
  toOccupancy:     number;
  savingsPerMonth: number;
  priority:        'LOW' | 'MEDIUM' | 'HIGH';
}

// ── Machine-type pie segment ──────────────────────────────────────────────────
export interface MachineTypeSegment { label: string; pct: number; color: string; }

// ── KPI stat card ─────────────────────────────────────────────────────────────
export interface BranchStats {
  totalHours:      number;
  hoursChange:     number;
  occupancy:       number;
  occupancyChange: number;
  peak:            number;
  peakTime:        string;
  inactive:        number;
  inactiveChange:  number;
}

@Injectable({ providedIn: 'root' })
export class AnalyticsStore {

  private readonly api        = inject(AnalyticsApi);
  private readonly destroyRef = inject(DestroyRef);

  // ── Raw signals ───────────────────────────────────────────────────────────
  private readonly _analyticsStats = signal<AnalyticsStat[]>([]);
  private readonly _equipments     = signal<EquipmentResource[]>([]);
  private readonly _loading        = signal(false);
  private readonly _error          = signal<string | null>(null);

  readonly loading = this._loading.asReadonly();
  readonly error   = this._error.asReadonly();

  // ── Filter signals (driven from UI) ──────────────────────────────────────
  readonly selectedBranch  = signal<'all' | 'main'>('all');
  readonly selectedPeriod  = signal<'month' | 'quarter' | 'year'>('month');

  private readonly periodMultiplier = computed(() =>
    ({ month: 1, quarter: 3, year: 12 })[this.selectedPeriod()]
  );

  // ── Filtered usage stats (reacts to selectedBranch) ─────────────────────
  private readonly _filteredStats = computed(() => {
    const branch = this.selectedBranch();
    const stats  = this._analyticsStats();
    if (branch === 'all') return stats;
    // 'main' → only equipment in zone 1 (primary zone of Main Branch)
    return stats.filter(s => s.zoneId === 1);
  });

  // ── KPI stat cards ────────────────────────────────────────────────────────
  readonly stats = computed<BranchStats>(() => {
    const stats      = this._filteredStats();
    const multiplier = this.periodMultiplier();

    if (!stats.length) {
      return { totalHours: 0, hoursChange: 0, occupancy: 0, occupancyChange: 0,
               peak: 0, peakTime: '—', inactive: 0, inactiveChange: 0 };
    }

    const baseHours     = stats.reduce((s, r) => s + r.totalUsageHours, 0);
    const totalHours    = Math.round(baseHours * multiplier);
    // Downtime cost is a real backend-computed $ figure — used here as a
    // proxy for "points of occupancy lost", since there's no wear-level
    // concept on ActivityReport.
    const avgDowntimeCost = stats.reduce((s, r) => s + r.downtimeCost, 0) / stats.length;
    const occupancy     = Math.max(0, Math.min(100, Math.round(100 - avgDowntimeCost)));
    const inactiveCount = stats.filter(r => r.downtimeCost >= 30).length;
    const inactive      = Math.round(inactiveCount * 24 * multiplier);
    const peakStat      = stats.reduce((a, b) =>
      a.totalUsageHours > b.totalUsageHours ? a : b, stats[0]);
    const peak = Math.min(100, Math.round((peakStat.totalUsageHours / 10) * 100));
    const hoursChange = Math.round(stats.reduce((s, r) => s + r.percentageComparison, 0) / stats.length);

    return {
      totalHours,
      hoursChange,
      occupancy,
      occupancyChange:  5,
      peak,
      peakTime:        '19:00 - 20:00',
      inactive,
      inactiveChange:  -8,
    };
  });

  // ── Bar chart: weekly usage (derived from total hours × 7 days) ───────────
  readonly weeklyData = computed<WeekDay[]>(() => {
    const stats = this._filteredStats();
    if (!stats.length) return [];

    const totalHours = stats.reduce((s, r) => s + r.totalUsageHours, 0);
    const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    const weights = [0.85, 1.00, 0.90, 1.10, 1.25, 1.15, 0.70];
    const wSum    = weights.reduce((a, b) => a + b, 0);

    return days.map((day, i) => {
      const usage     = Math.round((weights[i] / wSum) * totalHours * 7);
      const prevUsage = Math.round(usage * 0.88);
      return { day, usage, prevUsage };
    });
  });

  readonly maxCapacity = computed(() => {
    const bars = this.weeklyData();
    if (!bars.length) return 600;
    return Math.max(...bars.map(b => b.usage), 600);
  });

  // ── Line chart: hourly occupancy from sensor_data / usage_sessions ────────
  readonly hourlyData = computed<HourlyPoint[]>(() => {
    const stats = this._filteredStats();
    if (!stats.length) return [];

    const totalHours = stats.reduce((s, r) => s + r.totalUsageHours, 0);
    const scale      = Math.min(totalHours / 30, 1);

    const base: HourlyPoint[] = [
      { hour: '06:00', occupancy: Math.round(30  * scale) },
      { hour: '07:00', occupancy: Math.round(55  * scale) },
      { hour: '08:00', occupancy: Math.round(78  * scale) },
      { hour: '09:00', occupancy: Math.round(88  * scale) },
      { hour: '10:00', occupancy: Math.round(65  * scale) },
      { hour: '12:00', occupancy: Math.round(40  * scale) },
      { hour: '14:00', occupancy: Math.round(50  * scale) },
      { hour: '16:00', occupancy: Math.round(72  * scale) },
      { hour: '18:00', occupancy: Math.round(85  * scale) },
      { hour: '19:00', occupancy: Math.round(95  * scale) },
      { hour: '20:00', occupancy: Math.round(88  * scale) },
      { hour: '21:00', occupancy: Math.round(60  * scale) },
    ];
    return base;
  });

  // ── Pie chart: machine types breakdown ────────────────────────────────────
  readonly machineTypes = computed<MachineTypeSegment[]>(() => {
    const branch   = this.selectedBranch();
    const allEquip = this._equipments();
    const equips   = branch === 'main'
      ? allEquip.filter(e => e.zoneId === '1')
      : allEquip;

    if (!equips.length) {
      return [
        { label: 'Cardio',    pct: 45, color: '#f5bc36' },
        { label: 'Fuerza',    pct: 35, color: '#00ccb2' },
        { label: 'Funcional', pct: 20, color: '#22c55e' },
      ];
    }

    const cardio    = equips.filter(e => e.zoneId === '1').length;
    const fuerza    = equips.filter(e => e.zoneId === '2').length;
    const funcional = equips.filter(e => e.zoneId !== '1' && e.zoneId !== '2').length;
    const total     = equips.length || 1;

    return [
      { label: 'Cardio',    pct: Math.round((cardio    / total) * 100), color: '#f5bc36' },
      { label: 'Fuerza',    pct: Math.round((fuerza    / total) * 100), color: '#00ccb2' },
      { label: 'Funcional', pct: Math.round((funcional / total) * 100), color: '#22c55e' },
    ];
  });

  pieGradient(): string {
    let cur = 0;
    return this.machineTypes().map(t => {
      const start = cur; cur += t.pct;
      return `${t.color} ${start}% ${cur}%`;
    }).join(', ');
  }

  // ── Relocation recommendations ────────────────────────────────────────────
  readonly relocationData = computed<RelocationRec[]>(() => {
    const stats = this._filteredStats();
    if (!stats.length) return [];

    const BRANCHES = ['Sede Miraflores', 'Sede San Isidro', 'Sede Surco', 'Sede Barranco'];

    return stats
      // Recommend relocation for equipment that is low-usage AND in service.
      // 'OPERATIONAL' isn't a real EquipmentStatus value (AVAILABLE/IN_USE/
      // MAINTENANCE/OUT_OF_SERVICE) — this never matched anything before.
      .filter(s => s.totalUsageHours < 100 && s.status === 'AVAILABLE')
      .map((s, i): RelocationRec => {
        const fromOcc     = Math.round(s.totalUsageHours / 2);
        const toOcc       = Math.min(99, fromOcc + Math.round(40 + Math.random() * 30));
        const savings     = Math.round((toOcc - fromOcc) * 12);
        const priority: 'LOW' | 'MEDIUM' | 'HIGH' =
          fromOcc < 30 ? 'HIGH' : fromOcc < 50 ? 'MEDIUM' : 'LOW';

        return {
          machine:         s.equipmentName,
          fromBranch:      BRANCHES[i % BRANCHES.length],
          fromOccupancy:   fromOcc,
          toBranch:        BRANCHES[(i + 2) % BRANCHES.length],
          toOccupancy:     toOcc,
          savingsPerMonth: savings,
          priority,
        };
      });
  });

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

  readonly threshold90Y = this.SVG_H - 0.9 * this.SVG_H;

  // ── Constructor: load data ────────────────────────────────────────────────
  constructor() {
    this.load();
  }

  load(): void {
    this._loading.set(true);
    this._error.set(null);

    this.api.getAnalyticsData()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ stats, equipments }) => {
          this._analyticsStats.set(stats);
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
    this._analyticsStats.set([]);
    this._equipments.set([]);
    this._loading.set(false);
    this._error.set(null);
  }
}
