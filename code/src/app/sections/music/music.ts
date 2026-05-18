import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { SectionShell } from '../section-shell/section-shell';
import { AmbientAudioService } from '../../ambient-audio.service';

interface Track {
  title: string;
  src: string;
  cover: string;
  /** Genre / sub-genre label (e.g. "Alt-Pop"). */
  style?: string;
  /** Secondary tag (e.g. "Soundtrack") shown alongside the style. */
  subtitle?: string;
  /** Keep the entry but skip rendering it (assets stay in place). */
  hidden?: boolean;
  /** Optional music-video easter egg. When set, clicking the cover
   *  opens a modal player and pauses any audio currently playing. */
  videoUrl?: string;
}

@Component({
  selector: 'app-music',
  imports: [SectionShell],
  templateUrl: './music.html',
  styleUrl: './music.scss',
})
export class Music implements AfterViewInit {
  private destroyRef = inject(DestroyRef);
  private ambient = inject(AmbientAudioService);

  constructor() {
    // Pause the desk-scene ambient track while the Music page is
    // mounted (so it doesn't fight the tracks the user plays here),
    // and resume it on the way back to the desk.
    this.ambient.suspend();
    this.destroyRef.onDestroy(() => this.ambient.resume());
  }

  readonly ledeHtml =
    'A small catalogue of original songs — my lyrics mixed with AI-generated ' +
    'vocals, produced with ' +
    '<a href="https://suno.com/playlist/679aed35-b743-4760-8cdc-6f8b79bd9106" ' +
    'target="_blank" rel="noopener noreferrer">Suno.ai</a>. ' +
    'Press play and have a listen.';

  readonly tracks: readonly Track[] = [
    { title: 'Floating',         src: '/music/floating.mp3',        cover: '/music/floating.jpg',       style: 'Alt-Pop' },
    { title: "Codin' in Cali",   src: '/music/codin-in-cali.mp3',   cover: '/music/codin-in-cali.jpg',  style: 'West Coast G-Funk' },
    { title: "SoCal Livin'",     src: '/music/socal-livin.mp3',     cover: '/music/socal-livin.jpg',    style: 'West Coast G-Funk' },
    { title: 'Long Way Home',    src: '/music/long-way-home.mp3',   cover: '/music/long-way-home.jpg',  style: 'Midwest Hip Hop' },
    { title: 'Just Like Me',     src: '/music/just-like-me.mp3',    cover: '/music/just-like-me.jpg',   style: 'Soulful Blues Rock', videoUrl: '/music/just-like-me.mp4' },
    { title: 'Sunshine Song',    src: '/music/sunshine-song.mp3',   cover: '/music/sunshine-song.jpg',  style: 'Acoustic Piano Pop' },
    { title: 'Sweetest Love',    src: '/music/sweetest-love.mp3',   cover: '/music/sweetest-love.jpg',  style: 'Contemporary Acoustic Pop' },
    { title: 'Come Back Home',   src: '/music/come-back-home.mp3',  cover: '/music/come-back-home.jpg', hidden: true },
    { title: 'Whispers of Time', src: '/music/whispers-of-time.mp3', cover: '/music/whispers-of-time.jpg', style: 'Midwest Hip Hop', subtitle: 'Soundtrack' },
  ];

  /** Tracks rendered in the template — filters out anything flagged hidden. */
  readonly visibleTracks = this.tracks.filter(t => !t.hidden);

  private audios = viewChildren<ElementRef<HTMLAudioElement>>('audioEl');
  private videoEl = viewChild<ElementRef<HTMLVideoElement>>('videoEl');

  /** Track whose music-video modal is currently open, or null. */
  modalTrack = signal<Track | null>(null);

  /** Zero-padded 2-digit track number for display ("01", "02", … "09"). */
  trackNumber(i: number): string {
    return String(i + 1).padStart(2, '0');
  }

  /** When one track starts, pause any others so only one plays at a time. */
  onPlay(ev: Event): void {
    const playing = ev.target as HTMLAudioElement;
    this.audios().forEach(ref => {
      if (ref.nativeElement !== playing) ref.nativeElement.pause();
    });
  }

  /** Open the video modal for a track that has a videoUrl. Pauses every
   *  audio first so it doesn't fight the video for the speakers. */
  openVideo(track: Track): void {
    if (!track.videoUrl) return;
    this.audios().forEach(ref => ref.nativeElement.pause());
    this.modalTrack.set(track);
    // iOS Safari often ignores the autoplay attribute when the <video>
    // is added via conditional render — explicitly play() after the
    // element is in the DOM so the user-gesture token still applies.
    setTimeout(() => {
      this.videoEl()?.nativeElement.play().catch(() => {
        /* autoplay blocked — user can still tap the play control. */
      });
    }, 0);
  }

  closeVideo(): void {
    const vid = this.videoEl()?.nativeElement;
    if (vid) {
      vid.pause();
      vid.currentTime = 0;
    }
    this.modalTrack.set(null);
  }

  ngAfterViewInit(): void {
    if (typeof window === 'undefined') return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape' && this.modalTrack()) this.closeVideo();
    };
    window.addEventListener('keydown', onKey);
    this.destroyRef.onDestroy(() => window.removeEventListener('keydown', onKey));
  }
}
