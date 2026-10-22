import { Routes } from '@angular/router';

export const authRoutes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./presentation/views/login/login').then(m => m.LoginComponent),
  },
  {
    path:'admin',
    loadComponent: () => import('../dashboard/presentation/views/dashboard').then(m => m.DashboardComponent),
  },
  {
    path: 'client',
    loadComponent: () =>
      import('./presentation/views/client-home/client-home.component').then(
        m => m.ClientHomeComponent
      ),
  },
  {
    path: 'profile',
    loadComponent: () =>
      import('./presentation/views/profile/profile.component').then(
        m => m.ProfileComponent
      ),
  },
];
