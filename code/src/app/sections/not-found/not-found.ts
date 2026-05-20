import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SectionShell } from '../section-shell/section-shell';

@Component({
  selector: 'app-not-found',
  imports: [SectionShell, RouterLink],
  templateUrl: './not-found.html',
  styleUrl: './not-found.scss',
})
export class NotFound {}
