import { DOCUMENT, inject, Injectable, InjectionToken } from '@angular/core';

export const SESSION_STORAGE = new InjectionToken<Storage>('SESSION_STORAGE', {
  providedIn: 'root',
  factory: () => {
    const view = inject(DOCUMENT).defaultView;
    if (!view) throw new Error('Session storage requires a browser');
    return view.sessionStorage;
  },
});

@Injectable({ providedIn: 'root' })
export class SessionTokenStorage {
  private readonly storage = inject(SESSION_STORAGE);
  private readonly key = 'angular-ngrx-demo.session-token';

  public read(): string | null {
    return this.storage.getItem(this.key);
  }
  public write(token: string): void {
    this.storage.setItem(this.key, token);
  }
  public clear(): void {
    this.storage.removeItem(this.key);
  }
}
