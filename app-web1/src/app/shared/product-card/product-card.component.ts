import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { Product } from '../../core/models/product.model';
import { CartService } from '../../core/services/cart.service';
import { FavoritesService } from '../../core/services/favorites.service';
import { UiService } from '../../core/services/ui.service';
import { CopCurrencyPipe } from '../cop-currency.pipe';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CopCurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="product-card rise">
      <div
        class="card-art"
        [style.background]="'linear-gradient(150deg, ' + product.color + ', ' + product.accent + '33)'"
      >
        @if (product.badge) {
          <span class="card-badge">{{ product.badge }}</span>
        }
        <button
          type="button"
          class="fav-button"
          [class.active]="isFavorite()"
          (click)="toggleFavorite()"
          [attr.aria-label]="isFavorite() ? 'Quitar de favoritos' : 'Añadir a favoritos'"
        >
          {{ isFavorite() ? '♥' : '♡' }}
        </button>
        <span class="art-symbol float" [style.color]="product.accent">{{ product.art }}</span>
      </div>
      <div class="card-body">
        <span class="card-universe">{{ product.universe }}</span>
        <h3 class="card-name">{{ product.name }}</h3>
        <div class="card-meta">
          <span class="card-price">{{ product.price | cop }}</span>
          <span class="card-rating">★ {{ product.rating }}</span>
        </div>
        <button type="button" class="card-add" (click)="addToCart()">Añadir al carrito</button>
      </div>
    </article>
  `
})
export class ProductCardComponent {
  @Input({ required: true }) product!: Product;

  private readonly cart = inject(CartService);
  private readonly favorites = inject(FavoritesService);
  private readonly ui = inject(UiService);

  addToCart(): void {
    this.cart.add(this.product);
    this.ui.openCartDrawer();
  }

  toggleFavorite(): void {
    this.favorites.toggle(this.product.id);
  }

  isFavorite(): boolean {
    return this.favorites.isFavorite(this.product.id);
  }
}
