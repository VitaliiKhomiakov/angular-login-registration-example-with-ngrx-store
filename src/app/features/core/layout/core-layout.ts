import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Store } from '@ngrx/store';
import { AuthPageActions } from '../../auth/store/auth-actions';

@Component({
  selector: 'app-core-layout',
  imports: [MatButtonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './core-layout.html',
  styleUrl: './core-layout.scss',
})
export class CoreLayout {
  private readonly store = inject(Store);

  logout(): void {
    this.store.dispatch(AuthPageActions.logoutRequested());
  }
}
