import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthStore } from '../application/auth.store';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const auth  = inject(AuthStore);
  const token = auth.token();
  if (token) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  return next(req);
};
