import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CatalogService } from '../../core/services/catalog.service';

@Component({
  selector: 'app-collections',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="container page-section">
      <span class="eyebrow">Universos anime</span>
      <h1 class="section-title">Colecciones</h1>
      <p style="max-width: 60ch; opacity: 0.8; margin-bottom: 2rem;">
        Explora las figuras agrupadas por universo. Toca una colección para ver sus
        piezas en el catálogo.
      </p>

      <div class="collections-grid">
        @for (col of universes; track col.universe) {
          <button
            type="button"
            class="collection-card rise"
            [style.background]="'linear-gradient(150deg, ' + col.color + ', ' + col.accent + '33)'"
            (click)="goToCatalog(col.universe)"
          >
            <span class="art-symbol" [style.color]="col.accent">{{ col.art }}</span>
            <h3>{{ col.universe }}</h3>
            <span>{{ col.count }} figura{{ col.count === 1 ? '' : 's' }}</span>
          </button>
        }
      </div>
    </section>
  `
})
export class CollectionsComponent {
  private readonly catalog = inject(CatalogService);
  private readonly router = inject(Router);

  readonly universes = this.catalog.getUniverses();

  goToCatalog(universe: string): void {
    this.router.navigate(['/catalogo'], { queryParams: { universo: universe } });
  }
}
