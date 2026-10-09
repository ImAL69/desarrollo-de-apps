import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonContent,
  IonButton,
  IonIcon,
  IonSearchbar,
  IonBadge
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  closeOutline,
  sparklesOutline,
  searchOutline
} from 'ionicons/icons';
import { PokedexStorageService } from '../services/PokedexStorageService';
import { PokedexService } from '../services/pokedex.service';

@Component({
  selector: 'app-manual-scan',
  templateUrl: './manual-scan.page.html',
  styleUrls: ['./manual-scan.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonContent,
    IonButton,
    IonIcon,
    IonSearchbar,
    IonBadge
  ]
})
export class ManualScanPage implements OnInit {
  public storageService = inject(PokedexStorageService);
  private pokedexService = inject(PokedexService);
  private router = inject(Router);

  public searchTerm = signal('');
  public filterType = signal<'all' | 'discovered' | 'locked'>('all');
  public isLoading = signal(true);

  public filteredList = computed(() => {
    const search = this.searchTerm().trim().toLowerCase().replace(/^#/, '');
    const filter = this.filterType();
    return this.storageService.entries().filter(pokemon => {
      const numericSearch = /^\d+$/.test(search) ? Number(search) : null;
      const matchesSearch = !search ||
        pokemon.name.toLowerCase().includes(search) ||
        pokemon.pokedexNumber.toLowerCase().includes(search) ||
        (numericSearch !== null && pokemon.id === numericSearch);
      if (filter === 'discovered') return matchesSearch && pokemon.isDiscovered;
      if (filter === 'locked') return matchesSearch && !pokemon.isDiscovered;
      return matchesSearch;
    });
  });

  constructor() {
    addIcons({
      arrowBackOutline,
      closeOutline,
      sparklesOutline,
      searchOutline
    });
  }

  async ngOnInit() {
    try {
      await this.storageService.initPokedexDatabase();
    } catch (err) {
      console.error('Error inicializando Pokédex:', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Al pulsar sobre una entrada, volvemos a /ar-pokedex con el ID del Pokémon
   * seleccionado como query param. El AR page lee el parámetro en ionViewDidEnter
   * y carga la ficha sin necesidad de escanear con IA.
   */
  selectPokemon(id: number) {
    void this.router.navigate(['/ar-pokedex'], { queryParams: { manual: id } });
  }

  goBack() {
    void this.router.navigateByUrl('/ar-pokedex');
  }

  async prefetchAll() {
    await this.pokedexService.preloadAllKantoPokemon((current, total) => {
      console.log(`Precargando ${current}/${total}...`);
    });
  }
}
