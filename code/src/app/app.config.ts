import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, Router, withInMemoryScrolling } from '@angular/router';
import { ApplicationInsights } from '@microsoft/applicationinsights-web';
import { AngularPlugin } from '@microsoft/applicationinsights-angularplugin-js';

import { routes } from './app.routes';

/**
 * Azure Application Insights — public client-side connection string. The
 * Instrumentation Key is intentionally exposed (every browser request to
 * the ingestion endpoint carries it). Server-side metrics are already
 * captured by the App Service; this enables page views, sessions, and
 * device/geo telemetry from the SPA.
 */
const APP_INSIGHTS_CONNECTION_STRING =
  'InstrumentationKey=bc9f7c51-8155-4067-921c-5e998f615721;' +
  'IngestionEndpoint=https://westus-0.in.applicationinsights.azure.com/;' +
  'LiveEndpoint=https://westus.livediagnostics.monitor.azure.com/;' +
  'ApplicationId=dfd862f3-d17f-4224-a4e1-398193189e7f';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      // Scroll to top on forward navigation; restore prior position on
      // back/forward (browser history) — matches native-app expectation.
      withInMemoryScrolling({
        scrollPositionRestoration: 'enabled',
        anchorScrolling: 'enabled',
      }),
    ),
    provideAppInitializer(() => {
      if (typeof window === 'undefined') return;

      const router = inject(Router);
      const angularPlugin = new AngularPlugin();
      const appInsights = new ApplicationInsights({
        config: {
          connectionString: APP_INSIGHTS_CONNECTION_STRING,
          extensions: [angularPlugin],
          extensionConfig: {
            [angularPlugin.identifier]: { router },
          },
          // The Angular plugin handles route changes; disable the default
          // history-API auto-tracking to avoid duplicate page views.
          enableAutoRouteTracking: false,
        },
      });
      appInsights.loadAppInsights();
    }),
  ],
};
