import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { CatalogService } from '../../core/services/catalog.service';
import { ProductGridComponent } from '../../shared/product-grid/product-grid.component';

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [AsyncPipe, FormsModule, ProductGridComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="container page-section">
      <span class="eyebrow">Catálogo completo</span>
      <h1 class="section-title">Todas las figuras</h1>

      <div class="catalog-tools">
        <input
          type="search"
          class="search-input"
          placeholder="Buscar por nombre, universo o categoría…"
          [ngModel]="searchTerm"
          (ngModelChange)="onSearch($event)"
          aria-label="Buscar figuras"
        />
        @for (category of categories; track category) {
          <button
            type="button"
            class="chip"
            [class.active]="category === (category$ | async)"
            (click)="onCategory(category)"
          >
            {{ category }}
          </button>
        }
      </div>

      <app-product-grid [products]="(products$ | async) ?? []" />
    </section>
  `
})
export class CatalogComponent implements OnInit {
  private readonly catalog = inject(CatalogService);
  private readonly route = inject(ActivatedRoute);

  readonly categories = this.catalog.getCategories();
  readonly category$ = new BehaviorSubject<string>('Todos');
  private readonly search$ = new BehaviorSubject<string>('');
  searchTerm = '';

  readonly products$ = combineLatest([
    this.catalog.getProducts(),
    this.category$,
    this.search$
  ]).pipe(
    map(([products, category, term]) => {
      const query = term.trim().toLowerCase();
      return products
        .filter((p) => category === 'Todos' || p.category === category)
        .filter(
          (p) =>
            !query ||
            p.name.toLowerCase().includes(query) ||
            p.universe.toLowerCase().includes(query) ||
            p.category.toLowerCase().includes(query)
        );
    })
  );

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const universe = params.get('universo');
      if (universe) {
        this.searchTerm = universe;
        this.search$.next(universe);
      }
    });
  }

  onSearch(term: string): void {
    this.searchTerm = term;
    this.search$.next(term);
  }

  onCategory(category: string): void {
    this.category$.next(category);
  }
}
