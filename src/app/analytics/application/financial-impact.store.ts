import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FinancialImpactApi } from '../infrastructure/financial-impact-api';
import {
  MaintenanceTicketResource,
  MaintenanceLogResource,
  MaintenanceQuoteResource,
} from '../infrastructure/financial-impact-response';
import { FinancialStat } from '../domain/model/financial-impact.entity';

export interface InactivityRow      { machine: string; hours: number; ratePerHour: number; total: number; }
export interface MaintenanceTypeRow { label: string; amount: number; pct: number; color: string; }
export interface FinancialStats     {
  lossInactivity:   number;
  maintenanceCost:  number;
  potentialSavings: number;
  roiMonths:        number;
}

/** What the completed corrective repairs cost versus the same number of preventive checks. */
export interface PreventiveSavings {
  savings:          number;
  repairs:          number;
  avgRepairCost:    number;
  avgPreventiveCost: number;
}

@Injectable({ providedIn: 'root' })
export class FinancialImpactStore {

  private readonly api        = inject(FinancialImpactApi);
  private readonly destroyRef = inject(DestroyRef);

  private readonly _financialStats     = signal<FinancialStat[]>([]);
  private readonly _tickets            = signal<MaintenanceTicketResource[]>([]);
  private readonly _logs               = signal<MaintenanceLogResource[]>([]);
  private readonly _maintenanceQuotes  = signal<MaintenanceQuoteResource[]>([]);
  private readonly _loading            = signal(false);
  private readonly _error              = signal<string | null>(null);

  readonly loading = this._loading.asReadonly();
  readonly error   = this._error.asReadonly();

  /**
   * downtimeCost is a real backend-computed $ figure on ActivityReport, so
   * "total" comes straight from it rather than being reconstructed from a
   * synthetic hours x rate calculation. hours/ratePerHour are still shown
   * for the table's informational columns.
   */
  readonly inactivityLoss = computed<InactivityRow[]>(() => {
    return this._financialStats()
      .filter(s => s.downtimeCost > 0)
      .map(s => {
        const hours       = Math.max(1, Math.round(s.totalUsageHours));
        const total        = s.downtimeCost;
        const ratePerHour  = Math.round(total / hours);
        return { machine: s.equipmentName, hours, ratePerHour, total };
      })
      .sort((a, b) => b.total - a.total);
  });

  readonly totalMonthlyLoss = computed(() =>
    this.inactivityLoss().reduce((sum, row) => sum + row.total, 0)
  );

  /**
   * Corrective/preventive costs come from completed MaintenanceLog entries
   * (per-ticket, maintenance bounded context). Inventory cost comes from
   * MaintenanceQuote.sparePartsCost (analytics bounded context) — spare
   * parts are a cost line item on a quote, not a separate inventory concept.
   */
  readonly maintenanceTypes = computed<MaintenanceTypeRow[]>(() => {
    const tickets = this._tickets();
    const logs    = this._logs();
    const quotes  = this._maintenanceQuotes();

    if (!tickets.length && !quotes.length) return [];

    const costOf = (ticketId: string) =>
      logs.filter(l => l.ticketId === ticketId).reduce((s, l) => s + l.cost, 0);

    const corrective = tickets.filter(t => t.type === 'CORRECTIVE').reduce((s, t) => s + costOf(t.id), 0);
    const preventive = tickets.filter(t => t.type === 'PREVENTIVE').reduce((s, t) => s + costOf(t.id), 0);
    const inventory  = quotes.reduce((s, q) => s + q.sparePartsCost, 0);

    const total = corrective + preventive + inventory || 1;
    return [
      { label: 'financialImpact.costLabels.corrective', amount: corrective, pct: Math.round((corrective / total) * 100), color: 'var(--danger)' },
      { label: 'financialImpact.costLabels.preventive', amount: preventive, pct: Math.round((preventive / total) * 100), color: 'var(--success)' },
      { label: 'financialImpact.costLabels.inventory',  amount: inventory,  pct: Math.round((inventory  / total) * 100), color: 'var(--accent)' },
    ];
  });

  /**
   * Corrective repairs happen after a failure; preventive checks are planned and cheaper.
   * Savings = what the completed repairs cost minus what the same number of preventive
   * checks costs at the average preventive price from the logs. 0 when there is no
   * preventive history to compare against.
   */
  readonly preventiveSavings = computed<PreventiveSavings>(() => {
    const tickets = this._tickets();
    const logs    = this._logs();
    const costsOf = (type: string) => tickets
      .filter(t => t.type === type)
      .map(t => logs.filter(l => l.ticketId === t.id).reduce((s, l) => s + l.cost, 0))
      .filter(cost => cost > 0);

    const repairs    = costsOf('CORRECTIVE');
    const preventive = costsOf('PREVENTIVE');
    const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);
    const avgRepairCost     = Math.round(avg(repairs));
    const avgPreventiveCost = Math.round(avg(preventive));
    const savings = preventive.length
      ? Math.max(0, Math.round(repairs.reduce((s, x) => s + x, 0) - repairs.length * avgPreventiveCost))
      : 0;
    return { savings, repairs: repairs.length, avgRepairCost, avgPreventiveCost };
  });

  financialPieGradient(): string {
    const types = this.maintenanceTypes();
    if (types.every(t => t.pct === 0)) return 'var(--surface-3) 0% 100%';
    let cursor = 0;
    return types
      .map((t, i) => {
        // Rounded percentages can sum to 99 or 101; the last slice always closes the circle.
        const from = cursor;
        cursor = i === types.length - 1 ? 100 : cursor + t.pct;
        return `${t.color} ${from}% ${cursor}%`;
      })
      .join(', ');
  }

  readonly financialStats = computed<FinancialStats>(() => {
    const lossInactivity   = this.totalMonthlyLoss();
    const maintenanceCost  = this.maintenanceTypes().reduce((s, t) => s + t.amount, 0);
    const potentialSavings = this.preventiveSavings().savings;
    const monthlyBenefit   = Math.max(1, Math.round((lossInactivity * 0.3 + maintenanceCost * 0.05)));
    const sysImplCost      = Math.round(maintenanceCost * 0.6);
    const roiMonths        = Math.round((sysImplCost / monthlyBenefit) * 10) / 10;
    return { lossInactivity, maintenanceCost, potentialSavings, roiMonths };
  });

  constructor() { this.load(); }

  load(): void {
    this._loading.set(true);
    this._error.set(null);

    this.api.getFinancialImpactData()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ stats, tickets, logs, quotes }) => {
          this._financialStats.set(stats);
          this._tickets.set(tickets);
          this._logs.set(logs);
          this._maintenanceQuotes.set(quotes);
          this._loading.set(false);
        },
        error: (err: unknown) => {
          this._error.set(err instanceof Error ? err.message : 'Error al cargar datos financieros');
          this._loading.set(false);
        },
      });
  }

  /** Called by AuthStore on logout to prevent stale financial data from bleeding into the next session. */
  reset(): void {
    this._financialStats.set([]);
    this._tickets.set([]);
    this._logs.set([]);
    this._maintenanceQuotes.set([]);
    this._loading.set(false);
    this._error.set(null);
  }
}
