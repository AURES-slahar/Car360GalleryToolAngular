import { Component, Renderer2, ViewChild, HostListener, ElementRef, OnInit, AfterViewInit, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

import { createManifestRenderer, fetchManifest } from '../../../driverama-360-renderer';

@Component({
  selector: 'app-homepage',
  templateUrl: './homepage.page.html'
})

export class HomepagePage implements OnInit, AfterViewInit {
  private _doc = inject<Document>(DOCUMENT);
  @ViewChild('canvasDiv') canvasDiv?: ElementRef;
  public id: string = this.route.snapshot.queryParamMap.get('id') || ''; //900343408_1647603373
  public lang: string = this.route.snapshot.queryParamMap.get('lang') || 'cs';
  public mobile: boolean = this.route.snapshot.queryParamMap.get('mobile') === 'true' ? true : false;
  public size: string = this.route.snapshot.queryParamMap.get('mobile') === 'contain' ? 'contain' : 'cover';
  public defaultSize: string = this.route.snapshot.queryParamMap.get('mobile') === 'contain' ? 'contain' : 'cover';
  public customControls: boolean = this.route.snapshot.queryParamMap.get('custom-controls') === 'true' ? true : false;
  public webType: string = this.route.snapshot.queryParamMap.get('web-type') ?? 'default'; // mototechna
  public props: any = {
    'url': 'https://cdn-360-dev-driverama.azureedge.net/public/' + this.id,
    'type': this.route.snapshot.queryParamMap.get('type') ? this.route.snapshot.queryParamMap.get('type') : 'exterior'
  };
  public renderer360: any;
  public loading: boolean = true;
  public cursorPosition: any = 'translateX(0px) translateY(0px)';
  public cursorMove: boolean = false;
  public cursorActive: boolean = false;
  public message: boolean = true;
  public elem: any;
  public isFullScreen: boolean = this.route.snapshot.queryParamMap.get('fullscreen') === 'true' ? true : false;
  public responsive: boolean = this.route.snapshot.queryParamMap.get('responsive') === 'true' ? true : false;
  public preload: boolean = this.route.snapshot.queryParamMap.get('preload') === 'true' ? true : false;
  public preloadSize: number = window.innerWidth / 3;
  public hasInterior: boolean = false;
  public buttons: boolean = true;

  @HostListener('contextmenu', ['$event']) onRightClick(event: MouseEvent): void {
    event.preventDefault();
  }

  @HostListener('window:resize', ['$event']) onResize(): void {
    this.changeSize();
  }

  changeType(type: string): void {
    this.props.type = type;
    window.parent.postMessage({ message: 'threesixtyType', value: type }, '*');
    this.initCanvas();
  }

  zoomIn(): void {
    this.renderer360.onZoomIn();
    window.parent.postMessage({ message: 'threesixtyZoomIn', value: true }, '*');
  }

  zoomOut(): void {
    this.renderer360.onZoomOut();
    window.parent.postMessage({ message: 'threesixtyZoomOut', value: true }, '*');
  }

  canvasMouseMove(event: MouseEvent): void {
    this.cursorPosition = 'translateX(' + event.clientX + 'px) translateY(' + event.clientY + 'px)';
    this.cursorMove = true;
  }

  canvasMouseOut(): void {
    this.cursorPosition = 'translateX(0px) translateY(0px)';
    this.cursorMove = false;
  }

  canvasMouseDown(): void {
    this.cursorActive = true;
  }

  canvasMouseUp(): void {
    this.cursorActive = false;
  }

  initCanvas(): void {
    if (!this.preload) {
      this.renderer.setProperty(this.canvasDiv?.nativeElement, 'innerHTML', '');
      this.renderer360 = createManifestRenderer({
        container: this.canvasDiv?.nativeElement,
        preload: true
      });
      this.loading = true;
      const abortController = new AbortController();
      fetchManifest(this.props.url, { signal: abortController.signal }).then(data => {
        this.hasInterior = data.interior.length > 0 ? true : false;
        window.parent.postMessage({ message: 'threesixtyLoaded', value: true }, '*');
        window.parent.postMessage({ message: 'threesixtyHasInterior', value: this.hasInterior }, '*');
        return this.renderer360.init(
          this.props.type,
          data,
          {
            onActive: () => { },
            onZoomChange: (data: any) => { }
          },
          { objectFit: this.size }
        )
      }).then(() => {
        this.loading = false;
      });
    }
  }

  changeSize(): void {
    const ratio: number = 100 / (window.innerWidth / window.innerHeight);
    let newSize: string;
    if (ratio < 30) {
      newSize = 'contain';
      this.preloadSize = window.innerHeight / 2;
    } else if (ratio > 84) {
      newSize = 'contain';
      this.preloadSize = window.innerWidth / 3;
    } else {
      newSize = this.defaultSize;
      this.preloadSize = window.innerWidth / 3 > window.innerHeight / 2 ? window.innerWidth / 3 : window.innerHeight / 2;
    }
    if (newSize != this.size) {
      this.size = newSize;
      this.initCanvas();
    }
  }

  hideMessage(): void {
    this.message = false;
    window.parent.postMessage({ message: 'threesixtyMove', value: true }, '*');
  }

  openFullscreen(): void {
    window.parent.postMessage({ message: 'threesixtyFullscreen', value: true }, '*');
  }

  closeFullscreen(): void {
    window.parent.postMessage({ message: 'threesixtyFullscreen', value: false }, '*');
  }

  constructor(private renderer: Renderer2, private route: ActivatedRoute) { }

  ngOnInit(): void {
    this.elem = document.documentElement;
    if (this.isFullScreen) this.renderer.addClass(document.body, 'dark');
    this.renderer.addClass(this._doc.documentElement, 'web-type--' + this.webType);

    window.addEventListener('message', (event: any) => {
      if (event.data.message) {
        if (event.data.message == 'buttons') {
          if (event.data.value == 'hide') {
            this.buttons = false;
          } else {
            this.buttons = true;
          }
        } else if (event.data.message == 'changeType') {
          this.changeType(event.data.value);
        } else if (event.data.message == 'zoom') {
          if (event.data.value == 'in') {
            this.zoomIn();
          } else {
            this.zoomOut();
          }
        } else if (event.data.message == 'fullscreen') {
          if (event.data.value == true) {
            this.openFullscreen();
          } else {
            this.closeFullscreen();
          }
        }
      }
    }, false);
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.changeSize();
      this.initCanvas();
    });
  }
}