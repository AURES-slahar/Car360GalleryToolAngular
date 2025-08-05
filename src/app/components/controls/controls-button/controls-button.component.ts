import { Component, EventEmitter, Input, Output } from '@angular/core';

import { ControlsComponent } from '../controls.component';

@Component({
  selector: 'app-controls-button',
  templateUrl: './controls-button.component.html',
  styleUrls: ['./controls-button.component.scss']
})
export class ControlsButtonComponent {
  @Input() icon?: string;
  @Input() mobile?: boolean;
  @Input() align?: 'left' | 'right';
  @Output() clicked = new EventEmitter<boolean>();

  click(): void {
    this.clicked.emit(true);
  }

  constructor(public controlsComponent: ControlsComponent) { }
}