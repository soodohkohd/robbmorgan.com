import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { AmbientAudioService } from '../ambient-audio.service';

type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

type SpotKey =
  | 'web-apps' | 'mobile-apps' | 'novels' | 'blog'
  | 'resume'   | 'music'       | 'contact' | 'roots'
  | 'break'
  | 'sound'    // toggles ambient JSB playback (no navigation)
  | 'keyboard'; // not a destination — opens the time-of-day picker

interface Spot {
  key: SpotKey;
  label: string;
  /** Route to navigate to on click. Omit for non-navigating spots
   *  (e.g. keyboard, which opens the time-of-day picker). */
  route?: string;
  /** Polygon points string ("x,y x,y x,y x,y") in % (0-100) of the
   *  hotspot's bbox. Sharp-cornered shapes (resume paper, etc.). */
  polygon?: string;
  /** SVG path data in objectBoundingBox 0-1 units. Use for shapes
   *  with curves (rounded corners). When set, an SVG <clipPath> is
   *  generated and the button is clipped to it via clip-path: url(). */
  path?: string;
}

type CaptureState = 'idle' | 'naming' | 'capturing' | 'done';
interface CapturePoint { x: number; y: number; }

@Component({
  selector: 'app-landing',
  imports: [RouterLink],
  templateUrl: './landing.html',
  styleUrl: './landing.scss',
})
export class Landing {
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private ambient = inject(AmbientAudioService);
  /** Mirrors the service's playing signal — used by labelFor() to
   *  render OFF / ON. */
  audioPlaying = this.ambient.playing;

  sceneReady = signal(false);
  opening = signal(false);

  /* ---------- Time-of-day scene swap ----------
     05:00–10:00 → morning
     10:00–17:00 → afternoon
     17:00–21:00 → evening
     21:00–05:00 → night
     Re-checked every minute so a session that crosses a boundary
     picks up the new scene without a refresh.
  ---------------------------------------------- */
  timeOfDay = signal<TimeOfDay>(this.timeOfDayFor(new Date().getHours()));

  /* ---------- Scene picker (keyboard hotspot) ----------
     When open, the user can preview any time-of-day. Closing restores
     the scene to the live local-time variant. */
  pickerOpen = signal(false);
  pickerSelection = signal<TimeOfDay | null>(null);

  readonly timeOptions: readonly { label: string; value: TimeOfDay }[] = [
    { label: 'Morning', value: 'morning'   },
    { label: 'Mid-day', value: 'afternoon' },
    { label: 'Evening', value: 'evening'   },
    { label: 'Night',   value: 'night'     },
  ];

  /** Active time-of-day driving the scene image. Picker selection wins
   *  if open; otherwise falls back to local time. */
  activeTime = computed<TimeOfDay>(() => this.pickerSelection() ?? this.timeOfDay());
  sceneSrc = computed(() => `/desk-scene-${this.activeTime()}.png`);

  constructor() {
    if (typeof window !== 'undefined') {
      // Pre-populate the buffer so the monitor starts mid-session
      // instead of typing in from empty.
      this.codeBuffer.set(this.codeSource);

      // Time-of-day refresh every minute
      const todId = window.setInterval(() => {
        this.timeOfDay.set(this.timeOfDayFor(new Date().getHours()));
      }, 60_000);
      this.destroyRef.onDestroy(() => clearInterval(todId));

      // Monitor typewriter — one char every codeTickMs, looping
      // through codeSource forever. Buffer trimmed so the rendered
      // <pre> doesn't grow without bound.
      const typeId = window.setInterval(() => this.tickTypewriter(), this.codeTickMs);
      this.destroyRef.onDestroy(() => clearInterval(typeId));

      // Random iPhone notification scheduler. Notifications only
      // exist on the desk view — leaving the landing page destroys
      // this component, which clears the pending timeout, hides the
      // banner (signal is gone with the component), and silences any
      // in-flight chime via the cleanup below. Returning to the desk
      // restarts a fresh schedule via this constructor.
      this.scheduleNextNotification(true);
      this.destroyRef.onDestroy(() => {
        if (this.notificationTimeoutId !== undefined) {
          clearTimeout(this.notificationTimeoutId);
        }
        if (this.notificationSound) {
          this.notificationSound.pause();
          this.notificationSound.currentTime = 0;
        }
      });

      // Auto-start the ambient JSB music 3s after page load — but
      // only on desktop. Mobile users get the cinematic scene strip
      // without auto-playing audio (matches the mobile breakpoint
      // used in landing.scss: 759px).
      const isMobile = window.matchMedia('(max-width: 759px)').matches;
      if (!isMobile) {
        const audioStartId = window.setTimeout(() => this.ambient.autoStart(), 3000);
        this.destroyRef.onDestroy(() => clearTimeout(audioStartId));
      }
    }
  }

