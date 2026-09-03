import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { Router } from '@angular/router';
import { CartService, FREE_SHIPPING_FROM } from '../../core/services/cart.service';
import { UiService } from '../../core/services/ui.service';
import { CopCurrencyPipe } from '../cop-currency.pipe';

@Component({
  selector: 'app-cart-drawer',
  standalone: true,
  imports: [AsyncPipe, CopCurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="drawer-backdrop" (click)="close()"></div>
    <aside class="cart-drawer" role="dialog" aria-label="Carrito de compras">
      <header class="drawer-head">
        <h3>Tu carrito</h3>
        <button type="button" class="drawer-close" (click)="close()" aria-label="Cerrar carrito">×</button>
      </header>

      @if (cart.lines$ | async; as lines) {
        @if (lines.length > 0) {
          <div class="drawer-lines">
            @for (line of lines; track line.id) {
              <div class="drawer-line">
                <div
                  class="line-art"
                  [style.background]="'linear-gradient(150deg, ' + line.color + ', ' + line.accent + '33)'"
                  [style.color]="line.accent"
                >
                  {{ line.art }}
                </div>
                <div>
                  <div class="line-name">{{ line.name }}</div>
                  <div class="line-price">{{ line.price | cop }} c/u</div>
                  <div class="qty-controls">
                    <button type="button" (click)="cart.updateQty(line.id, line.qty - 1)" aria-label="Disminuir cantidad">−</button>
                    <span>{{ line.qty }}</span>
                    <button type="button" (click)="cart.updateQty(line.id, line.qty + 1)" aria-label="Aumentar cantidad">+</button>
                  </div>
                </div>
                <button type="button" class="line-remove" (click)="cart.remove(line.id)" aria-label="Eliminar del carrito">🗑</button>
              </div>
            }
          </div>
          <footer class="drawer-foot">
            <div class="drawer-subtotal">
              <span>Subtotal</span>
              <span>{{ cart.subtotal$ | async | cop }}</span>
            </div>
            @if (cart.shippingCost() > 0) {
              <span class="drawer-shipping-hint">
                Envío gratis desde {{ freeShippingFrom | cop }} — te faltan {{ freeShippingFrom - cart.subtotal() | cop }}
              </span>
            } @else {
              <span class="drawer-shipping-hint">¡Tienes envío gratis! ✦</span>
            }
            <button type="button" class="btn btn-gold" (click)="goToCheckout()">Ir al checkout</button>
            <button type="button" class="btn btn-ghost" (click)="continueShopping()">Seguir comprando</button>
          </footer>
        } @else {
          <div class="drawer-empty">
            <p>Tu carrito está vacío.</p>
            <button type="button" class="btn btn-wine" (click)="continueShopping()">Explorar catálogo</button>
          </div>
        }
      }
    </aside>
  `
})
export class CartDrawerComponent {
  readonly cart = inject(CartService);
  private readonly ui = inject(UiService);
  private readonly router = inject(Router);

  readonly freeShippingFrom = FREE_SHIPPING_FROM;

  close(): void {
    this.ui.closeCartDrawer();
  }

  continueShopping(): void {
    this.ui.closeCartDrawer();
    this.router.navigateByUrl('/catalogo');
  }

  goToCheckout(): void {
    this.ui.closeCartDrawer();
    this.router.navigateByUrl('/checkout');
  }
}
