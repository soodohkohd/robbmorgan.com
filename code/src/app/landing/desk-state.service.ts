import { Injectable } from '@angular/core';

/**
 * Holds Landing-component state that should survive route navigations
 * (visiting Resume / Music / etc. and coming back). `providedIn: 'root'`
 * means a single instance lives for the lifetime of the tab.
 *
 * - Monitor: codeBuffer (rendered text) + codeCursor (position in source)
 *   so the typewriter picks up where it left off.
 * - Birds: timestamps for the in-flight pass and the next scheduled
 *   pass, so the CSS animation can be resumed mid-cycle (via negative
 *   animation-delay) or the 90-120s wait timer can be honored across
 *   the round-trip.
 */
@Injectable({ providedIn: 'root' })
export class DeskStateService {
  /** Typewriter buffer (visible text in the monitor). */
  codeBuffer = '';
  /** Position in codeSource where the next char will be appended. */
  codeCursor = 0;

  /** Wall-clock ms when the current bird flight started. Cleared on end. */
  flightStartedAt?: number;
  /** Wall-clock ms when the NEXT scheduled flight should begin. */
  nextFlightAt?: number;

  /** Wall-clock ms when the next iPhone notification should fire. */
  nextNotificationAt?: number;
}
