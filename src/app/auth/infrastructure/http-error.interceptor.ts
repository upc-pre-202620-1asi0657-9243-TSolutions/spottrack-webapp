import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthStore } from '../application/auth.store';
import { MembershipAccessService } from '../../shared/application/membership-access.service';

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth             = inject(AuthStore);
  const router           = inject(Router);
  const membershipAccess = inject(MembershipAccessService);

  return next(req).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse) {
        if (err.status === 401 && auth.token()) {
          // Token was present but the server rejected it — session has expired.
          // handleExpiredSession() clears storage and sets the login-page banner;
          // navigation is done here so the interceptor owns the redirect, not the store.
          auth.handleExpiredSession();
          router.navigate(['/login']);

        } else if (err.status === 403) {
          // Backend shape: { code: "FORBIDDEN", message: "...", details: "<error-key>" }
          // Membership access codes live in `details`; all other 403s fall through.
          const details = (err.error?.details ?? '') as string;
          if (details.startsWith('membership.error.access.')) {
            membershipAccess.handleAccessDenied(details);
          }
        }
      }

      // Always re-throw so individual store catchError handlers still receive the error
      // and can update their own errorSignal for non-intercepted cases.
      return throwError(() => err);
    })
  );
};
