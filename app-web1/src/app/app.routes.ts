import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { CatalogComponent } from './features/catalog/catalog.component';
import { NewReleasesComponent } from './features/new-releases/new-releases.component';
import { CollectionsComponent } from './features/collections/collections.component';
import { AboutComponent } from './features/about/about.component';
import { CheckoutComponent } from './features/checkout/checkout.component';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent
  },
  {
    path: 'catalogo', component: CatalogComponent
  },
  {
    path: 'novedades', component: NewReleasesComponent
  },
  {
    path: 'colecciones', component: CollectionsComponent
  },
  {
    path: 'nosotros', component: AboutComponent
  },
  {
    path: 'checkout', component: CheckoutComponent
  },
  {
    path: '**',
    redirectTo: ''
  }
];
