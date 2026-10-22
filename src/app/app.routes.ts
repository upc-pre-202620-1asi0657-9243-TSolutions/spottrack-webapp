 import { Routes } from '@angular/router';
import { Layout } from './shared/presentation/components/layout/layout';
import { equipmentRoutes } from './gym/presentation/views/equipment.routes';
import { analyticsRoutes } from './analytics/analytics.routes';
import { monitoringRoutes } from './monitoring/monitoring.routes';
import { membershipRoutes } from './membership/membership.routes';
import { alertsRoutes } from './alerts/alerts.routes';
import { routinesRoutes } from './routines/routines.routes';
import { reservationRoutes } from './reservation/reservation.routes';
import { authGuard, adminGuard, clientGuard, hasGymGuard, hasClientGymGuard } from './auth/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () =>
      import('./auth/presentation/views/login/login').then(m => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./auth/presentation/views/register/register').then(m => m.RegisterComponent),
  },
  {
    path: 'register/plans',
    loadComponent: () =>
      import('./auth/presentation/views/plan-selection/plan-selection').then(m => m.PlanSelectionComponent),
  },
  {
    path: 'payment/success',
    loadComponent: () =>
      import('./auth/presentation/views/payment-result/payment-success').then(m => m.PaymentSuccessComponent),
  },
  {
    path: 'payment/cancel',
    loadComponent: () =>
      import('./auth/presentation/views/payment-result/payment-cancel').then(m => m.PaymentCancelComponent),
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./auth/presentation/views/forgot-password/forgot-password').then(m => m.ForgotPasswordComponent),
  },
  {
    path: '',
    component: Layout,
    canActivate: [authGuard],
    children: [
      {
        path: 'profile',
        loadComponent: () =>
          import('./auth/presentation/views/profile/profile.component').then(
            m => m.ProfileComponent
          ),
      },

      // ── Shared routes (admin + client) ──────────────────────────────────────
      ...alertsRoutes,

      // ── Admin routes ────────────────────────────────────────────────────────
      {
        path: '',
        canMatch: [adminGuard],
        children: [
          // Accessible to admins without a gym — must stay outside hasGymGuard.
          {
            path: 'gym/create',
            loadComponent: () =>
              import('./gym/presentation/views/gym-create/gym-create').then(m => m.GymCreateComponent),
          },

          // All other admin routes require at least one gym.
          {
            path: '',
            canActivate: [hasGymGuard],
            children: [
              { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
              {
                path: 'dashboard',
                loadComponent: () =>
                  import('./dashboard/presentation/views/dashboard').then(m => m.DashboardComponent),
              },
              ...equipmentRoutes,
              {
                path: 'gym/whitelist',
                loadComponent: () =>
                  import('./gym/presentation/views/gym-whitelist/gym-whitelist').then(m => m.GymWhitelistComponent),
              },
              {
                path: 'gym/branches',
                loadComponent: () =>
                  import('./gym/presentation/views/gym-branches/gym-branches').then(m => m.GymBranchesComponent),
              },
              {
                path: 'iot',
                loadComponent: () =>
                  import('./iot/presentation/views/iot-monitoring').then(m => m.IotMonitoringComponent),
              },
              {
                path: 'maintenance',
                loadComponent: () =>
                  import('./maintenance/presentation/views/maintenance').then(m => m.MaintenanceComponent),
              },
              {
                path: 'maintenance/new-ticket',
                loadComponent: () =>
                  import('./maintenance/presentation/views/new-ticket/new-ticket').then(m => m.NewTicketComponent),
              },
              ...analyticsRoutes,
              ...monitoringRoutes,
              ...membershipRoutes,
              {
                path: 'settings',
                loadComponent: () =>
                  import('./settings/presentation/views/settings').then(m => m.SettingsComponent),
              },
            ],
          },
        ],
      },

      // ── Client routes ───────────────────────────────────────────────────────
      {
        path: '',
        canMatch: [clientGuard],
        children: [
          // Accessible to clients without an active gym — must stay outside hasClientGymGuard.
          {
            path: 'gym/associate',
            loadComponent: () =>
              import('./auth/presentation/views/gym-associate/gym-associate').then(m => m.GymAssociateComponent),
          },

          // All other client routes require an active gym association.
          {
            path: '',
            canActivate: [hasClientGymGuard],
            children: [
              { path: '', redirectTo: 'map', pathMatch: 'full' },
              {
                path: 'client',
                loadComponent: () =>
                  import('./auth/presentation/views/client-home/client-home.component').then(
                    m => m.ClientHomeComponent
                  ),
              },
              {
                path: 'map',
                loadComponent: () =>
                  import('./shared/presentation/components/map/map.component').then(m => m.MapComponent),
              },
              ...reservationRoutes,
              ...routinesRoutes,
              {
                path: 'anomalies/report',
                loadComponent: () =>
                  import('./monitoring/presentation/views/anomaly-report/anomaly-report').then(
                    m => m.AnomalyReportComponent
                  ),
              },
            ],
          },
        ],
      },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