  /** Play the message-arrival chime. Lazy-creates the audio so it's
   *  only loaded if needed; volume tuned modest. Autoplay may be
   *  blocked on the very first scheduled fire if the user hasn't
   *  interacted with the page yet — falls silent in that case. */
  private playNotificationSound(): void {
    if (typeof window === 'undefined') return;
    if (!this.notificationSound) {
      this.notificationSound = new Audio('/music/message.mp3');
      this.notificationSound.preload = 'auto';
      this.notificationSound.volume = 0.55;
    }
    this.notificationSound.currentTime = 0;
    this.notificationSound.play().catch(() => { /* autoplay blocked */ });
  }

  private scheduleNextNotification(isFirst = false): void {
    // First notification 15-30s after page load; recurring every
    // 45-90s thereafter.
    const delay = isFirst
      ? 15_000 + Math.random() * 15_000
      : 45_000 + Math.random() * 45_000;
    this.notificationTimeoutId = window.setTimeout(() => {
      this.notificationVisible.set(true);
      this.playNotificationSound();

      // 1s fade-in + 3s fully visible = 4s before triggering the
      // fade-out (which itself takes 1s per the CSS transition).
      this.notificationTimeoutId = window.setTimeout(() => {
        this.notificationVisible.set(false);
        this.scheduleNextNotification();
      }, 4000);
    }, delay);
  }

  /** Toggle ambient playback via the root-scoped service so the
   *  state persists across route navigation and tab refresh. */
  toggleSound(): void {
    this.ambient.toggle();
  }

  /** Dynamic label for state-driven hotspots (currently just sound).
   *  For sound, the label shows the ACTION the click will perform —
   *  "OFF" when music is playing (click will pause), "ON" when
   *  paused (click will start). The pulsing glow already conveys
   *  current state. */
  labelFor(spot: Spot): string {
    if (spot.key === 'sound') return this.audioPlaying() ? 'OFF' : 'ON';
    return spot.label;
  }

  private tickTypewriter(): void {
    const ch = this.codeSource[this.codeCursor];
    this.codeBuffer.update(buf => {
      let next = buf + ch;
      if (next.length > this.codeMaxBuffer) {
        next = next.substring(next.length - this.codeMaxBuffer);
      }
      return next;
    });
    this.codeCursor = (this.codeCursor + 1) % this.codeSource.length;
  }

