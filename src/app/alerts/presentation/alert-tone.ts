import { AppAlert } from '../application/alerts.service';

export type AlertTone = 'critical' | 'warning' | 'info';

/** Backend alerts carry a severity; locally generated ones (e.g. reservation expiry) are informational. */
export function alertTone(alert: AppAlert): AlertTone {
  if (alert.severity === 'CRITICAL') return 'critical';
  if (alert.severity === 'WARNING') return 'warning';
  return 'info';
}
