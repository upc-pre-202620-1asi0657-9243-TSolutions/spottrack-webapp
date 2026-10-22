import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe }    from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { MatIconModule }  from '@angular/material/icon';
import { FinancialImpactStore } from '../../../application/financial-impact.store';
import { ContextMenuDirective } from '../../../../shared/presentation/directives/context-menu.directive';
import { ContextMenuItem } from '../../../../shared/application/context-menu.service';

interface RoiMonth { month: string; cumulative: number; }

const ROI_MONTHS_LABELS = ['Mes 1', 'Mes 2', 'Mes 3', 'Mes 4', 'Mes 5', 'Mes 6', 'Mes 7', 'Mes 8'];

@Component({
  selector: 'app-financial-impact',
  standalone: true,
  imports: [
    DecimalPipe,
    TranslateModule,
    MatIconModule,
    ContextMenuDirective,
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
    return ROI_MONTHS_LABELS.map((month, i) => ({
      month,
      cumulative: Math.round(-cost + monthly * (i + 1)),
    }));
  });

  readonly roiYAxisLabels = ['6000', '3000', '0', '-3000', '-6000'];
  readonly gridLines      = new Array(7);

  private readonly ROI_MIN   = -6000;
  private readonly ROI_MAX   =  6000;
  private readonly ROI_RANGE =  12000;

  roiZeroLinePct(): string {
    return `${((0 - this.ROI_MIN) / this.ROI_RANGE) * 100}%`;
  }

  private clampRoi(value: number): number {
    return Math.max(this.ROI_MIN, Math.min(this.ROI_MAX, value));
  }

  roiBarHeight(value: number): string {
    const clamped = this.clampRoi(value);
    return `${(Math.abs(clamped) / this.ROI_RANGE) * 100}%`;
  }

  roiBarBottom(value: number): string {
    const clamped = this.clampRoi(value);
    const pct = (Math.min(clamped, 0) - this.ROI_MIN) / this.ROI_RANGE * 100;
    return `${pct}%`;
  }

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
      ...this.roiProjectionData().map(m => [m.month, `$${m.cumulative}`]),
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
