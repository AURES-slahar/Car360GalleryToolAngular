import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-cursor',
  templateUrl: './cursor.component.html',
  styleUrls: ['./cursor.component.scss']
})
export class CursorComponent {
  @Input() position?: string;
  @Input() move?: boolean;
  @Input() active?: boolean;
  @Input() hidden?: boolean;
  @Input() mobile?: boolean;
  @Input() horizontal?: boolean;
  @Input() responsive?: boolean;

  constructor() { }
}