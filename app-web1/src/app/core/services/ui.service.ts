import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UiService {
  private readonly drawerSubject = new BehaviorSubject<boolean>(false);
  readonly cartDrawerOpen$ = this.drawerSubject.asObservable();

  openCartDrawer(): void {
    this.drawerSubject.next(true);
  }

  closeCartDrawer(): void {
    this.drawerSubject.next(false);
  }

  toggleCartDrawer(): void {
    this.drawerSubject.next(!this.drawerSubject.value);
  }
}
