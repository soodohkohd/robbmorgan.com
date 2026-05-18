import { Component, ElementRef, viewChildren } from '@angular/core';
import { SectionShell } from '../section-shell/section-shell';

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
}

@Component({
  selector: 'app-music',
  imports: [SectionShell],
  templateUrl: './music.html',
  styleUrl: './music.scss',
})
export class Music {
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
    { title: 'Just Like Me',     src: '/music/just-like-me.mp3',    cover: '/music/just-like-me.jpg',   style: 'Soulful Blues Rock' },
    { title: 'Sunshine Song',    src: '/music/sunshine-song.mp3',   cover: '/music/sunshine-song.jpg',  style: 'Acoustic Piano Pop' },
    { title: 'Sweetest Love',    src: '/music/sweetest-love.mp3',   cover: '/music/sweetest-love.jpg',  style: 'Contemporary Acoustic Pop' },
    { title: 'Come Back Home',   src: '/music/come-back-home.mp3',  cover: '/music/come-back-home.jpg', hidden: true },
    { title: 'Whispers of Time', src: '/music/whispers-of-time.mp3', cover: '/music/whispers-of-time.jpg', style: 'Midwest Hip Hop', subtitle: 'Soundtrack' },
  ];

  /** Tracks rendered in the template — filters out anything flagged hidden. */
  readonly visibleTracks = this.tracks.filter(t => !t.hidden);

  private audios = viewChildren<ElementRef<HTMLAudioElement>>('audioEl');

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
}
