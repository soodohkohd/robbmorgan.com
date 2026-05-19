import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-section-shell',
  imports: [RouterLink],
  templateUrl: './section-shell.html',
  styleUrl: './section-shell.scss',
})
export class SectionShell implements AfterViewInit {
  private destroyRef = inject(DestroyRef);

  eyebrow = input.required<string>();
  title = input.required<string>();
  lede = input<string>('');

  private pageHead = viewChild<ElementRef<HTMLElement>>('pageHead');
  isMinimized = signal(false);
  /** When true, the natural scroll handler is bypassed and isMinimized
   *  stays locked at whatever the parent set it to. Parent pages use
   *  this to hold the header compact through a multi-step scroll
   *  sequence, then release it so normal scroll behavior resumes. */
  private isForced = signal(false);

  ngAfterViewInit(): void {
    if (typeof window === 'undefined') return;
    const head = this.pageHead()?.nativeElement;
    if (!head) return;

    /* Capture the page-head's natural document position once. The header
       minimizes the moment its top edge would scroll above the viewport
       top — i.e., when sticky positioning kicks in. A 24px hysteresis
       band absorbs any micro-adjustments to scrollY during the
       transition so the class can't flip back and forth and stutter. */
    const threshold = head.offsetTop;
    const hysteresis = 24;

    const onScroll = () => {
      if (this.isForced()) return; // parent owns the state right now
      const y = window.scrollY;
      if (this.isMinimized()) {
        if (y < threshold) this.isMinimized.set(false);
      } else {
        if (y > threshold + hysteresis) this.isMinimized.set(true);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    this.destroyRef.onDestroy(() => window.removeEventListener('scroll', onScroll));
    onScroll();
  }

  /** Lock the header in minimized form. The natural scroll handler
   *  is bypassed until releaseForce() is called. */
  forceMinimize(): void {
    this.isForced.set(true);
    this.isMinimized.set(true);
  }

  /** Release the forced lock. The natural scroll handler resumes on
   *  the next scroll event; if the parent left the page at a scroll
   *  position past the threshold, the header stays compact via the
   *  normal flow. */
  releaseForce(): void {
    this.isForced.set(false);
  }
}
