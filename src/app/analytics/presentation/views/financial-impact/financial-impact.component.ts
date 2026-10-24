import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe }    from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { MatIconModule }  from '@angular/material/icon';
import { FinancialImpactStore } from '../../../application/financial-impact.store';
import { ContextMenuDirective } from '../../../../shared/presentation/directives/context-menu.directive';
import { ContextMenuItem } from '../../../../shared/application/context-menu.service';
import { PaginatorComponent, paginate } from '../../../../shared/presentation/components/paginator/paginator';

/** month is 1-based; the template translates the "Month" label. */
interface RoiMonth { month: number; cumulative: number; }

interface RoiBar extends RoiMonth { x: number; y: number; height: number; labelY: number; }

interface RoiTick { value: number; y: number; label: string; }

const ROI_MONTHS = 8;

@Component({
  selector: 'app-financial-impact',
  standalone: true,
  imports: [
    DecimalPipe,
    TranslateModule,
    MatIconModule,
    ContextMenuDirective,
    PaginatorComponent,
  ],
  templateUrl: './financial-impact.component.html',
  styleUrl:    './financial-impact.component.scss',
})
export class FinancialImpactComponent implements OnInit {

  private readonly store = inject(FinancialImpactStore);

  ngOnInit(): void {
    this.store.load();
  }

  get stats()          { return this.store.financialStats(); }
  get inactivityLoss() { return this.store.inactivityLoss(); }

  readonly totalMonthlyLoss = this.store.totalMonthlyLoss;

  readonly lossPage     = signal(0);
  readonly lossPageSize = signal(5);
  readonly pagedInactivityLoss = computed(() =>
    paginate(this.store.inactivityLoss(), this.lossPage(), this.lossPageSize())
  );

  get maintenanceTypes() { return this.store.maintenanceTypes(); }

  maintenancePieGradient(): string { return this.store.financialPieGradient(); }

  readonly pendingMachineCost    = signal(5000);
  readonly pendingUnmetDemand    = signal(120);
  readonly pendingRevenuePerUser = signal(45);

  private readonly simMachineCost    = signal(5000);
  private readonly simUnmetDemand    = signal(120);
  private readonly simRevenuePerUser = signal(45);

  readonly roiProjectionData = computed((): RoiMonth[] => {
    const cost    = this.simMachineCost();
    const monthly = this.simUnmetDemand() * this.simRevenuePerUser();
    return Array.from({ length: ROI_MONTHS }, (_, i) => ({
      month: i + 1,
      cumulative: Math.round(-cost + monthly * (i + 1)),
    }));
  });

  // ── ROI chart geometry (SVG user units) ────────────────────────────────
  // The axis is derived from the data, so a bar's height is always its exact
  // cumulative value; the old fixed ±6000 axis clipped anything larger.
  readonly ROI_W = 800;
  readonly ROI_H = 280;
  readonly ROI_LEFT = 64;
  private readonly ROI_TOP = 24;
  private readonly ROI_BOTTOM = 32;

  readonly roiScale = computed(() => {
    const values = this.roiProjectionData().map(m => m.cumulative);
    const min = Math.min(0, ...values);
    const max = Math.max(0, ...values);
    const step = niceStep((max - min) / 4 || 1);
    let lo = Math.floor(min / step) * step;
    let hi = Math.ceil(max / step) * step || step;
    // Leave room for the value labels drawn past the end of the tallest bars.
    if (min < 0 && min - lo < step * 0.3) lo -= step;
    if (max > 0 && hi - max < step * 0.3) hi += step;
    const plotH = this.ROI_H - this.ROI_TOP - this.ROI_BOTTOM;
    const y = (v: number) => this.ROI_TOP + ((hi - v) / (hi - lo)) * plotH;
    const ticks: RoiTick[] = [];
    for (let v = lo; v <= hi + step / 2; v += step) {
      ticks.push({ value: v, y: y(v), label: formatMoney(v) });
    }
    return { y, ticks, zeroY: y(0), baseY: this.ROI_H - this.ROI_BOTTOM };
  });

