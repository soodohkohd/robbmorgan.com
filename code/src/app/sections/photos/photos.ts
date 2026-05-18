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
    { file: '01-laguna-aerial-cove.jpg',    photographer: 'Derek Liang',          username: 'derekrliang' },
    { file: '02-laguna-mountain-coast.jpg', photographer: 'Brandon Russell',      username: 'brandonrussell' },
    { file: '03-laguna-sea-plants.jpg',     photographer: 'Richard Eddy',         username: 'x52x43x45' },
    { file: '04-laguna-palm-water.jpg',     photographer: 'Trac Vu',              username: 'tracminhvu' },
    { file: '05-laguna-cliff-houses.jpg',   photographer: 'Amy Vosters',          username: 'amyvosters' },
    { file: '06-laguna-aerial-waves.jpg',   photographer: 'Jason Ruiz',           username: 'jru1z' },
    { file: '07-laguna-wave-seashore.jpg',  photographer: 'Derek Liang',          username: 'derekrliang' },
    { file: '08-ca-rocky-coast.jpg',        photographer: 'Craig Melville',       username: 'craigmelville' },
    { file: '09-ca-coast-road.jpg',         photographer: 'Iris Papillon',        username: 'papillon' },
    { file: '10-ca-rocky-mountain.jpg',     photographer: 'Craig Melville',       username: 'craigmelville' },
    { file: '11-ca-mountain-water.jpg',     photographer: 'Ganapathy Kumar',      username: 'gkumar2175' },
    { file: '12-ca-trees-sunset.jpg',       photographer: 'Matthew Hamilton',     username: 'thatsmrbio' },
    { file: '13-cliffs-sunset.jpg',         photographer: 'Federico Beccari',     username: 'federize' },
    { file: '14-cliffs-golden-hour.jpg',    photographer: 'Neil Soni',            username: 'neilsoniphotography' },
    { file: '15-cliffs-water-sunset.jpg',   photographer: 'Leila Bandringa',      username: 'leila_bandringa' },
    { file: '16-cliffs-rock-formation.jpg', photographer: 'Derick McKinney',      username: 'derickray' },
    { file: '17-cliffs-clouds-sunset.jpg',  photographer: 'Ben Steward',          username: 'phorbie' },
    { file: '18-cliffs-rock.jpg',           photographer: 'Liz Brenden',          username: 'lizbrenden' },
    { file: '19-cliffs-large.jpg',          photographer: 'Stanislava Zdn',       username: 'stasya_zdn' },
    { file: '20-cliffs-sun-cliff.jpg',      photographer: 'Fabio Graf Rehbinder', username: 'uddrich' },
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
