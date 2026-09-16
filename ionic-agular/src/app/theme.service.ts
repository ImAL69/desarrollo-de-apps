import { Injectable } from '@angular/core';

const THEME_STORAGE_KEY = 'ionic-dark-mode';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private darkMode = false;

  initialize(): void {
    this.setDarkMode(localStorage.getItem(THEME_STORAGE_KEY) === 'true', false);
  }

  isDarkMode(): boolean {
    return this.darkMode;
  }

  setDarkMode(enabled: boolean, persist = true): void {
    this.darkMode = enabled;
    // Keep the guide's `dark` class and Ionic's palette class in sync.
    document.documentElement.classList.toggle('dark', enabled);
    document.documentElement.classList.toggle('ion-palette-dark', enabled);
    document.body.classList.toggle('dark', enabled);
    document.body.classList.toggle('ion-palette-dark', enabled);

    if (persist) {
      localStorage.setItem(THEME_STORAGE_KEY, String(enabled));
    }
  }
}
