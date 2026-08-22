import { Routes } from '@angular/router';

/** Per-route description text used as both the <meta name="description">
 *  value and the OG/Twitter card description on share previews. Set via
 *  data so a single NavigationEnd subscriber (in app.config.ts) can
 *  read it and update the head without each component duplicating the
 *  Meta-service plumbing. */
export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./landing/landing').then(m => m.Landing),
    title: 'Robb Morgan',
    data: { description: 'A cinematic walnut-desk portfolio. Click around the desk to find Robb Morgan’s resume, novels, code, mobile apps, music, photos, and field notes.' },
  },
  {
    path: 'resume',
    loadComponent: () => import('./sections/resume/resume').then(m => m.Resume),
    title: 'Resume — Robb Morgan',
    data: { description: 'Thirty years of technology leadership. AI Architect and Engineer. Cross-industry consulting, enterprise pipelines, cloud, regulated environments, AI strategy.' },
  },
  {
    path: 'novels',
    loadComponent: () => import('./sections/novels/novels').then(m => m.Novels),
    title: 'Novels — Robb Morgan',
    data: { description: 'Novels by Robb Morgan. Long-form fiction written between deploys.' },
  },
  {
    path: 'code',
    loadComponent: () => import('./sections/web-apps/web-apps').then(m => m.WebApps),
    title: 'Code — Robb Morgan',
    data: { description: 'Concepts, architecture, and design decisions behind the systems I build — the anatomy of an AI agent, a fully local AI, enterprise CI/CD, and a game engine.' },
  },
  // Legacy path. /web-apps was the indexed URL until Aug 2026 and is still in
  // Google's index, in the App Insights history, and in anything anyone linked.
  // Kept as a redirect rather than deleted so those don't 404. The component
  // directory keeps its old name; only the public URL moved.
  { path: 'web-apps', redirectTo: 'code', pathMatch: 'full' },
  {
    path: 'mobile-apps',
    loadComponent: () => import('./sections/mobile-apps/mobile-apps').then(m => m.MobileApps),
    title: 'Mobile Apps — Robb Morgan',
    data: { description: 'Mobile apps built by Robb Morgan, including Rocket: Asteroid Hunter and other side-project games and utilities.' },
  },
  {
    path: 'thoughts',
    loadComponent: () => import('./sections/blog/blog').then(m => m.Blog),
    title: 'Thoughts — Robb Morgan',
    data: { description: 'Field notes from three decades in technology. The IC ladder, AI-DLC, pipelines as products, consultants vs. in-house, hiring algorithms — written for engineers and the people who hire them.' },
  },
  // Legacy path, same reasoning as /web-apps above: /blog was the indexed URL
  // until Aug 2026. The hotspot always said "Thoughts"; now the URL does too.
  { path: 'blog', redirectTo: 'thoughts', pathMatch: 'full' },
  {
    path: 'music',
    loadComponent: () => import('./sections/music/music').then(m => m.Music),
    title: 'Music — Robb Morgan',
    data: { description: 'A small catalogue of original songs by Robb Morgan — lyrics paired with AI-generated vocals, produced with Suno.ai.' },
  },
  {
    path: 'contact',
    loadComponent: () => import('./sections/contact/contact').then(m => m.Contact),
    title: 'Contact — Robb Morgan',
    data: { description: 'Get in touch with Robb Morgan.' },
  },
  {
    path: 'certs',
    loadComponent: () => import('./sections/certs/certs').then(m => m.Certs),
    title: 'Certifications — Robb Morgan',
    data: { description: 'Industry certifications and credentials held by Robb Morgan.' },
  },
  {
    path: 'photos',
    loadComponent: () => import('./sections/photos/photos').then(m => m.Photos),
    title: 'Take a Break — Robb Morgan',
    data: { description: 'A coastline gallery — Southern California photos taken between drafts and deploys.' },
  },
  {
    path: 'rocket',
    loadComponent: () => import('./sections/rocket/rocket-game').then(m => m.RocketGame),
    title: 'Rocket — Robb Morgan',
    data: { description: 'Rocket: Asteroid Hunter — the web version of Robb Morgan’s arcade space shooter. Steer the rocket, blast falling asteroids, catch ammo capsules, and chase a high score.' },
  },
  {
    path: 'the-desk',
    loadComponent: () => import('./sections/the-desk/the-desk').then(m => m.TheDesk),
    title: 'The Desk — Robb Morgan',
    data: { description: 'Behind the scenes of robbmorgan.com: thirteen chapters on how the cinematic desk scene was built, from polygon hotspots to bird animations to AI-paired coding.' },
  },
  {
    path: '**',
    loadComponent: () => import('./sections/not-found/not-found').then(m => m.NotFound),
    title: 'Page Not Found — Robb Morgan',
    data: { description: 'The page you tried to reach doesn’t exist on robbmorgan.com. Head back to the desk.' },
  },
];
