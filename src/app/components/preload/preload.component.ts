import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-preload',
  templateUrl: './preload.component.html',
  styleUrls: ['./preload.component.scss']
})
export class PreloadComponent implements OnInit {
  @Input() id: string = '';
  @Input() size: number = 0;
  public images: string[] = [];

  constructor() { }

  ngOnInit(): void {
    let y: number = 0;
    let x: number = 0;
    for (let i = 0; i < 6; i++) {
      this.images.push('url(https://cdn-360-dev-driverama.azureedge.net/public/' + this.id + '/exterior/001/024/0_' + x + '_' + y + '.jpg)');
      y = i - 2 == 0 ? y + 1 : y;
      x = x - 2 == 0 ? 0 : x + 1;
    }
  }
}