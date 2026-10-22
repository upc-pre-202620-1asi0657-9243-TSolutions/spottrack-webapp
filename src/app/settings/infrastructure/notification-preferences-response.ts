export interface NotificationPreferencesResource {
  notifyOnCritical: boolean;
  notifyOnWarning: boolean;
  notificationEmail: string | null;
}
