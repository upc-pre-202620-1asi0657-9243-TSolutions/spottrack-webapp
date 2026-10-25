import { Component, effect, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { NotificationPreferencesStore } from '../../application/notification-preferences.store';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [FormsModule, TranslateModule, MatIconModule],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
})
export class SettingsComponent {
  readonly notificationPreferencesStore = inject(NotificationPreferencesStore);

  notifyOnCritical = true;
  notifyOnWarning = true;
  notificationEmailInput = '';

  constructor() {
    // Seed the editable draft fields once the real preferences load.
    effect(() => {
      const prefs = this.notificationPreferencesStore.preferences();
      if (prefs) {
        this.notifyOnCritical = prefs.notifyOnCritical;
        this.notifyOnWarning = prefs.notifyOnWarning;
        this.notificationEmailInput = prefs.notificationEmail ?? '';
      }
    });
  }

  saveNotificationPreferences(): void {
    const email = this.notificationEmailInput.trim();
    this.notificationPreferencesStore.save(this.notifyOnCritical, this.notifyOnWarning, email || null);
  }
}
