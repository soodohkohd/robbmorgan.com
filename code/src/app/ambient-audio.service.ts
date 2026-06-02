import { Injectable, signal } from '@angular/core';

/**
 * Singleton ambient-music player. Outlives route navigation (it's
 * `providedIn: 'root'`) so toggling sound ON on the landing page
 * keeps playing as the user clicks into sub-pages and back.
 *
 * On the first construction of the session (i.e. when the user enters
 * the site) a random shuffled order of the tracks is generated and
 * persisted to sessionStorage — whether or not the user ever turns the
 * music ON. That fixed shuffled order is the playback order for the
 * entire session: tracks play through it in sequence and loop forever.
 * A refresh reuses the same stored order, so the playlist is stable for
 * the whole session. (suspend()/resume() for the Music page resumes the
 * same track where it was paused — it doesn't disturb the playlist.)
 *
 * Playing state is mirrored to sessionStorage so a tab refresh tries to
 * resume the previous state. On a fresh session (no entry), the
 * default is OFF — browsers block autoplay without a prior user
 * gesture, so we don't attempt to play until the user clicks the
 * sound hotspot at least once.
 */
@Injectable({ providedIn: 'root' })
export class AmbientAudioService {
  private readonly storageKey = 'rm-ambient-audio-playing';
  private readonly orderKey = 'rm-ambient-audio-order';
  private readonly tracks: readonly string[] = [
    '/music/JSB.mp3',
    '/music/JSB2.mp3',
    '/music/JSP3.mp3',
    '/music/JSP4.mp3',
    '/music/JSB5.mp3',
  ];

  /** Shuffled play order for this session — indices into `tracks`.
   *  Built once per session (persisted to sessionStorage). */
  private order: number[] = [];
  /** Pointer into `order` — which slot of the shuffled playlist is current. */
  private playlistPos = 0;

  private audio?: HTMLAudioElement;

  /** Set while a component (e.g. the Music page) has explicitly
   *  paused the ambient track for the duration of its view.
   *  Suspend doesn't touch sessionStorage so user intent survives. */
  private suspended = false;
  private wasPlayingBeforeSuspend = false;

  readonly playing = signal(false);

  constructor() {
    if (typeof window === 'undefined') return;
    // Establish the session's shuffled playlist on site entry, regardless
    // of whether the music is ever turned ON.
    this.order = this.loadOrCreateOrder();
    const stored = sessionStorage.getItem(this.storageKey);
    if (stored === 'true') {
      // Try to resume the previously-on state after a refresh.
      this.tryStart();
    }
  }

  /** Read the session's shuffled order from sessionStorage, or build a
   *  fresh Fisher-Yates shuffle and persist it. Validates that a stored
   *  value is a permutation of all track indices (guards against a stale
   *  entry from an older build with a different track count). */
  private loadOrCreateOrder(): number[] {
    const stored = sessionStorage.getItem(this.orderKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as number[];
        const valid = Array.isArray(parsed)
          && parsed.length === this.tracks.length
          && parsed.every(n => Number.isInteger(n) && n >= 0 && n < this.tracks.length)
          && new Set(parsed).size === this.tracks.length;
        if (valid) return parsed;
      } catch {
        // fall through and rebuild
      }
    }
    const order = this.tracks.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    sessionStorage.setItem(this.orderKey, JSON.stringify(order));
    return order;
  }

  /** Resolve the current playlist slot to a track URL. */
  private currentTrack(): string {
    return this.tracks[this.order[this.playlistPos]];
  }

  toggle(): void {
    this.ensure();
    if (!this.audio) return;
    if (this.playing()) {
      this.audio.pause();
      this.setState(false);
    } else {
      this.audio.play()
        .then(() => this.setState(true))
        .catch(() => this.setState(false));
    }
  }

  private tryStart(): void {
    this.ensure();
    this.audio?.play()
      .then(() => this.setState(true))
      .catch(() => this.setState(false));
  }

  /** Best-effort autoplay used at first landing-page mount. Marks
   *  intent as ON so the toggle UI reflects it, then attempts to
   *  play immediately. If the browser blocks autoplay (no recent
   *  user gesture), wires one-time listeners for the next user
   *  interaction and plays then. */
  autoStart(): void {
    if (typeof window === 'undefined' || this.playing()) return;
    this.ensure();
    if (!this.audio) return;

    // Mark intent ON in sessionStorage even before play() resolves,
    // so a refresh during the wait still tries to resume.
    sessionStorage.setItem(this.storageKey, 'true');

    this.audio.play()
      .then(() => this.setState(true))
      .catch(() => {
        // Autoplay blocked — wait for first user interaction.
        const startOnInteraction = () => {
          ['click', 'keydown', 'touchstart', 'pointerdown'].forEach(t =>
            document.removeEventListener(t, startOnInteraction, true));
          if (this.audio && !this.playing()) {
            this.audio.play()
              .then(() => this.setState(true))
              .catch(() => this.setState(false));
          }
        };
        ['click', 'keydown', 'touchstart', 'pointerdown'].forEach(t =>
          document.addEventListener(t, startOnInteraction, { once: true, capture: true }));
      });
  }

  private ensure(): void {
    if (this.audio || typeof window === 'undefined') return;
    const audio = new Audio(this.currentTrack());
    audio.preload = 'auto';
    audio.addEventListener('ended', () => {
      // Advance through the session's shuffled playlist, looping forever.
      this.playlistPos = (this.playlistPos + 1) % this.order.length;
      audio.src = this.currentTrack();
      audio.play().catch(() => this.setState(false));
    });
    this.audio = audio;
  }

  private setState(playing: boolean): void {
    this.playing.set(playing);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(this.storageKey, String(playing));
    }
  }

  /** Pause the ambient track without changing the user-intent
   *  (sessionStorage). Use when a sub-page needs the speakers
   *  for its own audio — e.g. the Music page. resume() picks
   *  it back up where it left off. */
  suspend(): void {
    if (this.suspended) return;
    this.suspended = true;
    this.wasPlayingBeforeSuspend = this.playing();
    if (this.audio && this.playing()) {
      this.audio.pause();
      this.playing.set(false);
    }
  }

  resume(): void {
    if (!this.suspended) return;
    this.suspended = false;
    if (this.wasPlayingBeforeSuspend && this.audio) {
      this.audio.play()
        .then(() => this.playing.set(true))
        .catch(() => this.playing.set(false));
    }
    this.wasPlayingBeforeSuspend = false;
  }
}
