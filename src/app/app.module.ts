import { NgModule } from '@angular/core';
import { BrowserModule, DomSanitizer } from '@angular/platform-browser';
import { RouterModule, Routes } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { MatIconModule, MatIconRegistry } from '@angular/material/icon';

import { AppComponent } from './app.component';

/* Pages */
import { HomepagePage } from './pages/homepage/homepage.page';

/* Components */
import { CloseComponent } from './components/close/close.component';
import { ControlsComponent } from './components/controls/controls.component';
import { ControlsButtonComponent } from './components/controls/controls-button/controls-button.component';
import { CursorComponent } from './components/cursor/cursor.component';
import { InfoMessageComponent } from './components/info-message/info-message.component';
import { LoaderComponent } from './components/loader/loader.component';
import { MainComponent } from './components/main/main.component';
import { PageComponent } from './components/page/page.component';
import { PreloadComponent } from './components/preload/preload.component';

const appRoutes: Routes = [
  { path: '', component: HomepagePage }
];

@NgModule({
  declarations: [
    AppComponent,
    HomepagePage,
    CloseComponent,
    ControlsComponent,
    ControlsButtonComponent,
    CursorComponent,
    InfoMessageComponent,
    LoaderComponent,
    MainComponent,
    PageComponent,
    PreloadComponent
  ],
  imports: [
    HttpClientModule,
    BrowserModule,
    RouterModule.forRoot(
      appRoutes,
      {
        enableTracing: false,
        scrollPositionRestoration: 'enabled',
        anchorScrolling: 'enabled',
      }
    ),
    MatIconModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {
  constructor(iconRegistry: MatIconRegistry, sanitizer: DomSanitizer) {
    iconRegistry.addSvgIcon('arrow', sanitizer.bypassSecurityTrustResourceUrl('assets/icons/arrow.svg'));
    iconRegistry.addSvgIcon('eye', sanitizer.bypassSecurityTrustResourceUrl('assets/icons/eye.svg'));
    iconRegistry.addSvgIcon('expand', sanitizer.bypassSecurityTrustResourceUrl('assets/icons/expand.svg'));
    iconRegistry.addSvgIcon('close', sanitizer.bypassSecurityTrustResourceUrl('assets/icons/close.svg'));
    iconRegistry.addSvgIcon('minus', sanitizer.bypassSecurityTrustResourceUrl('assets/icons/minus.svg'));
    iconRegistry.addSvgIcon('plus', sanitizer.bypassSecurityTrustResourceUrl('assets/icons/plus.svg'));
    iconRegistry.addSvgIcon('pointer', sanitizer.bypassSecurityTrustResourceUrl('assets/icons/pointer.svg'));
    iconRegistry.addSvgIcon('pointer-cursor', sanitizer.bypassSecurityTrustResourceUrl('assets/icons/pointer-cursor.svg'));
  }
}