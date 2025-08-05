import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-close',
  templateUrl: './close.component.html',
  styleUrls: ['./close.component.scss']
})
export class CloseComponent {
  @Input() mobile?: boolean;
  @Output() clicked = new EventEmitter<boolean>();

  click(): void {
    this.clicked.emit(true);
  }

  constructor() { }
}