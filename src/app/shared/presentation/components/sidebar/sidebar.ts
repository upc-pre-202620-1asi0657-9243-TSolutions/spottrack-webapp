import { Component, HostBinding, Input, Output, EventEmitter, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { AuthStore } from '../../../../auth/application/auth.store';
import { NgOptimizedImage } from '@angular/common';

// Exportamos la interfaz para evitar errores en WebStorm
export interface NavItem {
  path: string;
  icon: string;
  labelKey: string;
}

const ADMIN_NAV: NavItem[] = [
  { path: '/dashboard', icon: 'home', labelKey: 'nav.dashboard' },
  { path: '/equipments', icon: 'fitness_center', labelKey: 'nav.equipment' },
  { path: '/iot', icon: 'sensors', labelKey: 'nav.iot' },
  { path: '/maintenance', icon: 'build', labelKey: 'nav.maintenance' },
  { path: '/analytics', icon: 'bar_chart', labelKey: 'nav.analytics' },
  { path: '/financial-impact', icon: 'attach_money', labelKey: 'nav.financial' }, // <-- AQUÍ ESTÁ EL BOTÓN AÑADIDO
//  { path: '/alerts', icon: 'notifications', labelKey: 'nav.alerts' },
  { path: '/settings', icon: 'settings', labelKey: 'nav.settings' },
];

const CLIENT_NAV: NavItem[] = [
  { path: '/client', icon: 'home', labelKey: 'nav.dashboard' },
  { path: '/map', icon: 'map', labelKey: 'nav.map' },
  { path: '/routines', icon: 'fitness_center', labelKey: 'nav.routines' },
  { path: '/bookings', icon: 'event_available', labelKey: 'nav.bookings' }, // Nota: si quitaste las reservas del proyecto, capaz luego te toque comentar esta línea también.
  { path: '/profile', icon: 'person', labelKey: 'nav.profile' },
];

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MatIconModule, TranslateModule, NgOptimizedImage],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {
  private authStore = inject(AuthStore);

  navItems: NavItem[] = ADMIN_NAV;

  @Input()
  set role(value: 'admin' | 'client') {
    this.navItems = value === 'admin' ? ADMIN_NAV : CLIENT_NAV;
  }

  @Input() @HostBinding('class.open') open = false;

  @Output() linkClicked = new EventEmitter<void>();
}
