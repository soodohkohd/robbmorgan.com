import { Component, computed, signal } from '@angular/core';
import { SectionShell } from '../section-shell/section-shell';

interface MobileApp {
  slug: string;
  /** Short label shown in the selector pills. */
  label: string;
  title: string;
  /** Optional tagline shown alongside the title (e.g. for in-progress
   *  projects). */
  subtitle?: string;
  developer?: string;
  category?: string;
  /** Square app icon. Omit for projects that don't have one yet. */
  icon?: string;
  iconAlt?: string;
  /** Pre-formatted HTML body (paragraphs, lists). */
  bodyHtml: string;
  /** Screenshots strip (for shipped apps). */
  screenshots?: readonly { src: string; alt: string }[];
  /** Demo video (for in-progress projects). */
  video?: { src: string; poster?: string };
  /** App Store link. Omit for in-progress projects. */
  appStoreUrl?: string;
}

@Component({
  selector: 'app-mobile-apps',
  imports: [SectionShell],
  templateUrl: './mobile-apps.html',
  styleUrl: './mobile-apps.scss',
})
export class MobileApps {
  readonly apps: readonly MobileApp[] = [
    {
      slug: 'life-clock',
      label: 'Life Clock',
      title: 'Life Clock — Time & Countdown',
      developer: 'Robb Morgan',
      category: 'Entertainment',
      icon: '/mobile/life-clock/icon.jpg',
      iconAlt: 'Life Clock app icon',
      appStoreUrl: 'https://apps.apple.com/us/app/life-clock-time-countdown/id1376104380',
      screenshots: [
        { src: '/mobile/life-clock/ss-1.png', alt: 'Life Clock screenshot 1' },
        { src: '/mobile/life-clock/ss-2.png', alt: 'Life Clock screenshot 2' },
        { src: '/mobile/life-clock/ss-3.png', alt: 'Life Clock screenshot 3' },
        { src: '/mobile/life-clock/ss-4.png', alt: 'Life Clock screenshot 4' },
        { src: '/mobile/life-clock/ss-5.png', alt: 'Life Clock screenshot 5' },
        { src: '/mobile/life-clock/ss-6.png', alt: 'Life Clock screenshot 6' },
      ],
      bodyHtml: `
        <p>Life Clock turns time into something you can see, feel, and understand. Track personal countdowns, explore life stats, and spend time playing thoughtful time-based games — all in one place. Make every moment count.</p>
        <p>Life Clock helps you visualize time in a way that's personal, meaningful, and engaging. From birthdays and milestones to life stats, personal countdowns, and interactive games, Life Clock transforms abstract time into something real — and even fun to explore.</p>
        <p><strong>With Life Clock, you can:</strong></p>
        <ul>
          <li>Create personal countdowns for important events</li>
          <li>View life time and age-based statistics</li>
          <li>Track meaningful dates and milestones</li>
          <li>Play simple, time-based games designed to help you reflect, explore, and enjoy the passage of time</li>
          <li>Experience time through a clean, interactive interface</li>
          <li>Stay mindful of how every moment adds up</li>
        </ul>
        <p>Whether you're planning ahead, reflecting on life, or just spending a few minutes playing with time itself, Life Clock helps you stay connected to the moments that matter — without complexity.</p>
        <p><em>Time is passing. See it. Own it. Live it.</em></p>
      `,
    },
    {
      slug: 'talc',
      label: 'TALC',
      title: 'TALC by SDK',
      developer: 'Robb Morgan',
      category: 'Finance',
      icon: '/mobile/talc/icon.jpg',
      iconAlt: 'TALC by SDK app icon',
      appStoreUrl: 'https://apps.apple.com/us/app/talc-by-sdk/id1564541557',
      screenshots: [
        { src: '/mobile/talc/ss-1.png', alt: 'TALC screenshot 1' },
        { src: '/mobile/talc/ss-2.png', alt: 'TALC screenshot 2' },
        { src: '/mobile/talc/ss-3.png', alt: 'TALC screenshot 3' },
        { src: '/mobile/talc/ss-4.png', alt: 'TALC screenshot 4' },
        { src: '/mobile/talc/ss-5.png', alt: 'TALC screenshot 5' },
        { src: '/mobile/talc/ss-6.png', alt: 'TALC screenshot 6' },
      ],
      bodyHtml: `
        <p><strong>TALC by SDK</strong> — The Ultimate Auto Lease Calculator.</p>
        <p>Get the best auto leasing experience with TALC by SDK. The powerful leasing tool helps you navigate leasing calculations with ease, ensuring you understand every detail before signing. Designed to give you control, TALC is a must-have for anyone looking to get a great deal on their next vehicle lease.</p>
        <p><strong>Key Features:</strong></p>
        <ul>
          <li><strong>Original Lease Calculator</strong> — easily calculate monthly payments, taxes, and fees. Perfectly tailored for all U.S. states.</li>
          <li><strong>Verification Calculator</strong> — cross-check current or past leases to validate costs and terms.</li>
          <li><strong>Reverse Lease Calculator</strong> — deconstruct dealer offers and see where the numbers align.</li>
          <li><strong>Dealer's Choice</strong> — start with your desired down payment and calculate monthly payments to fit your budget.</li>
        </ul>
        <p>Using TALC by SDK could make the difference between a smooth, informed leasing experience and a costly surprise every month. Make smarter decisions and take control with TALC.</p>
      `,
    },
  ];

