import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AlertsStore } from '../../../application/alerts.store';
import { AppAlert } from '../../../application/alerts.service';

@Component({
  selector: 'app-alert-detail',
  standalone: true,
  imports: [CommonModule, MatIconModule, TranslateModule, RouterLink],
  templateUrl: './alert-detail.component.html',
  styleUrl: './alert-detail.component.scss',
})
export class AlertDetailComponent {
  private route     = inject(ActivatedRoute);
  private router    = inject(Router);
  private translate = inject(TranslateService);
  readonly store    = inject(AlertsStore);

  get alert(): AppAlert | undefined {
    const id = this.route.snapshot.paramMap.get('id');
    return this.store.alerts().find(a => a.id === id);
  }

  resolveTitle(alert: AppAlert): string {
    return alert.titleKey ? this.translate.instant(alert.titleKey) : (alert.title ?? '');
  }

  resolveDescription(alert: AppAlert): string {
    return alert.descriptionKey ? this.translate.instant(alert.descriptionKey) : (alert.description ?? '');
  }

  dismiss(id: string): void {
    this.store.deleteAlert(id);
    this.router.navigate(['/alerts']);
  }

  navigateTo(route: string): void {
    if (route) this.router.navigate([route]);
  }
}
