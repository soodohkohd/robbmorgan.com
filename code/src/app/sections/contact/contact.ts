import { Component, inject, signal } from '@angular/core';
import { SectionShell } from '../section-shell/section-shell';
import { Analytics } from '../../analytics.service';

/** Web3Forms access key (free, unlimited — https://web3forms.com).
 *  The key only allows submissions to the inbox it's bound to
 *  (email@robbmorgan.com), so it's safe to ship in the client bundle. */
const WEB3FORMS_ACCESS_KEY = 'bb72c411-78dd-45c4-92d5-854220e66c8d';

/** Stricter than the browser's native `type="email"` (which accepts
 *  "a@b"). Requires a local part, a domain, and a dot-separated TLD of
 *  at least two chars, with no whitespace anywhere. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type SendState = 'idle' | 'sending' | 'success' | 'error';

@Component({
  selector: 'app-contact',
  imports: [SectionShell],
  templateUrl: './contact.html',
  styleUrl: './contact.scss',
})
export class Contact {
  private analytics = inject(Analytics);

  /** Drives the submit button label + the inline status message. */
  readonly state = signal<SendState>('idle');

  /** True once a submit is attempted with a badly-formatted email. */
  readonly emailInvalid = signal(false);

  /** Clear the email error as soon as the user edits the field again. */
  onEmailInput(): void {
    if (this.emailInvalid()) this.emailInvalid.set(false);
  }

  async submit(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    if (this.state() === 'sending') return;

    const form = event.target as HTMLFormElement;

    // Belt-and-suspenders: every required field must be filled before we
    // send. `reportValidity()` focuses the first offending field and shows
    // its native prompt — guards against any browser that lets an empty
    // submit through.
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    // Stricter email-format check than the native one.
    const email = String(new FormData(form).get('email') ?? '').trim();
    if (!EMAIL_PATTERN.test(email)) {
      this.emailInvalid.set(true);
      form.querySelector<HTMLInputElement>('input[name="email"]')?.focus();
      return;
    }
    this.emailInvalid.set(false);

    const data = new FormData(form);
    data.set('access_key', WEB3FORMS_ACCESS_KEY);
    // Subject line shown in the forwarded email.
    data.set('subject', 'New message from robbmorgan.com');

    this.state.set('sending');
    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body: data,
      });
      const json = await res.json();
      if (json.success) {
        this.state.set('success');
        this.analytics.track('contact_submit', { result: 'success' });
        form.reset();
      } else {
        this.state.set('error');
        this.analytics.track('contact_submit', { result: 'error' });
      }
    } catch {
      this.state.set('error');
      this.analytics.track('contact_submit', { result: 'error' });
    }
  }
}
