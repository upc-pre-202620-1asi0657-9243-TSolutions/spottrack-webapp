import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { TitleCasePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageSwitcher } from '../language-switcher/language-switcher';
import { Sidebar } from '../sidebar/sidebar';
import { BottomBar } from '../bottom-bar/bottom-bar';
import { AuthStore } from '../../../../auth/application/auth.store';
import { UserProfile } from '../user-profile/user-profile';
import { AlertsService } from '../../../../alerts/application/alerts.service';
import { ContextMenuComponent } from '../context-menu/context-menu.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    LanguageSwitcher,
    Sidebar,
    BottomBar,
    MatIconModule,
    MatBadgeModule,
    TranslateModule,
    UserProfile,
    ContextMenuComponent,
  ],
  templateUrl: './layout.html',
  styleUrl: './layout.css',
})
export class Layout {
  private router      = inject(Router);
  private authStore   = inject(AuthStore);
  private alertsSvc   = inject(AlertsService);

  // Role-aware badge: clients only count their own unread alerts
  readonly unreadCount = computed(() => {
    const isClient = this.authStore.isClient();
    return this.alertsSvc.alerts().filter(
      a => !a.read && (!isClient || a.type === 'client')
    ).length;
  });

  sidebarOpen = false;

  get currentRole(): 'admin' | 'client' {
    return this.authStore.isClient() ? 'client' : 'admin';
  }

  toggleSidebar() { this.sidebarOpen = !this.sidebarOpen; }
  closeSidebar()  { this.sidebarOpen = false; }

  logout() {
    this.authStore.logout();
    this.router.navigate(['/auth/login']);
  }
}
