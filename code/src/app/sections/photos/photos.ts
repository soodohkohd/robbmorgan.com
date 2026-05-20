import {
  AfterViewInit,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { SectionShell } from '../section-shell/section-shell';

interface Photo {
  file: string;
  photographer: string;
  username: string;
}

@Component({
  selector: 'app-photos',
  imports: [SectionShell],
  templateUrl: './photos.html',
  styleUrl: './photos.scss',
})
export class Photos implements AfterViewInit {
  private destroyRef = inject(DestroyRef);

  readonly photos: readonly Photo[] = [
    { file: '02-laguna-mountain-coast.webp', photographer: 'Brandon Russell',  username: 'brandonrussell' },
    { file: '04-laguna-palm-water.webp',     photographer: 'Trac Vu',          username: 'tracminhvu' },
    { file: '08-ca-rocky-coast.webp',        photographer: 'Craig Melville',   username: 'craigmelville' },
    { file: '11-ca-mountain-water.webp',     photographer: 'Ganapathy Kumar',  username: 'gkumar2175' },
    { file: '12-ca-trees-sunset.webp',       photographer: 'Matthew Hamilton', username: 'thatsmrbio' },
    { file: '13-cliffs-sunset.webp',         photographer: 'Federico Beccari', username: 'federize' },
    { file: '14-cliffs-golden-hour.webp',    photographer: 'Neil Soni',        username: 'neilsoniphotography' },
    { file: '15-cliffs-water-sunset.webp',   photographer: 'Leila Bandringa',  username: 'leila_bandringa' },
    { file: '19-cliffs-large.webp',          photographer: 'Stanislava Zdn',   username: 'stasya_zdn' },
    { file: '21-laguna-buildings-sea.webp',  photographer: 'Starboard Creek',  username: 'starboardcreek' },
    { file: '22-laguna-beach-flora.webp',    photographer: 'Yash Patel',       username: 'sfo_yash3351' },
    { file: '23-laguna-blue-water.webp',     photographer: 'Derek Liang',      username: 'derekrliang' },
    { file: '24-laguna-palm-beach.webp',     photographer: 'Lukas Souza',      username: 'lukassouza' },
    { file: '25-laguna-birds-coast.webp',    photographer: 'Trac Vu',          username: 'tracminhvu' },
    { file: '26-laguna-palm-ocean.webp',     photographer: 'Nicholas Ceglia',  username: 'nceglia' },
    { file: '27-malibu-coast-frueh.webp',    photographer: 'Andre Frueh',      username: 'andrefrueh' },
    { file: '28-malibu-rocks.webp',          photographer: 'Joel Mott',        username: 'joelmott' },
    { file: '29-malibu-myles.webp',          photographer: 'Julian Myles',     username: 'julianmylesphoto' },
    { file: '30-malibu-shore.webp',          photographer: 'Andre Frueh',      username: 'andrefrueh' },
    { file: '31-malibu-tide.webp',           photographer: 'Tom Briskey',      username: 'tombriskey' },
    { file: '32-malibu-audibert.webp',       photographer: 'Chelsea Audibert', username: 'chelseaaudibert' },
    { file: '33-malibu-voss.webp',           photographer: 'Logan Voss',       username: 'loganvoss' },
    { file: '34-malibu-ari-he.webp',         photographer: 'Ari He',           username: 'arihe' },
    { file: '35-coast-palm-myles.webp',      photographer: 'Julian Myles',     username: 'julianmylesphoto' },
    { file: '36-malibu-patterson.webp',      photographer: 'Mark Patterson',   username: 'mrpatt' },
  ];

  index = signal(0);
  current = computed<Photo>(() => this.photos[this.index()]);
  count = computed(() => this.photos.length);

  next(): void {
    this.index.update(i => (i + 1) % this.photos.length);
  }

  prev(): void {
    this.index.update(i => (i - 1 + this.photos.length) % this.photos.length);
  }

  goto(i: number): void {
    this.index.set(i);
  }

  profileUrl(p: Photo): string {
    return `https://unsplash.com/@${p.username}`;
  }

  imageSrc(p: Photo): string {
    return `/coastline/${p.file}`;
  }

  ngAfterViewInit(): void {
    if (typeof window === 'undefined') return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'ArrowLeft')  this.prev();
      if (ev.key === 'ArrowRight') this.next();
    };
    window.addEventListener('keydown', onKey);
    this.destroyRef.onDestroy(() => window.removeEventListener('keydown', onKey));
  }
}
