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
    { file: '02-laguna-mountain-coast.jpg', photographer: 'Brandon Russell',  username: 'brandonrussell' },
    { file: '04-laguna-palm-water.jpg',     photographer: 'Trac Vu',          username: 'tracminhvu' },
    { file: '08-ca-rocky-coast.jpg',        photographer: 'Craig Melville',   username: 'craigmelville' },
    { file: '11-ca-mountain-water.jpg',     photographer: 'Ganapathy Kumar',  username: 'gkumar2175' },
    { file: '12-ca-trees-sunset.jpg',       photographer: 'Matthew Hamilton', username: 'thatsmrbio' },
    { file: '13-cliffs-sunset.jpg',         photographer: 'Federico Beccari', username: 'federize' },
    { file: '14-cliffs-golden-hour.jpg',    photographer: 'Neil Soni',        username: 'neilsoniphotography' },
    { file: '15-cliffs-water-sunset.jpg',   photographer: 'Leila Bandringa',  username: 'leila_bandringa' },
    { file: '19-cliffs-large.jpg',          photographer: 'Stanislava Zdn',   username: 'stasya_zdn' },
    { file: '21-laguna-buildings-sea.jpg',  photographer: 'Starboard Creek',  username: 'starboardcreek' },
    { file: '22-laguna-beach-flora.jpg',    photographer: 'Yash Patel',       username: 'sfo_yash3351' },
    { file: '23-laguna-blue-water.jpg',     photographer: 'Derek Liang',      username: 'derekrliang' },
    { file: '24-laguna-palm-beach.jpg',     photographer: 'Lukas Souza',      username: 'lukassouza' },
    { file: '25-laguna-birds-coast.jpg',    photographer: 'Trac Vu',          username: 'tracminhvu' },
    { file: '26-laguna-palm-ocean.jpg',     photographer: 'Nicholas Ceglia',  username: 'nceglia' },
    { file: '27-malibu-coast-frueh.jpg',    photographer: 'Andre Frueh',      username: 'andrefrueh' },
    { file: '28-malibu-rocks.jpg',          photographer: 'Joel Mott',        username: 'joelmott' },
    { file: '29-malibu-myles.jpg',          photographer: 'Julian Myles',     username: 'julianmylesphoto' },
    { file: '30-malibu-shore.jpg',          photographer: 'Andre Frueh',      username: 'andrefrueh' },
    { file: '31-malibu-tide.jpg',           photographer: 'Tom Briskey',      username: 'tombriskey' },
    { file: '32-malibu-audibert.jpg',       photographer: 'Chelsea Audibert', username: 'chelseaaudibert' },
    { file: '33-malibu-voss.jpg',           photographer: 'Logan Voss',       username: 'loganvoss' },
    { file: '34-malibu-ari-he.jpg',         photographer: 'Ari He',           username: 'arihe' },
    { file: '35-coast-palm-myles.jpg',      photographer: 'Julian Myles',     username: 'julianmylesphoto' },
    { file: '36-malibu-patterson.jpg',      photographer: 'Mark Patterson',   username: 'mrpatt' },
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
