import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import {CoreComponent} from "./components/core/core.component";
import {AuthGuard} from "./guards/auth.guard";

const routes: Routes = [
  {
    path: 'core',
    component: CoreComponent,
    canActivate: [AuthGuard],
    loadChildren: () => import('./components/core/core.module').then(m => m.CoreModule)
  },
  {
    path: 'auth',
    loadChildren: () => import('./components/auth/auth.module').then(m => m.AuthModule)
  }
];
@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
