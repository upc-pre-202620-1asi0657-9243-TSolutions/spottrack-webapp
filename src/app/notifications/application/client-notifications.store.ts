import { effect, inject, Injectable, untracked } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';
import { AuthStore } from '../../auth/application/auth.store';
import { AlertsService, AppAlert } from '../../alerts/application/alerts.service';
import { EquipmentStore } from '../../gym/application/equipment.store';
import { StompClient } from '../../shared/infrastructure/stomp-client';
import { ClientNotificationsApi } from '../infrastructure/client-notifications-api';
import {
  ClientNotificationMessage,
  ClientNotificationResource,
  ClientNotificationType,
} from '../infrastructure/client-notifications-response';
import { EquipmentWatchStore } from './equipment-watch.store';

/** Personal destination: the broker only delivers it to the sessions of the signed-in client. */
const USER_NOTIFICATIONS_DESTINATION = '/user/queue/notifications';

const I18N_KEY: Record<ClientNotificationType, string> = {
  EQUIPMENT_AVAILABLE:      'clientAlerts.equipmentAvailable',
  EQUIPMENT_RESTORED:       'clientAlerts.equipmentRestored',
  EQUIPMENT_OCCUPIED_AGAIN: 'clientAlerts.equipmentOccupiedAgain',
};

const ICON: Record<ClientNotificationType, string> = {
  EQUIPMENT_AVAILABLE:      'notifications_active',
  EQUIPMENT_RESTORED:       'build_circle',
  EQUIPMENT_OCCUPIED_AGAIN: 'notifications_off',
};

/**
 * Client notifications about machines (US12 / US23): the unread ones are loaded into the alert
 * inbox on login and after every STOMP (re)connect, and new ones arrive in real time on
 * {@link USER_NOTIFICATIONS_DESTINATION} and are also shown as a toast.
 */
@Injectable({ providedIn: 'root' })
export class ClientNotificationsStore {

  private readonly auth       = inject(AuthStore);
  private readonly stomp      = inject(StompClient);
  private readonly api        = inject(ClientNotificationsApi);
  private readonly alerts     = inject(AlertsService);
  private readonly equipment  = inject(EquipmentStore);
  private readonly watches    = inject(EquipmentWatchStore);
  private readonly translate  = inject(TranslateService);
  private readonly snackBar   = inject(MatSnackBar);

  constructor() {
    effect(onCleanup => {
      if (!this.auth.token() || !this.auth.isClient()) return;
      const subscription = this.stomp.watch<ClientNotificationMessage>(USER_NOTIFICATIONS_DESTINATION)
        .subscribe(message => this.onPushed(message));
      onCleanup(() => subscription.unsubscribe());
    });

    // Pushes sent while the socket was down are lost: re-read the unread ones on every (re)connect.
    effect(() => {
      const signedInClient = !!this.auth.token() && this.auth.isClient();
      const connected = this.stomp.connected();
      if (signedInClient && connected) untracked(() => this.loadUnread());
    });
  }

  private loadUnread(): void {
    this.api.getNotifications(true).subscribe({
      next: list => this.alerts.addClientNotifications(list.map(n => this.toAppAlert(n))),
      error: () => {},
    });
  }

  private onPushed(message: ClientNotificationMessage): void {
    const alert = this.toAppAlert({ ...message, read: false, readAt: null });
    this.alerts.addClientNotifications([alert]);
    if (message.type !== 'EQUIPMENT_OCCUPIED_AGAIN') this.watches.markFired(message.equipmentId);
    this.snackBar.open(alert.title ?? message.message, '✓', {
      duration: 6000, panelClass: ['routine-snackbar'],
      horizontalPosition: 'center', verticalPosition: 'top',
    });
  }

  private toAppAlert(n: ClientNotificationResource): AppAlert {
    const machine = this.equipment.equipment().find(e => e.uuid === n.equipmentId)?.name;
    const key = I18N_KEY[n.type];
    return {
      id:                   `CN-${n.id}`,
      clientNotificationId: n.id,
      equipmentId:          n.equipmentId,
      title:                machine ? this.translate.instant(`${key}.title`, { machine }) : this.translate.instant(`${key}.titleGeneric`),
      description:          machine ? this.translate.instant(`${key}.description`, { machine }) : n.message,
      type:                 'client',
      icon:                 ICON[n.type],
      date:                 new Date(n.createdAt),
      targetRoute:          '/map',
      read:                 n.read,
    };
  }
}