  private timeOfDayFor(hour: number): TimeOfDay {
    if (hour >= 5  && hour < 10) return 'morning';
    if (hour >= 10 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  }

  /** Append ?debug=1 to the URL to make all overlays visible + show a
   *  mouse-coord readout and the polygon-capture panel. */
  debug = signal(
    typeof location !== 'undefined' && /[?&]debug(=|&|$)/.test(location.search)
  );

  mouseX = signal(0);
  mouseY = signal(0);

  /* ---------- Ambient JSB playback ----------
     State lives in AmbientAudioService (providedIn: 'root') so it
     survives route changes. The service mirrors playing to
     sessionStorage so a tab refresh tries to resume. */

  /* ---------- iPhone "New Message" overlay ----------
     Single pre-rendered notification image that fades in/out at
     random intervals over the iPhone screen. */
  notificationVisible = signal(false);
  private notificationTimeoutId?: number;
  private notificationSound?: HTMLAudioElement;

  /* ---------- Monitor "Claude Code session" overlay ----------
     Cycles through a fake Claude Code chat one char at a time. The
     source ends with an empty "> " prompt and starts with the next
     user-prompt text (no leading "> "), so when the cursor wraps
     back to 0 the boundary reads as a fresh user message — the
     loop is invisible. Everything in the monitor is blurred via
     CSS so the specific text isn't readable but the structure
     (prompts, tool uses, responses) reads clearly. */
  codeBuffer = signal<string>('');
  private codeCursor = 0;
  private readonly codeTickMs = 65;
  private readonly codeMaxBuffer = 3000;
  /* Source ends with "> " (space, no newline) so the loop boundary
     reads as a fresh user prompt on the same line as the waiting
     "> " marker. */
  private readonly codeSource = (`add a steam animation to the coffee mug

I'll add CSS-based steam wisps that rise and fade above the hotspot. Let me check the current scene structure first.

● Read(landing.html)
  Reading code/src/app/landing/landing.html...

● Read(styles.scss)
  Reading code/src/styles.scss...

I see where the break hotspot covers the mug. I'll add a container with eight puffs that rise via @keyframes and use negative animation-delays so the column never has gaps.

● Edit(landing.html)
  Adding .coffee-steam container with eight puff spans

● Edit(styles.scss)
  Defining puff-rise keyframes and per-puff offsets

● Bash(npm run build)
  ✓ Application bundle generated.

Build clean. Steam is in. Want to deploy?

> yes

● Bash(TERM=xterm ./deploy.sh)
  🔧 Building Angular app...
  📦 Zipping build output...
     → /tmp/robbmorgan-com.zip (96M)
  ⚙️  Ensuring SPA-fallback startup command...
     ✓ already set
  🚀 Deploying zip to Azure App Service...
     Polling status...
     Status: Build successful. Time: 0(s)
     Status: Site started successfully. Time: 63(s)
  ✅ Deployment complete!

Live at https://robbmorgan.com. Steam visible after cache refresh.

> can it look billowier?

Sure. I'll increase scale-X growth and add horizontal drift to each puff so they billow outward as they rise.

● Edit(styles.scss)
  Adjusting puff-rise keyframes for billow effect

● Bash(npm run build)
  ✓ Build complete.

> deploy

● Bash(TERM=xterm ./deploy.sh)
  ✅ Deployment complete!

> now add a typewriter to the monitor

I'll position a <pre> over the web-apps hotspot and feed it characters via a setInterval tick. Auto-scroll comes from a bottom-anchored flex container.

● Edit(landing.ts)
  Adding codeBuffer signal, codeSource string, tickTypewriter method

● Edit(landing.html)
  Adding .monitor-code overlay above the hotspot

● Edit(styles.scss)
  Positioning monitor-code over the web-apps bbox + clip-path

● Bash(npm run build)
  ✓ Application bundle generated.

The monitor should show a typing session now. Hot reload picks it up.

> deploy

● Bash(TERM=xterm ./deploy.sh)
  ✅ Deployment complete!

>
`).trim() + ' ';

  /* ---------- Debug hotspot edit panel ----------
     Clicking a hotspot in debug mode opens the edit panel for that
     spot instead of navigating. From there the user can Update
     (re-capture the polygon) or Delete (hide the spot from this
     session — the actual entry in spots[] still needs to be
     removed from code). */
  editingSpot = signal<Spot | null>(null);
  deletedSpotKeys = signal<ReadonlySet<SpotKey>>(new Set<SpotKey>());

  /** Spots filtered by the session's deletedSpotKeys — what the
   *  scene actually renders. */
  visibleSpots = computed<readonly Spot[]>(() => {
    const deleted = this.deletedSpotKeys();
    return this.spots.filter(s => !deleted.has(s.key));
  });

  /* ---------- Polygon capture (debug only) ---------- */
  captureState = signal<CaptureState>('idle');
  captureName = signal('');
  capturePoints = signal<CapturePoint[]>([]);

  /** Polygon points formatted for the live preview SVG (image-% units). */
  capturePointsForSvg = computed(() =>
    this.capturePoints().map(p => `${p.x},${p.y}`).join(' ')
  );

  /** Copy-pasteable summary of the captured polygon. */
  captureOutput = computed(() => {
    const pts = this.capturePoints();
    const name = (this.captureName().trim() || 'new-spot');
    if (pts.length === 0) return '';

    const fmt = (n: number) => (Math.round(n * 10) / 10).toFixed(1);
    const xs = pts.map(p => p.x);
    const ys = pts.map(p => p.y);
    const left = Math.min(...xs);
    const top = Math.min(...ys);
    const right = Math.max(...xs);
    const bottom = Math.max(...ys);
    const width = right - left;
    const height = bottom - top;

    const relPts = pts.map(p => ({
      x: width  > 0 ? ((p.x - left) / width)  * 100 : 0,
      y: height > 0 ? ((p.y - top)  / height) * 100 : 0,
    }));

    const polygonStr = relPts.map(p => `${fmt(p.x)},${fmt(p.y)}`).join(' ');
    const clipPathLines = relPts.map((p, i) =>
      `    ${fmt(p.x)}% ${fmt(p.y)}%${i < relPts.length - 1 ? ',' : ''}`
    ).join('\n');

    return [
      `key:    ${name}`,
      `points: ${pts.length}`,
      ``,
      `Image-% corners:`,
      ...pts.map((p, i) => `  ${i + 1}. (${fmt(p.x)}, ${fmt(p.y)})`),
      ``,
      `Bbox:`,
      `  left:   ${fmt(left)}%`,
      `  top:    ${fmt(top)}%`,
      `  width:  ${fmt(width)}%`,
      `  height: ${fmt(height)}%`,
      ``,
      `Polygon (% of bbox) — for spots[].polygon:`,
      `  ${polygonStr}`,
      ``,
      `CSS clip-path:`,
      `  polygon(`,
      clipPathLines,
      `  );`,
    ].join('\n');
  });

  /* Array order drives the mobile-nav stack order; desktop hotspots
     are positioned by clip-path coords so reordering is visual-only
     for mobile. Keep `keyboard` last — it's special (no route, no
     mobile entry, opens the scene picker overlay). */
  readonly spots: readonly Spot[] = [
    {
      key: 'resume',
      label: 'Resume',
      route: '/resume',
      polygon: '0,21.5 65.8,0 100,64.4 21.0,100',
    },
    {
      key: 'web-apps',
      label: 'Code',
      route: '/web-apps',
      polygon: '0,0.3 100,0 100,98.7 1.0,100',
    },
    {
      key: 'mobile-apps',
      label: 'Mobile Apps',
      route: '/mobile-apps',
      // Rounded-corner quad (iPhone-style). objectBoundingBox 0-1
      // units; corner radius ~0.05.
      path: 'M 0.290,0.047 Q 0.306,0 0.356,0.006 L 0.950,0.080 Q 1,0.086 0.991,0.135 L 0.838,0.951 Q 0.829,1 0.779,0.993 L 0.050,0.889 Q 0,0.882 0.016,0.835 Z',
    },
    {
      key: 'roots',
      label: 'Certs',
      route: '/certs',
      // Terracotta pot on the left edge of the desk. 21-vertex shape.
      polygon: '23.3,98.4 17.8,92.2 3.3,38.0 0,35.7 1.1,9.3 10.0,15.5 20.0,17.8 32.2,20.2 45.6,19.4 56.7,17.8 72.2,14.7 87.8,9.3 100,0 100,24.8 95.6,29.5 86.7,84.5 81.1,91.5 70.0,96.9 58.9,98.4 45.6,100 34.4,100',
    },
    {
      key: 'novels',
      label: 'Novels',
      route: '/novels',
      // Full book-stack silhouette walking the outer perimeter:
      // top face of top book + front faces of all three books,
      // joined along their shared edges. 14 vertices, clockwise.
      polygon: '26.6,0 100,10.7 93.0,28.4 91.6,49.8 93.0,52.7 92.5,74.5 93.9,79.0 92.5,100 0,81.5 0.5,60.9 3.3,59.3 4.2,37.4 7.0,35.0 8.4,15.2',
    },
    {
      key: 'blog',
      label: 'Thoughts',
      route: '/blog',
      polygon: '0,0 66.4,2.6 100,94.3 24.8,100',
    },
    {
      key: 'music',
      label: 'Music',
      route: '/music',
      // Vintage radio: top corners rounded more (Q curves with
      // ~15px pixel-equivalent radius — gives a circular look
      // despite the bbox being much wider than tall), bottom sharp.
      path: 'M 0.002,0.523 Q 0,0.333 0.050,0.316 L 0.933,0.017 Q 0.983,0 0.988,0.189 L 1,0.595 L 0.006,1 Z',
    },
    {
      key: 'break',
      label: 'Take a Break',
      route: '/photos',
      // Coffee mug / drink on the right side of the desk. Routes to
      // the SoCal coastline photo gallery. 13-vertex shape.
      polygon: '2.5,0 17.3,5.4 39.5,11.4 64.2,12.8 82.7,10.7 100,5.4 90.1,85.9 84.0,94.0 70.4,98.7 50.6,100 28.4,96.6 11.1,91.9 0,83.2',
    },
    {
      key: 'contact',
      label: 'Contact',
      route: '/contact',
      // Skewed picture frame on the desk.
      polygon: '0,10.3 79.8,0 100,85.1 17.3,100',
    },
    {
      key: 'keyboard',
      label: 'Scenes',
      // No route — clicking opens the time-of-day picker overlay.
      polygon: '1.2,8.8 92.3,0 100,87.3 0,100',
    },
    {
      key: 'sound',
      label: 'OFF',
      // No route — clicking toggles ambient JSB playback. 16-vertex
      // circular polygon so the click target hugs the round button.
      // Label is rendered dynamically (OFF / ON) via labelFor().
      polygon: '50,0 69.1,3.8 85.4,14.6 96.2,30.9 100,50 96.2,69.1 85.4,85.4 69.1,96.2 50,100 30.9,96.2 14.6,85.4 3.8,69.1 0,50 3.8,30.9 14.6,14.6 30.9,3.8',
    },
  ];

  open(route: string): void {
    if (this.opening()) return;
    this.opening.set(true);
    const reduced = typeof matchMedia === 'function'
      && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const delay = reduced ? 0 : 380;
    setTimeout(() => this.router.navigateByUrl(route), delay);
  }

  /** Hotspot click router: navigate for routed spots, toggle the
   *  picker for the keyboard. In debug mode, never navigates —
   *  opens the edit panel for the clicked spot instead (so the
   *  developer can re-capture or hide the hotspot). */
  onSpotClick(spot: Spot): void {
    if (this.debug()) {
      // While the user is mid-capture, swallow hotspot clicks so the
      // corner-placement click on the scene takes effect instead.
      if (this.captureState() === 'capturing') return;
      this.editingSpot.set(spot);
      return;
    }
    if (spot.key === 'keyboard') {
      if (this.pickerOpen()) this.closePicker();
      else this.pickerOpen.set(true);
      return;
    }
    if (spot.key === 'sound') {
      this.toggleSound();
      return;
    }
    if (spot.route) this.open(spot.route);
  }

  /** "Update" from the edit panel — hides the spot for the session
   *  and kicks the capture flow off with the spot's key pre-filled
   *  so the developer can recapture the polygon. */
  startUpdateEdit(): void {
    const spot = this.editingSpot();
    if (!spot) return;
    this.deletedSpotKeys.update(s => new Set([...s, spot.key]));
    this.captureName.set(spot.key);
    this.capturePoints.set([]);
    this.captureState.set('naming');
    this.editingSpot.set(null);
  }

  /** "Delete" from the edit panel — hides the spot for the session.
   *  The entry in spots[] still needs to be removed from code. */
  deleteEditingSpot(): void {
    const spot = this.editingSpot();
    if (!spot) return;
    this.deletedSpotKeys.update(s => new Set([...s, spot.key]));
    this.editingSpot.set(null);
  }

  cancelEditSpot(): void {
    this.editingSpot.set(null);
  }

  setPickerSelection(value: TimeOfDay): void {
    this.pickerSelection.set(value);
  }

  /** Mobile tap-to-cycle: advances activeTime through the four scenes
   *  in timeOptions order, wrapping at the end. Starts from whatever
   *  the current activeTime is (local-time variant or last-picked). */
  cycleScene(): void {
    const current = this.activeTime();
    const idx = this.timeOptions.findIndex(o => o.value === current);
    const next = this.timeOptions[(idx + 1) % this.timeOptions.length].value;
    this.pickerSelection.set(next);
  }

  closePicker(): void {
    this.pickerOpen.set(false);
    this.pickerSelection.set(null);
  }

  onSceneMouseMove(ev: MouseEvent): void {
    if (!this.debug()) return;
    const el = ev.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const x = ((ev.clientX - rect.left) / rect.width) * 100;
    const y = ((ev.clientY - rect.top) / rect.height) * 100;
    this.mouseX.set(Math.round(x * 10) / 10);
    this.mouseY.set(Math.round(y * 10) / 10);
  }

  onSceneClick(ev: MouseEvent): void {
    if (this.captureState() !== 'capturing') return;
    const el = ev.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const x = ((ev.clientX - rect.left) / rect.width) * 100;
    const y = ((ev.clientY - rect.top) / rect.height) * 100;
    this.capturePoints.update(pts => [...pts, {
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
    }]);
  }

  startCapture(): void {
    this.captureState.set('naming');
    this.captureName.set('');
    this.capturePoints.set([]);
  }

  beginCapturing(): void {
    if (!this.captureName().trim()) return;
    this.captureState.set('capturing');
    this.capturePoints.set([]);
  }

  stopCapture(): void {
    if (this.capturePoints().length < 3) return;
    this.captureState.set('done');
  }

  undoLastPoint(): void {
    this.capturePoints.update(pts => pts.slice(0, -1));
  }

  resetCapture(): void {
    this.captureState.set('idle');
    this.captureName.set('');
    this.capturePoints.set([]);
  }

  async copyOutput(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.captureOutput());
    } catch {
      /* clipboard may be unavailable; output is also visible in the panel. */
    }
  }
}
