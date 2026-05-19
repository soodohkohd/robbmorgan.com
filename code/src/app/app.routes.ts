import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./landing/landing').then(m => m.Landing),
    title: 'Robb Morgan',
  },
  {
    path: 'resume',
    loadComponent: () => import('./sections/resume/resume').then(m => m.Resume),
    title: 'Resume — Robb Morgan',
  },
  {
    path: 'novels',
    loadComponent: () => import('./sections/novels/novels').then(m => m.Novels),
    title: 'Novels — Robb Morgan',
  },
  {
    path: 'web-apps',
    loadComponent: () => import('./sections/web-apps/web-apps').then(m => m.WebApps),
    title: 'Code — Robb Morgan',
  },
  {
    path: 'mobile-apps',
    loadComponent: () => import('./sections/mobile-apps/mobile-apps').then(m => m.MobileApps),
    title: 'Mobile Apps — Robb Morgan',
  },
  {
    path: 'blog',
    loadComponent: () => import('./sections/blog/blog').then(m => m.Blog),
    title: 'Thoughts — Robb Morgan',
  },
  {
    path: 'music',
    loadComponent: () => import('./sections/music/music').then(m => m.Music),
    title: 'Music — Robb Morgan',
  },
  {
    path: 'contact',
    loadComponent: () => import('./sections/contact/contact').then(m => m.Contact),
    title: 'Contact — Robb Morgan',
  },
  {
    path: 'certs',
    loadComponent: () => import('./sections/certs/certs').then(m => m.Certs),
    title: 'Certifications — Robb Morgan',
  },
  {
    path: 'photos',
    loadComponent: () => import('./sections/photos/photos').then(m => m.Photos),
    title: 'Take a Break — Robb Morgan',
  },
  {
    path: 'the-desk',
    loadComponent: () => import('./sections/the-desk/the-desk').then(m => m.TheDesk),
    title: 'The Desk — Robb Morgan',
  },
  { path: '**', redirectTo: '' },
];
