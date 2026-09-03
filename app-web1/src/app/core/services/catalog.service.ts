import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { Product } from '../models/product.model';

export const CATALOG: Product[] = [
  {
    id: 1,
    name: 'Satoru Gojo',
    universe: 'Jujutsu Kaisen',
    price: 189900,
    category: 'Hechiceros',
    color: '#dfe9ff',
    accent: '#5a7bd8',
    art: '∞',
    badge: 'Más vendido',
    rating: '4.9',
    stock: 8
  },
  {
    id: 2,
    name: 'Nezuko Kamado',
    universe: 'Demon Slayer',
    price: 164900,
    category: 'Cazadores',
    color: '#ffd9e0',
    accent: '#d85a7b',
    art: '❀',
    badge: 'Nuevo',
    rating: '4.8',
    stock: 12
  },
  {
    id: 3,
    name: 'Monkey D. Luffy',
    universe: 'One Piece',
    price: 209900,
    category: 'Piratas',
    color: '#ffe3c2',
    accent: '#e0793c',
    art: '☠',
    rating: '5.0',
    stock: 5
  },
  {
    id: 4,
    name: 'Tanjiro Kamado',
    universe: 'Demon Slayer',
    price: 174900,
    category: 'Cazadores',
    color: '#d4f2e7',
    accent: '#3c9d78',
    art: '♒',
    rating: '4.7',
    stock: 10
  },
  {
    id: 5,
    name: 'Itachi Uchiha',
    universe: 'Naruto Shippuden',
    price: 154900,
    category: 'Ninjas',
    color: '#e8dcff',
    accent: '#7a5ad8',
    art: '☾',
    badge: 'Edición limitada',
    rating: '4.9',
    stock: 4
  },
  {
    id: 6,
    name: 'Anya Forger',
    universe: 'Spy x Family',
    price: 119900,
    category: 'Espías',
    color: '#ffe9f4',
    accent: '#e07bb0',
    art: '✦',
    badge: 'Nuevo',
    rating: '4.6',
    stock: 15
  },
  {
    id: 7,
    name: 'Roronoa Zoro',
    universe: 'One Piece',
    price: 194900,
    category: 'Piratas',
    color: '#dff2d4',
    accent: '#5f9d3c',
    art: '⚔',
    rating: '4.8',
    stock: 7
  },
  {
    id: 8,
    name: 'Power',
    universe: 'Chainsaw Man',
    price: 249900,
    category: 'Demonios',
    color: '#ffdcd2',
    accent: '#d8543c',
    art: '⛧',
    badge: 'Preventa',
    rating: '4.9',
    stock: 3
  }
];

@Injectable({ providedIn: 'root' })
export class CatalogService {
  getProducts(): Observable<Product[]> {
    return of(CATALOG);
  }

  getFeatured(count = 4): Observable<Product[]> {
    return this.getProducts().pipe(map((items) => items.slice(0, count)));
  }

  getByCategory(category: string): Observable<Product[]> {
    return this.getProducts().pipe(
      map((items) =>
        category === 'Todos' ? items : items.filter((p) => p.category === category)
      )
    );
  }

  search(term: string): Observable<Product[]> {
    const query = term.trim().toLowerCase();
    return this.getProducts().pipe(
      map((items) =>
        !query
          ? items
          : items.filter(
              (p) =>
                p.name.toLowerCase().includes(query) ||
                p.universe.toLowerCase().includes(query) ||
                p.category.toLowerCase().includes(query)
            )
      )
    );
  }

  getNewReleases(): Observable<Product[]> {
    return this.getProducts().pipe(map((items) => items.filter((p) => !!p.badge)));
  }

  getCategories(): string[] {
    return ['Todos', ...new Set(CATALOG.map((p) => p.category))];
  }

  getUniverses(): { universe: string; count: number; art: string; accent: string; color: string }[] {
    const universes = new Map<string, Product[]>();
    for (const p of CATALOG) {
      const list = universes.get(p.universe) ?? [];
      list.push(p);
      universes.set(p.universe, list);
    }
    return [...universes.entries()].map(([universe, items]) => ({
      universe,
      count: items.length,
      art: items[0].art,
      accent: items[0].accent,
      color: items[0].color
    }));
  }
}
