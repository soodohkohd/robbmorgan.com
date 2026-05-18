import { Component } from '@angular/core';
import { SectionShell } from '../section-shell/section-shell';

interface Cert {
  title: string;
  school: string;
  issued: string;
  url: string;
}

@Component({
  selector: 'app-certs',
  imports: [SectionShell],
  templateUrl: './certs.html',
  styleUrl: './certs.scss',
})
export class Certs {
  readonly certs: readonly Cert[] = [
    {
      title: 'CS50P — Introduction to Programming with Python',
      school: 'HarvardX',
      issued: 'January 2025',
      url: 'https://courses.edx.org/certificates/a694503f837b4a84b2ea25f977255e1f',
    },
    {
      title: 'CS50X — Introduction to Computer Science',
      school: 'HarvardX',
      issued: 'January 2025',
      url: 'https://courses.edx.org/certificates/a83f6c354fef46f1903af0a092dd7082',
    },
    {
      title: 'Visual Elements of User Interface Design',
      school: 'California Institute of the Arts',
      issued: 'May 2023',
      url: 'https://www.coursera.org/account/accomplishments/verify/VNWN45X3J59P',
    },
  ];
}
