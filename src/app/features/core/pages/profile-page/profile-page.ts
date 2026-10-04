import { afterNextRender, Component, ElementRef, inject, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Store } from '@ngrx/store';
import { AuthSessionActions } from '../../../auth/store/auth-actions';
import { selectError, selectIsLoading, selectUser } from '../../../auth/store/auth-selectors';

@Component({
  selector: 'app-profile',
  imports: [MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.scss',
})
export class ProfilePage {
  private readonly store = inject(Store);
  private readonly heading = viewChild.required<ElementRef<HTMLElement>>('heading');
  protected readonly user = this.store.selectSignal(selectUser);
  protected readonly isLoading = this.store.selectSignal(selectIsLoading);
  protected readonly error = this.store.selectSignal(selectError);

  constructor() {
    afterNextRender(() => this.heading().nativeElement.focus());
  }

  retrySession(): void {
    if (!this.isLoading()) this.store.dispatch(AuthSessionActions.restoreRequested());
  }
}
