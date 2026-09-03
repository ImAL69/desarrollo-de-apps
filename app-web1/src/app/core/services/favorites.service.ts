import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';

const FAVORITES_KEY = 'collecto-favorites';

@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly idsSubject = new BehaviorSubject<number[]>(this.restore());

  readonly ids$: Observable<number[]> = this.idsSubject.asObservable();

  toggle(id: number): void {
    const ids = this.idsSubject.value;
    const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
    this.idsSubject.next(next);
    this.persist(next);
  }

  isFavorite(id: number): boolean {
    return this.idsSubject.value.includes(id);
  }

  private restore(): number[] {
    if (!this.isBrowser) {
      return [];
    }
    try {
      const raw = localStorage.getItem(FAVORITES_KEY);
      return raw ? (JSON.parse(raw) as number[]) : [];
    } catch {
      return [];
    }
  }

  private persist(ids: number[]): void {
    if (!this.isBrowser) {
      return;
    }
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
    } catch {
      // almacenamiento no disponible: se ignora
    }
  }
}
