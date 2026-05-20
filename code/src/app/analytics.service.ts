import { Injectable } from '@angular/core';
import { ApplicationInsights } from '@microsoft/applicationinsights-web';
import { AngularPlugin } from '@microsoft/applicationinsights-angularplugin-js';
import { Router } from '@angular/router';

/**
 * Thin wrapper around the Application Insights browser SDK. Owns the
 * single `ApplicationInsights` instance for the tab and exposes a
 * `track()` method that components inject and call. Centralizing this
 * means components don't deal with the SDK directly — they just emit
 * named events like `track('hotspot_click', { spot: 'monitor' })`.
 */
@Injectable({ providedIn: 'root' })
export class Analytics {
  private appInsights?: ApplicationInsights;

  /** Initialize the SDK. Called once from app.config.ts at app boot. */
  init(connectionString: string, router: Router): void {
    if (typeof window === 'undefined') return;
    const angularPlugin = new AngularPlugin();
    this.appInsights = new ApplicationInsights({
      config: {
        connectionString,
        extensions: [angularPlugin],
        extensionConfig: {
          [angularPlugin.identifier]: { router },
        },
        // The Angular plugin handles route changes; disable the default
        // history-API auto-tracking to avoid duplicate page views.
        enableAutoRouteTracking: false,
      },
    });
    this.appInsights.loadAppInsights();
  }

  /** Emit a custom event. Properties show up in App Insights as
   *  `customEvents | where name == "..."` rows with the props as
   *  `customDimensions`. Silently no-ops if init hasn't run (SSR,
   *  ad-blockers that gut the SDK, etc.) — instrumentation never
   *  blocks the user. */
  track(name: string, properties?: Record<string, string | number | boolean>): void {
    this.appInsights?.trackEvent({ name }, properties);
  }
}
