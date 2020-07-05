import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {MyDayComponent} from "./my-day/my-day.component";


const routes: Routes = [
  {
    path: 'my-day',
    component: MyDayComponent
  },
  {
    path: '',
    redirectTo: 'my-day',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CoreRoutingModule {}
