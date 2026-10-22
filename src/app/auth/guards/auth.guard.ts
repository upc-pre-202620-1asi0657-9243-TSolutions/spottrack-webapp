import { inject, Injector } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs';
import { AuthStore } from '../application/auth.store';
import { AdminGymStore } from '../../gym/application/admin-gym.store';
import { ActiveGymStore } from '../application/active-gym.store';

export const authGuard: CanActivateFn = () => {
  const auth   = inject(AuthStore);
  const router = inject(Router);
  if (auth.isAuthenticated()) return true;
  return router.createUrlTree(['/login']);
};

// canMatch guards: return boolean so Angular falls through to the next sibling
// route group instead of triggering a redirect loop.
export const adminGuard: CanMatchFn = () => inject(AuthStore).isAdmin();
export const clientGuard: CanMatchFn = () => inject(AuthStore).isClient();

// Redirects clients without an active gym to /gym/associate before they can
// access any client screen. Handles the async case where loadAssociations()
// is still in flight (e.g. page refresh before the first response arrives).
export const hasClientGymGuard: CanActivateFn = () => {
  const store    = inject(ActiveGymStore);
  const router   = inject(Router);
  const injector = inject(Injector);

  const check = (): true | ReturnType<typeof router.createUrlTree> =>
    !store.hasNoActiveGym() ? true : router.createUrlTree(['/gym/associate']);

  if (store.loaded() && !store.loading()) return check();
  if (!store.loading()) store.loadAssociations();

  return toObservable(store.loading, { injector }).pipe(
    filter(loading => !loading),
    take(1),
    map(check),
  );
};

// Redirects admins without a gym to /gym/create before they can access any
// admin screen. Handles the async case where load() is still in flight.
export const hasGymGuard: CanActivateFn = () => {
  const store    = inject(AdminGymStore);
  const router   = inject(Router);
  const injector = inject(Injector);

  const check = (): true | ReturnType<typeof router.createUrlTree> =>
    store.myGyms().length > 0 ? true : router.createUrlTree(['/gym/create']);

  if (store.loaded() && !store.loading()) return check();
  if (!store.loading()) store.load();

  return toObservable(store.loading, { injector }).pipe(
    filter(loading => !loading),
    take(1),
    map(check),
  );
};
