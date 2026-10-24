import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { DashboardStore } from '../../application/dashboard.store';
import { TicketType } from '../../../maintenance/domain/model/maintenance-ticket.entity';
import { TranslatePipe } from '@ngx-translate/core';
import { ContextMenuDirective } from '../../../shared/presentation/directives/context-menu.directive';
import { ContextMenuItem } from '../../../shared/application/context-menu.service';
import { PaginatorComponent, paginate } from '../../../shared/presentation/components/paginator/paginator';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [DecimalPipe, MatIconModule, TranslatePipe, ContextMenuDirective, PaginatorComponent],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css'],
})
export class DashboardComponent {
  readonly store  = inject(DashboardStore);
  private  router = inject(Router);

  // ── SVG dimensions (must match store) ─────────────────────────────────
  readonly SVG_W = 680;
  readonly SVG_H = 160;

  // ── Y-axis ticks for line chart ───────────────────────────────────────
  readonly yTicks = [0, 25, 50, 75, 100].map((v) => ({
    label: String(v),
    y: this.SVG_H - (v / 100) * this.SVG_H,
  }));

  // ── Underutilized equipment table pagination ──────────────────────────
  readonly tablePage     = signal(0);
  readonly tablePageSize = signal(5);
  readonly pagedUnderutilized = computed(() =>
    paginate(this.store.underutilizedEquipment(), this.tablePage(), this.tablePageSize())
  );

  // ── Helpers ────────────────────────────────────────────────────────────
  barShortName(name: string): string {
    const map: Record<string, string> = {
      Treadmill: 'Cintas',
      'Stationary Bike': 'Bicicleta',
      'Chest Press Machine': 'Prensa',
      'Lat Pulldown Machine': 'Polea',
      Rack: 'Rack',
      Elíptica: 'Elíptica',
    };
    // "Cinta de Correr 01 · Sede X" → "Cinta de Correr 01"; the bar's tooltip keeps the full name.
    return map[name] ?? name.split(' · ')[0];
  }

  roiClass(roi: 'Bajo' | 'Medio' | 'Alto'): string {
    return roi === 'Bajo' ? 'low' : roi === 'Medio' ? 'medium' : 'high';
  }

  ticketDesc(type: TicketType): string {
    return type === TicketType.PREVENTIVE ? 'Mantenimiento preventivo' : 'Mantenimiento correctivo';
  }

  readonly kpiMenu: ContextMenuItem[] = [
    { label: 'Go to Equipment',  icon: 'fitness_center', action: () => this.router.navigate(['/equipments']) },
    { label: 'Go to Maintenance',icon: 'build',          action: () => this.router.navigate(['/maintenance']) },
    { label: 'Go to Analytics',  icon: 'bar_chart',      action: () => this.router.navigate(['/analytics']) },
  ];

  readonly tableMenu: ContextMenuItem[] = [
    { label: 'Go to Equipment',  icon: 'fitness_center', action: () => this.router.navigate(['/equipments']) },
    { label: 'Go to Maintenance',icon: 'build',          action: () => this.router.navigate(['/maintenance']) },
  ];

  readonly kanbanMenu: ContextMenuItem[] = [
    { label: 'Go to Maintenance', icon: 'build',     action: () => this.router.navigate(['/maintenance']) },
    { label: 'Go to Analytics',   icon: 'bar_chart', action: () => this.router.navigate(['/analytics']) },
  ];
}
