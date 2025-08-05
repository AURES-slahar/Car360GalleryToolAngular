import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss']
})
export class MainComponent {
  @Output() touched = new EventEmitter<boolean>();

  touch(): void {
    this.touched.emit(true);
  }

  constructor() { }
}