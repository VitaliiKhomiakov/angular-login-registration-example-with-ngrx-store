import {APP_INITIALIZER, NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {RouteReuseStrategy} from '@angular/router';
import {IonicModule, IonicRouteStrategy} from '@ionic/angular';
import {SplashScreen} from '@ionic-native/splash-screen/ngx';
import {StatusBar} from '@ionic-native/status-bar/ngx';
import {AppRoutingModule} from './app-routing.module';
import {AppComponent} from './app.component';
import {HTTP_INTERCEPTORS, HttpClientModule} from "@angular/common/http";
import {HttpConfigInterceptor} from "./interceptor/httpconfig.interceptor";
import {ConfigService} from "./services/config.service";
import {StoreModule} from "@ngrx/store";
import {EffectsModule} from "@ngrx/effects";
import {StoreDevtoolsModule} from '@ngrx/store-devtools';
import {reducers} from "./store/reducers";
import {AuthEffects} from "./store/effects/auth.effects";
import {UserEffects} from "./store/effects/user.effects";
import {AuthService} from "./services/auth.service";
import {UserService} from "./services/user.service";
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {MatProgressSpinnerModule} from "@angular/material/progress-spinner";
import {AuthGuard} from "./guards/auth.guard";

export function initializeApp(appConfig: ConfigService) {
  return () => appConfig.load();
}

@NgModule({
  declarations: [AppComponent],
  entryComponents: [],
  imports: [
    BrowserModule,
    IonicModule.forRoot(),
    AppRoutingModule,
    HttpClientModule,
    StoreModule.forRoot(reducers),
    EffectsModule.forRoot([AuthEffects, UserEffects]),
    StoreDevtoolsModule.instrument({maxAge: 25}),
    BrowserAnimationsModule,
    MatProgressSpinnerModule
  ],
  providers: [
    ConfigService,
    StatusBar,
    SplashScreen,
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    { provide: HTTP_INTERCEPTORS, useClass: HttpConfigInterceptor, multi: true},
    { provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [ConfigService],
      multi: true
    },
    AuthService,
    UserService,
    AuthGuard
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