  readonly roiBars = computed((): RoiBar[] => {
    const data = this.roiProjectionData();
    const { y, zeroY } = this.roiScale();
    const slot = (this.ROI_W - this.ROI_LEFT) / data.length;
    return data.map((m, i) => {
      const top = Math.min(y(m.cumulative), zeroY);
      const height = Math.max(Math.abs(y(m.cumulative) - zeroY), 1);
      return {
        ...m,
        x: this.ROI_LEFT + i * slot + slot * 0.18,
        y: top,
        height,
        labelY: m.cumulative >= 0 ? top - 6 : top + height + 14,
      };
    });
  });

  readonly roiBarWidth = computed(() => ((this.ROI_W - this.ROI_LEFT) / this.roiProjectionData().length) * 0.64);

  /** First month whose cumulative return is no longer negative, or null if it never gets there. */
  readonly breakEvenMonth = computed(() => this.roiProjectionData().find(m => m.cumulative >= 0)?.month ?? null);

  formatMoney(value: number): string { return formatMoney(value); }

  calculateRoi(): void {
    this.simMachineCost.set(this.pendingMachineCost());
    this.simUnmetDemand.set(this.pendingUnmetDemand());
    this.simRevenuePerUser.set(this.pendingRevenuePerUser());
  }

  exportCsv(): void {
    const s = this.stats;
    const rows: string[][] = [
      ['SpotTrack — Impacto Financiero', new Date().toLocaleDateString('es-PE')],
      [],
      ['ESTADÍSTICAS GENERALES'],
      ['Pérdida por Inactividad',  `$${s.lossInactivity}`],
      ['Costo Mantenimiento',      `$${s.maintenanceCost}`],
      ['Ahorro Potencial',         `$${s.potentialSavings}`],
      ['ROI Promedio',             `${s.roiMonths} meses`],
      [],
      ['PÉRDIDA POR INACTIVIDAD DE EQUIPOS'],
      ['Máquina', 'Horas', '$/Hora', 'Total'],
      ...this.inactivityLoss.map(r => [r.machine, String(r.hours), `$${r.ratePerHour}`, `$${r.total}`]),
      ['', '', 'TOTAL PÉRDIDA MENSUAL', `$${this.totalMonthlyLoss()}`],
      [],
      ['DESGLOSE DE COSTOS DE MANTENIMIENTO'],
      ['Categoría', 'Monto', 'Porcentaje'],
      ...this.maintenanceTypes.map(t => [t.label, `$${t.amount}`, `${t.pct}%`]),
      [],
      ['PROYECCIÓN ROI'],
      ['Mes', 'ROI Acumulado'],
      ...this.roiProjectionData().map(m => [`Mes ${m.month}`, `$${m.cumulative}`]),
    ];

    const csv  = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `spottrack-financial-impact-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  generatePdf(): void { window.print(); }

  readonly pageMenu: ContextMenuItem[] = [
    { label: 'Export CSV',   icon: 'download',       action: () => this.exportCsv() },
    { label: 'Generate PDF', icon: 'picture_as_pdf', action: () => this.generatePdf() },
  ];

  lossRowMenu(machine: string, total: number): ContextMenuItem[] {
    return [
      { label: 'Copy machine', icon: 'content_copy', action: () => navigator.clipboard.writeText(machine) },
      { label: 'Copy total',   icon: 'attach_money', action: () => navigator.clipboard.writeText(`$${total}`) },
      { label: '', icon: '', separator: true, action: () => {} },
      { label: 'Export CSV',   icon: 'download',     action: () => this.exportCsv() },
    ];
  }
}

/** Rounds a raw axis step up to 1, 2 or 5 × a power of ten, so ticks land on readable values. */
function niceStep(raw: number): number {
  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
  const fraction = raw / magnitude;
  return (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10) * magnitude;
}

function formatMoney(value: number): string {
  const abs = Math.abs(value);
  const text = abs >= 1000 ? `${Math.round(abs / 100) / 10}k` : `${Math.round(abs)}`;
  return `${value < 0 ? '-' : ''}$${text}`;
}