  readonly currentProjects: readonly MobileApp[] = [
    {
      slug: 'rocket',
      label: 'Rocket',
      title: 'Rocket',
      subtitle: 'Astroid Hunter',
      developer: 'Robb Morgan',
      category: 'Game',
      icon: '/mobile/rocket/icon.png',
      iconAlt: 'Rocket app icon',
      video: {
        src: 'https://robbmorganmedia.blob.core.windows.net/media/rocket.mp4',
        poster: '/mobile/rocket/rocket-poster.jpg',
      },
      bodyHtml: `
        <p>Rocket is a vertical-format mobile arcade shooter inspired by the asteroid-blasting classics. You pilot a rocket along the bottom of the screen while greyscale asteroids tumble down from above in three sizes — large, medium, and small. Shoot them for points, with smaller (and harder to hit) rocks scoring more: 10 for a large, 50 for a medium, 100 for a small. A direct hit on a large asteroid fragments it into two mediums and a small, and a medium splits into two smalls, so every shot cascades into a denser, faster threat. You start with two lives and 50 missiles, with a cap of three missiles in flight at a time. Yellow ammo capsules drop as your supply dwindles — catch one to refill, miss it and that tier shuts off. A collision costs a life and resets the playfield; running out of ammo costs a life too (but refills you partway). Earn an extra life every 10,000 points. The game ends when lives reach zero, then it's tap-to-replay and a glance at the top-10 leaderboard.</p>
        <p>The app is built in Flutter (Dart 3.11 / Flutter 3.41), targeting iOS and Android from a single codebase. The entire game loop runs on a single Flutter <code>Ticker</code> driving a <code>ChangeNotifier</code>-based game controller — asteroid motion, missile travel, collisions, and ammo logic are all elapsed-time checks inside one tick rather than a fan-out of <code>Timer.periodic</code> callbacks, which keeps frame pacing predictable and lifecycle handling clean when the app is backgrounded. High scores persist locally via <code>SharedPreferences</code>, the parallax starfield is hand-painted with <code>CustomPainter</code>, and launcher icons are generated from a single source PNG via <code>flutter_launcher_icons</code>. The project was originally written in NativeScript/Angular and has since been fully ported to Flutter, which is now the canonical source.</p>
      `,
    },
  ];

  /** Flat list used to look up the currently selected app from either
   *  the published or current-project pill groups. */
  private readonly allApps = [...this.apps, ...this.currentProjects];

  selectedSlug = signal<string>(this.allApps[0].slug);
  selectedApp = computed<MobileApp>(
    () => this.allApps.find(a => a.slug === this.selectedSlug()) ?? this.allApps[0],
  );

  select(slug: string): void {
    this.selectedSlug.set(slug);
  }
}
