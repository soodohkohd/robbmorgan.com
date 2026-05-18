import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

type SpotKey =
  | 'web-apps' | 'mobile-apps' | 'novels' | 'blog'
  | 'resume'   | 'music'       | 'contact' | 'roots'
  | 'break'
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
      const id = window.setInterval(() => {
        this.timeOfDay.set(this.timeOfDayFor(new Date().getHours()));
      }, 60_000);
      this.destroyRef.onDestroy(() => clearInterval(id));
    }
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

  readonly spots: readonly Spot[] = [
    {
      key: 'web-apps',
      label: 'Code',
      route: '/web-apps',
      polygon: '0,0 100,0 100,96.4 0.7,100',
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
      key: 'resume',
      label: 'Resume',
      route: '/resume',
      polygon: '0,21.5 65.8,0 100,64.4 21.0,100',
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
      key: 'break',
      label: 'Take a Break',
      route: '/photos',
      // Coffee mug / drink on the right side of the desk. Routes to
      // the SoCal coastline photo gallery. 13-vertex shape.
      polygon: '2.5,0 17.3,5.4 39.5,11.4 64.2,12.8 82.7,10.7 100,5.4 90.1,85.9 84.0,94.0 70.4,98.7 50.6,100 28.4,96.6 11.1,91.9 0,83.2',
    },
    {
      key: 'roots',
      label: 'Certs',
      route: '/certs',
      // Terracotta pot on the left edge of the desk. 17-vertex shape.
      polygon: '0,10.6 13.3,19.7 27.8,20.5 47.8,18.9 68.9,16.7 87.8,11.4 100,0 97.8,27.3 93.3,32.6 83.3,89.4 64.4,98.5 50.0,100 34.4,99.2 22.2,93.9 15.6,87.1 3.3,40.9 0,40.2',
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
