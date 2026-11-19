import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { AnalyticsStore } from '../../application/analytics.store';
import { ContextMenuDirective } from '../../../shared/presentation/directives/context-menu.directive';
import { ContextMenuItem } from '../../../shared/application/context-menu.service';
import { PaginatorComponent, paginate } from '../../../shared/presentation/components/paginator/paginator';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [
    DecimalPipe,
    ReactiveFormsModule,
    TranslateModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    ContextMenuDirective,
    PaginatorComponent,
  ],
  templateUrl: './analytics.html',
  styleUrl:    './analytics.scss',
})
export class AnalyticsComponent implements OnInit {
  private readonly store = inject(AnalyticsStore);

  ngOnInit(): void {
    this.store.load();
  }

  // ── Filters ──────────────────────────────────────────────────────────────
  readonly selectedPeriod = this.store.selectedPeriod;
  readonly selectedBranch = this.store.selectedBranch;
  readonly branches       = this.store.branches;
  readonly showComparison = signal(false);

  readonly dateRange = new FormGroup({
    start: new FormControl<Date | null>(null),
    end:   new FormControl<Date | null>(null),
  });

  // ── Stats (computed signal — called as stats() in template) ──────────────
  readonly stats = this.store.stats;

  // ── Bar chart ─────────────────────────────────────────────────────────────
  get weeklyData() { return this.store.weeklyData(); }

  readonly barTicks = this.store.barTicks;

  barPct(value: number): string { return `${(value / this.store.maxCapacity()) * 100}%`; }

  // ── Pie chart ─────────────────────────────────────────────────────────────
  get machineTypes() { return this.store.machineTypes(); }

  pieGradient(): string { return this.store.pieGradient(); }

  // ── Line chart (SVG) ──────────────────────────────────────────────────────
  get hourlyData()     { return this.store.hourlyData(); }
  get threshold90Y()   { return this.store.threshold90Y; }

  readonly linePoints     = this.store.linePoints;
  readonly polylinePoints = this.store.polylinePoints;
  readonly areaPath       = this.store.areaPath;

  // ── Relocation recommendations ────────────────────────────────────────────
  get relocationData() { return this.store.relocationData(); }

  // ── Executive summary ─────────────────────────────────────────────────────
  readonly executive = this.store.executiveSummary;

  /** '+12' / '-3' / '0' for change figures. */
  signed(value: number): string { return value > 0 ? `+${value}` : `${value}`; }

  readonly relocationPage     = signal(0);
  readonly relocationPageSize = signal(5);
  readonly pagedRelocations = computed(() =>
    paginate(this.store.relocationData(), this.relocationPage(), this.relocationPageSize())
  );

  // ── Actions ───────────────────────────────────────────────────────────────
  exportCsv(): void {
    const s = this.stats();
    const rows: string[][] = [
      ['SpotTrack Analytics Export', new Date().toLocaleDateString('es-PE')],
      [],
      ['ESTADÍSTICAS GENERALES'],
      ['Horas Totales de Uso', `${s.totalHours}h`, s.hoursChange === null ? 'sin datos del periodo anterior' : `${this.signed(s.hoursChange)}% vs periodo anterior`],
      ['Tasa de Ocupación',    `${s.occupancy}%`,  `${this.signed(s.occupancyChange)} pp vs periodo anterior`],
      ['Pico Máximo',          `${s.peak}%`,        s.peakTime],
      ['Equipos sin uso',      `${s.inactive}`,    `${this.signed(s.inactiveChange)} vs periodo anterior`],
      [],
      ['USO POR DÍA DE LA SEMANA'],
      ['Día', 'Uso (h)', 'Periodo Anterior (h)'],
      ...this.weeklyData.map(d => [d.day, String(d.usage), String(d.prevUsage)]),
      [],
      ['PICOS DE OCUPACIÓN POR HORA'],
      ['Hora', 'Ocupación (%)'],
      ...this.hourlyData.map(d => [d.hour, String(d.occupancy)]),
      [],
      ['RECOMENDACIONES DE REUBICACIÓN'],
      ['Máquina', 'Uso de la Máquina (%)', 'Sede Origen', 'Ocupación Origen (%)', 'Sede Destino', 'Ocupación Destino (%)', 'Motivo'],
      ...this.relocationData.map(r => [
        r.machine, String(r.machineUtilization), r.fromBranch, String(r.fromOccupancy),
        r.toBranch, String(r.toOccupancy), r.reason,
      ]),
    ];

    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `spottrack-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  generatePdf(): void {
    window.print();
  }

  readonly chartMenu: ContextMenuItem[] = [
    { label: 'Export CSV',    icon: 'download',         action: () => this.exportCsv() },
    { label: 'Generate PDF',  icon: 'picture_as_pdf',   action: () => this.generatePdf() },
  ];

  relocationMenu(machine: string): ContextMenuItem[] {
    return [
      { label: 'Copy machine name', icon: 'content_copy', action: () => navigator.clipboard.writeText(machine) },
      { label: '', icon: '', separator: true, action: () => {} },
      { label: 'Export CSV',        icon: 'download',     action: () => this.exportCsv() },
    ];
  }
}
