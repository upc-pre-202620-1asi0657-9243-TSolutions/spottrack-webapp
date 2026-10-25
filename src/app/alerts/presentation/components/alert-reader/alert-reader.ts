import { Component, computed, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AppAlert } from '../../../application/alerts.service';
import { alertTone } from '../../alert-tone';

/** The full view of one alert: used by the inbox reading pane and the alert page. */
@Component({
  selector: 'app-alert-reader',
  standalone: true,
  imports: [CommonModule, MatIconModule, TranslateModule],
  templateUrl: './alert-reader.html',
  styleUrl: './alert-reader.scss',
})
export class AlertReaderComponent {
  private readonly translate = inject(TranslateService);

  readonly alert = input.required<AppAlert>();

  readonly deleted = output<AppAlert>();
  readonly opened  = output<AppAlert>();

  readonly tone = computed(() => alertTone(this.alert()));

  readonly title = computed(() => {
    const a = this.alert();
    return a.titleKey ? this.translate.instant(a.titleKey) : (a.title ?? '');
  });

  readonly description = computed(() => {
    const a = this.alert();
    return a.descriptionKey ? this.translate.instant(a.descriptionKey) : (a.description ?? '');
  });
}
