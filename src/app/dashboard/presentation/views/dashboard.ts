import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { DashboardStore } from '../../application/dashboard.store';
import { TicketType } from '../../../maintenance/domain/model/maintenance-ticket.entity';
import { TranslatePipe } from '@ngx-translate/core';
import { ContextMenuDirective } from '../../../shared/presentation/directives/context-menu.directive';
import { ContextMenuItem } from '../../../shared/application/context-menu.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [MatIconModule, TranslatePipe, ContextMenuDirective],
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

  // ── Bar chart Y reference ticks ────────────────────────────────────────
  readonly barYTicks = [600, 450, 300, 150, 0];

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
    return map[name] ?? name.split(' ')[0];
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
