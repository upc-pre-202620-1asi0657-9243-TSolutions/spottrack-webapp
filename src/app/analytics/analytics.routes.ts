import { Routes } from '@angular/router';

export const analyticsRoutes: Routes = [
  {
    path: 'analytics',
    loadComponent: () =>
      import('./presentation/views/analytics').then(m => m.AnalyticsComponent),
  },
  {
    path: 'financial-impact',
    loadComponent: () =>
      import('./presentation/views/financial-impact/financial-impact.component').then(
        m => m.FinancialImpactComponent
      ),
  },
];
