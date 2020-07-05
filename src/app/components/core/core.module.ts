import {IonicModule} from '@ionic/angular';
import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';

import {CoreRoutingModule} from './core-routing.module';

import {CoreComponent} from './core.component';
import {MyDayComponent} from "./my-day/my-day.component";

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    CoreRoutingModule
  ],
  declarations: [CoreComponent, MyDayComponent]
})
export class CoreModule {}
