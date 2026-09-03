import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { CatalogService } from '../../core/services/catalog.service';
import { ProductGridComponent } from '../../shared/product-grid/product-grid.component';

@Component({
  selector: 'app-new-releases',
  standalone: true,
  imports: [AsyncPipe, ProductGridComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="container page-section">
      <span class="eyebrow">Recién llegadas</span>
      <h1 class="section-title">Novedades y preventas</h1>
      <p style="max-width: 60ch; opacity: 0.8; margin-bottom: 2rem;">
        Preventas numeradas, ediciones limitadas y las últimas incorporaciones a la
        colección Collecto. Reserva antes de que se agoten.
      </p>
      <app-product-grid [products]="(newReleases$ | async) ?? []" />
    </section>
  `
})
export class NewReleasesComponent {
  private readonly catalog = inject(CatalogService);
  readonly newReleases$ = this.catalog.getNewReleases();
}
