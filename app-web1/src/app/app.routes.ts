import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'episodes'
  },
  {
    path: 'episodes',
    loadComponent: () =>
      import('./pages/episodes/episodes-page').then(
        (m) => m.EpisodesPageComponent
      )
  },
  {
    path: '**',
    redirectTo: 'episodes'
  }
];
