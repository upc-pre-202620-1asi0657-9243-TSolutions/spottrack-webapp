import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { jwtInterceptor } from './auth/infrastructure/jwt.interceptor';
import { httpErrorInterceptor } from './auth/infrastructure/http-error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([jwtInterceptor, httpErrorInterceptor])),
    provideTranslateService({
      defaultLanguage: 'en',
      useDefaultLang: true,
      fallbackLang: 'es',
      loader: provideTranslateHttpLoader({
        prefix: '/i18n/',
        suffix: '.json'
      })

    }),

  ]
};
