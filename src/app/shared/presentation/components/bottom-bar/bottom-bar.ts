import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-bottom-bar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MatIconModule, TranslateModule],
  templateUrl: './bottom-bar.html',
  styleUrl: './bottom-bar.css',
})
export class BottomBar {
  navItems = [
    { path: '/map', icon: 'map', labelKey: 'nav.map' },
    { path: '/routines', icon: 'fitness_center', labelKey: 'nav.routines' },
    { path: '/bookings', icon: 'event_available', labelKey: 'nav.reservations' },
    { path: '/profile', icon: 'person', labelKey: 'nav.profile' },
  ];
}
