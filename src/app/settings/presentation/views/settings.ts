import { Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { TechnicianStore } from '../../application/technician.store';
import { NotificationPreferencesStore } from '../../application/notification-preferences.store';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [FormsModule, TranslateModule, MatIconModule],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
})
export class SettingsComponent {
  readonly technicianStore = inject(TechnicianStore);
  readonly notificationPreferencesStore = inject(NotificationPreferencesStore);

  nameInput = '';
  readonly nameError = signal<string | null>(null);

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

  addTechnician(): void {
    const name = this.nameInput.trim();
    this.nameError.set(null);

    if (!name) {
      this.nameError.set('settings.technicians.error.nameRequired');
      return;
    }

    this.nameInput = '';
    this.technicianStore.createTechnician(name);
  }

  onNameInputChange(): void {
    this.nameError.set(null);
  }

  saveNotificationPreferences(): void {
    const email = this.notificationEmailInput.trim();
    this.notificationPreferencesStore.save(this.notifyOnCritical, this.notifyOnWarning, email || null);
  }
}
