import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CatalogService } from '../../core/services/catalog.service';
import { HeroComponent } from '../../shared/hero/hero.component';
import { ProductGridComponent } from '../../shared/product-grid/product-grid.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [AsyncPipe, RouterLink, HeroComponent, ProductGridComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-hero />

    <section class="container page-section">
      <div class="benefits">
        <div class="benefit rise">
          <span class="icon">📦</span>
          <h3>Envío protegido</h3>
          <p>Cada figura viaja en empaque doble con certificado de autenticidad incluido.</p>
        </div>
        <div class="benefit rise">
          <span class="icon">✦</span>
          <h3>Ediciones limitadas</h3>
          <p>Preventas exclusivas y numeradas directamente de los estudios oficiales.</p>
        </div>
        <div class="benefit rise">
          <span class="icon">♥</span>
          <h3>Comunidad otaku</h3>
          <p>Eventos, intercambios y lanzamientos anticipados para coleccionistas.</p>
        </div>
      </div>
    </section>

    <section class="container page-section">
      <div class="section-head">
        <div>
          <span class="eyebrow">Selección del curador</span>
          <h2 class="section-title">Figuras destacadas</h2>
        </div>
        <a routerLink="/catalogo" class="btn btn-wine">Ver todo el catálogo</a>
      </div>
      <app-product-grid [products]="(featured$ | async) ?? []" />
    </section>
  `
})
export class HomeComponent {
  private readonly catalog = inject(CatalogService);
  readonly featured$ = this.catalog.getFeatured(4);
}
