import { Component } from '@angular/core';
import { sample, sample2 } from './sampleData';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  sample = sample;
  constructor() {
    let samples = [ sample, sample2 ];
    let i = 0;
    setInterval(() => {
      this.sample = samples[i++ % 2];
    }, 4000);
  }
}
