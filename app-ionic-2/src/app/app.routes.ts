import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'gallery',
    loadComponent: () => import('./gallery/gallery.page').then((m) => m.GalleryPage),
  },
  {
    path: 'ar-pokedex',
    loadComponent: () => import('./ar-pokedex/ar-pokedex.page').then((m) => m.ArPokedexPage),
  },
  {
    path: 'manual-scan',
    loadComponent: () => import('./manual-scan/manual-scan.page').then((m) => m.ManualScanPage),
  },
  {
    path: 'pokedex-list',
    loadComponent: () => import('./pokedex-list/pokedex-list.page').then((m) => m.PokedexListPage),
  },
];
