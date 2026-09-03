import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { Product } from '../../core/models/product.model';
import { ProductCardComponent } from '../product-card/product-card.component';

@Component({
  selector: 'app-product-grid',
  standalone: true,
  imports: [ProductCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (products.length > 0) {
      <div class="product-grid">
        @for (product of products; track product.id) {
          <app-product-card [product]="product" />
        }
      </div>
    } @else {
      <div class="empty-state">
        <p>No encontramos figuras con esos filtros. Intenta otra búsqueda.</p>
      </div>
    }
  `
})
export class ProductGridComponent {
  @Input({ required: true }) products: Product[] = [];
}
