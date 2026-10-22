import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { AnalyticsApi } from '../../analytics/infrastructure/analytics-api';
import { AnalyticsStat } from '../../analytics/domain/model/analytics-stat.entity';
import { EquipmentStore } from '../../gym/application/equipment.store';
import { MaintenanceStore } from '../../maintenance/application/maintenance.store';
import { ReservationApi } from '../../reservation/infrastructure/reservation-api';
import { ReservationResource } from '../../reservation/infrastructure/reservation-response';

export interface HourlyCapacityPoint {
  hour:  string;
  value: number;
}

@Injectable({ providedIn: 'root' })
export class DashboardStore {
  private readonly api              = inject(AnalyticsApi);
  private readonly reservationApi   = inject(ReservationApi);
  private readonly destroyRef       = inject(DestroyRef);
  private readonly equipmentStore   = inject(EquipmentStore);
  private readonly maintenanceStore = inject(MaintenanceStore);

  private readonly usageStatsSignal   = signal<AnalyticsStat[]>([]);
  private readonly reservationsSignal = signal<ReservationResource[]>([]);
  private readonly loadingSignal      = signal(false);
  private readonly errorSignal        = signal<string | null>(null);

  readonly usageStats = this.usageStatsSignal.asReadonly();
  readonly loading    = this.loadingSignal.asReadonly();
  readonly error      = this.errorSignal.asReadonly();

  // ── Horas Pico de Capacidad — derived from real reservation start times ──
  /** Buckets reservations by hour-of-day (from startTime) and normalizes to 0-100% of the busiest hour. */
  readonly hourlyCapacityData = computed<HourlyCapacityPoint[]>(() => {
    const reservations = this.reservationsSignal();

    const counts: Record<number, number> = {};
    for (const r of reservations) {
      const hour = Number(r.startTime.split(':')[0]);
      counts[hour] = (counts[hour] ?? 0) + 1;
    }

    const maxCount = Math.max(...Object.values(counts), 1);

    return Object.entries(counts)
      .map(([h, c]) => ({
        hour:  `${h}:00`,
        value: Math.round((c / maxCount) * 100),
      }))
      .sort((a, b) => parseInt(a.hour) - parseInt(b.hour));
  });

  private readonly SVG_W = 680;
  private readonly SVG_H = 160;

  readonly linePoints = computed(() =>
    this.hourlyCapacityData().map((d, i) => ({
      x: (i / Math.max(this.hourlyCapacityData().length - 1, 1)) * this.SVG_W,
      y: this.SVG_H - (d.value / 100) * this.SVG_H,
      ...d,
    }))
  );

  readonly polylinePoints = computed(() =>
    this.linePoints().map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  );

  readonly areaPath = computed(() => {
    const pts = this.linePoints();
    if (!pts.length) return '';
    return (
      `M${pts[0].x},${this.SVG_H} ` +
      pts.map(p => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') +
      ` L${pts[pts.length - 1].x},${this.SVG_H} Z`
    );
  });

  // ── KPI summary cards ─────────────────────────────────────────────────────
  readonly operationalCount = computed(() => this.equipmentStore.operationalCount());
  readonly maintenanceCount = computed(() => this.equipmentStore.maintenanceCount());
  readonly outOfOrderCount  = computed(() => this.equipmentStore.outOfServiceCount());
  readonly totalTickets     = computed(() => this.maintenanceStore.totalTickets());

  // ── Uso de Máquinas (bar chart from real activity-report data) ────────────
  readonly machineUsageBars = computed(() => {
    const stats = this.usageStats();
    if (!stats.length) return [];

    const maxHours = Math.max(...stats.map(s => s.totalUsageHours), 1);
    return stats.map(s => ({
      name:  s.equipmentName,
      hours: s.totalUsageHours,
      pct:   (s.totalUsageHours / maxHours) * 100,
    }));
  });

  readonly maxBarHours = computed(() =>
    Math.max(...this.machineUsageBars().map(b => b.hours), 600)
  );

  // ── Equipos Subutilizados ─────────────────────────────────────────────────
  readonly underutilizedEquipment = computed(() => {
    const stats = this.usageStats();

    return stats
      .filter(s => s.totalUsageHours < 130)
      .map(s => {
        const roi: 'Bajo' | 'Medio' | 'Alto' =
          s.totalUsageHours < 80  ? 'Bajo'  :
          s.totalUsageHours < 110 ? 'Medio' : 'Alto';
        return {
          machineId: s.equipmentId.slice(0, 8),
          name:      s.equipmentName,
          location:  `Zona ${s.zoneId}`,
          hours:     `${s.totalUsageHours}h`,
          roi,
        };
      });
  });

  // ── Mantenimiento kanban ──────────────────────────────────────────────────
  readonly pendingTickets    = computed(() => this.maintenanceStore.pendingTickets());
  readonly inProgressTickets = computed(() => this.maintenanceStore.inProgressTickets());
  readonly resolvedTickets   = computed(() => this.maintenanceStore.resolvedTickets());

  ticketLabel(id: string): string {
    return `T-${id.slice(0, 8)}`;
  }

  equipmentName(equipmentId: string): string {
    return this.equipmentStore.equipment().find(e => e.uuid === equipmentId)?.name
      ?? equipmentId;
  }

  constructor() {
    this.load();
  }

  private load(): void {
    this.loadingSignal.set(true);
    forkJoin({
      analytics:    this.api.getAnalyticsData(),
      reservations: this.reservationApi.getAllReservationsAdmin(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ analytics, reservations }) => {
          this.usageStatsSignal.set(analytics.stats);
          this.reservationsSignal.set(reservations);
          this.loadingSignal.set(false);
        },
        error: err => {
          this.errorSignal.set(err instanceof Error ? err.message : 'Error');
          this.loadingSignal.set(false);
        },
      });
  }
}
