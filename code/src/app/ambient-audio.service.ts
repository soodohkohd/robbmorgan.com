import { Injectable, signal } from '@angular/core';

/**
 * Singleton ambient-music player. Outlives route navigation (it's
 * `providedIn: 'root'`) so toggling sound ON on the landing page
 * keeps playing as the user clicks into sub-pages and back.
 *
 * Tracks loop: JSB.mp3 → JSB2.mp3 → JSB.mp3 → … forever.
 *
 * State is mirrored to sessionStorage so a tab refresh tries to
 * resume the previous state. On a fresh session (no entry), the
 * default is OFF — browsers block autoplay without a prior user
 * gesture, so we don't attempt to play until the user clicks the
 * sound hotspot at least once.
 */
@Injectable({ providedIn: 'root' })
export class AmbientAudioService {
  private readonly storageKey = 'rm-ambient-audio-playing';
  private readonly tracks: readonly string[] = [
    '/music/JSB.mp3',
    '/music/JSB2.mp3',
    '/music/JSP3.mp3',
    '/music/JSP4.mp3',
  ];

  private audio?: HTMLAudioElement;
  private trackIndex = 0;

  /** Set while a component (e.g. the Music page) has explicitly
   *  paused the ambient track for the duration of its view.
   *  Suspend doesn't touch sessionStorage so user intent survives. */
  private suspended = false;
  private wasPlayingBeforeSuspend = false;

  readonly playing = signal(false);

  constructor() {
    if (typeof window === 'undefined') return;
    const stored = sessionStorage.getItem(this.storageKey);
    if (stored === 'true') {
      // Try to resume the previously-on state after a refresh.
      this.tryStart();
    }
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

  private ensure(): void {
    if (this.audio || typeof window === 'undefined') return;
    const audio = new Audio(this.tracks[this.trackIndex]);
    audio.preload = 'auto';
    audio.addEventListener('ended', () => {
      this.trackIndex = (this.trackIndex + 1) % this.tracks.length;
      audio.src = this.tracks[this.trackIndex];
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
