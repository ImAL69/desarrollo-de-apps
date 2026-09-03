import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Product } from '../models/product.model';
import { CartLine } from '../models/cart-line.model';

const CART_KEY = 'collecto-cart';
export const FREE_SHIPPING_FROM = 250000;
export const SHIPPING_COST = 15000;

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly linesSubject = new BehaviorSubject<CartLine[]>(this.restore());

  readonly lines$: Observable<CartLine[]> = this.linesSubject.asObservable();
  readonly itemCount$: Observable<number> = this.lines$.pipe(
    map((lines) => lines.reduce((acc, line) => acc + line.qty, 0))
  );
  readonly subtotal$: Observable<number> = this.lines$.pipe(
    map((lines) => lines.reduce((acc, line) => acc + line.price * line.qty, 0))
  );

  get lines(): CartLine[] {
    return this.linesSubject.value;
  }

  add(product: Product): void {
    const existing = this.lines.find((line) => line.id === product.id);
    if (existing && existing.qty >= product.stock) return;
    const next = existing
      ? this.lines.map((line) =>
          line.id === product.id ? { ...line, qty: line.qty + 1 } : line
        )
      : [...this.lines, { ...product, qty: 1 }];
    this.publish(next);
  }

  updateQty(id: number, qty: number): void {
    const line = this.lines.find((item) => item.id === id);
    if (!line || !Number.isInteger(qty)) return;
    qty = Math.min(qty, line.stock);
    const next =
      qty < 1
        ? this.lines.filter((line) => line.id !== id)
        : this.lines.map((line) => (line.id === id ? { ...line, qty } : line));
    this.publish(next);
  }

  remove(id: number): void {
    this.publish(this.lines.filter((line) => line.id !== id));
  }

  clear(): void {
    this.publish([]);
  }

  subtotal(): number {
    return this.lines.reduce((acc, line) => acc + line.price * line.qty, 0);
  }

  itemCount(): number {
    return this.lines.reduce((acc, line) => acc + line.qty, 0);
  }

  shippingCost(): number {
    const subtotal = this.subtotal();
    if (subtotal === 0) {
      return 0;
    }
    return subtotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING_COST;
  }

  total(): number {
    return this.subtotal() + this.shippingCost();
  }

  private publish(lines: CartLine[]): void {
    this.linesSubject.next(lines);
    this.persist(lines);
  }

  private restore(): CartLine[] {
    if (!this.isBrowser) {
      return [];
    }
    try {
      const raw = localStorage.getItem(CART_KEY);
      return raw ? (JSON.parse(raw) as CartLine[]) : [];
    } catch {
      return [];
    }
  }

  private persist(lines: CartLine[]): void {
    if (!this.isBrowser) {
      return;
    }
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(lines));
    } catch {
      // almacenamiento no disponible: se ignora
    }
  }
}
