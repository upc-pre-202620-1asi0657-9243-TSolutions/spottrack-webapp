export class NotificationPreferences {
  private _notifyOnCritical: boolean;
  private _notifyOnWarning: boolean;
  private _notificationEmail: string | null;

  constructor(props: {
    notifyOnCritical: boolean;
    notifyOnWarning: boolean;
    notificationEmail: string | null;
  }) {
    this._notifyOnCritical = props.notifyOnCritical;
    this._notifyOnWarning = props.notifyOnWarning;
    this._notificationEmail = props.notificationEmail;
  }

  get notifyOnCritical(): boolean { return this._notifyOnCritical; }
  get notifyOnWarning(): boolean { return this._notifyOnWarning; }
  get notificationEmail(): string | null { return this._notificationEmail; }
}
