import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { Meta } from '@angular/platform-browser';
import {
  NavigationEnd,
  provideRouter,
  Router,
  withInMemoryScrolling,
} from '@angular/router';
import { filter } from 'rxjs/operators';
import { ApplicationInsights } from '@microsoft/applicationinsights-web';
import { AngularPlugin } from '@microsoft/applicationinsights-angularplugin-js';

import { routes } from './app.routes';

const SITE_ORIGIN = 'https://robbmorgan.com';
const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/desk-scene-afternoon.png`;

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
    // Route-aware <meta> + OG/Twitter card updater. The defaults baked
    // into index.html cover scrapers that don't execute JS (most older
    // crawlers); this updater handles the in-app SPA navigations and
    // modern crawlers (LinkedIn 2024+, Slack, Discord) that do execute
    // JS before reading the head. Each route's description comes from
    // `data.description` defined in app.routes.ts.
    provideAppInitializer(() => {
      if (typeof window === 'undefined') return;
      const router = inject(Router);
      const meta = inject(Meta);

      router.events
        .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
        .subscribe((event) => {
          // Walk to the deepest activated child to find its data.
          let route = router.routerState.snapshot.root;
          while (route.firstChild) route = route.firstChild;
          const description =
            (route.data?.['description'] as string | undefined) ??
            'Robb Morgan — writer, builder. Resume, novels, code, mobile apps, music, photos, and field notes from three decades in technology.';
          const url = `${SITE_ORIGIN}${event.urlAfterRedirects}`;
          const title = document.title;

          meta.updateTag({ name: 'description', content: description });
          meta.updateTag({ property: 'og:title', content: title });
          meta.updateTag({ property: 'og:description', content: description });
          meta.updateTag({ property: 'og:url', content: url });
          meta.updateTag({ property: 'og:image', content: DEFAULT_OG_IMAGE });
          meta.updateTag({ name: 'twitter:title', content: title });
          meta.updateTag({ name: 'twitter:description', content: description });
          meta.updateTag({ name: 'twitter:image', content: DEFAULT_OG_IMAGE });

          // Canonical link — Angular's Meta service doesn't manage <link>,
          // so we patch the existing element directly.
          const canonical = document.querySelector('link[rel="canonical"]');
          if (canonical) canonical.setAttribute('href', url);
        });
    }),
  ],
};
