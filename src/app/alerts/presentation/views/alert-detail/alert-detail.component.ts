import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { AlertsStore } from '../../../application/alerts.store';
import { AppAlert } from '../../../application/alerts.service';
import { AlertReaderComponent } from '../../components/alert-reader/alert-reader';

/** Full-page alert view; small screens open alerts here instead of the inbox reading pane. */
@Component({
  selector: 'app-alert-detail',
  standalone: true,
  imports: [MatIconModule, TranslateModule, RouterLink, AlertReaderComponent],
  templateUrl: './alert-detail.component.html',
  styleUrl: './alert-detail.component.scss',
})
export class AlertDetailComponent {
  private route  = inject(ActivatedRoute);
  private router = inject(Router);
  readonly store = inject(AlertsStore);

  get alert(): AppAlert | undefined {
    const id = this.route.snapshot.paramMap.get('id');
    return this.store.alerts().find(a => a.id === id);
  }

  dismiss(alert: AppAlert): void {
    this.store.deleteAlert(alert.id);
    this.router.navigate(['/alerts']);
  }

  navigateTo(alert: AppAlert): void {
    if (alert.targetRoute) this.router.navigate([alert.targetRoute]);
  }
}
