import { Routes } from '@angular/router';

export const monitoringRoutes: Routes = [
  {
    path: 'monitoring/sensors',
    loadComponent: () =>
      import('./presentation/views/sensor-registration/sensor-registration').then(
        m => m.SensorRegistrationComponent
      ),
  },
  {
    path: 'monitoring/anomalies/report',
    loadComponent: () =>
      import('./presentation/views/anomaly-report/anomaly-report').then(
        m => m.AnomalyReportComponent
      ),
  },
];
