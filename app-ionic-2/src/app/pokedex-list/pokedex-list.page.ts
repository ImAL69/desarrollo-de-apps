import { Component, OnInit, PendingTasks, computed, inject, signal } from '@angular/core';
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
  IonModal,
  IonRefresher,
  IonRefresherContent,
  RefresherCustomEvent
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  volumeHighOutline,
  closeOutline,
  sparklesOutline,
  scanOutline
} from 'ionicons/icons';
import { PokedexStorageService } from '../services/PokedexStorageService';
import { PokedexVoiceService } from '../services/PokedexVoiceService';
import { PokemonData, PokemonMove } from '../models/pokemon.model';

@Component({
  selector: 'app-pokedex-list',
  templateUrl: './pokedex-list.page.html',
  styleUrls: ['./pokedex-list.page.scss'],
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
    IonModal,
    IonRefresher,
    IonRefresherContent
  ]
})
export class PokedexListPage implements OnInit {
  public storageService = inject(PokedexStorageService);
  public voiceService = inject(PokedexVoiceService);

  public searchTerm = signal('');
  public filterType = signal<'all' | 'discovered' | 'locked'>('all');
  public selectedPokemon = signal<PokemonData | null>(null);
  public isModalOpen = signal(false);
  public isLoading = signal(true);
  public loadError = signal('');
  public filteredPokemonList = computed(() => {
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

  private router = inject(Router);
  private pendingTasks = inject(PendingTasks);
  private currentLoad: Promise<void> | null = null;

  constructor() {
    addIcons({
      arrowBackOutline,
      volumeHighOutline,
      closeOutline,
      sparklesOutline,
      scanOutline
    });
  }

  ngOnInit() {
    this.pendingTasks.run(() => this.loadPokemon(false));
  }

  ionViewWillEnter() {
    if (!this.currentLoad) this.pendingTasks.run(() => this.loadPokemon(true));
  }

  private async loadPokemon(reload: boolean) {
    this.isLoading.set(true);
    this.loadError.set('');
    const load = (async () => {
      try {
        await Promise.race([
          reload ? this.storageService.reload() : this.storageService.initPokedexDatabase(),
          new Promise<never>((_, reject) => {
            window.setTimeout(
              () => reject(new Error('La inicialización de la Pokédex superó el tiempo esperado.')),
              5000
            );
          })
        ]);
        if (this.storageService.entries().length === 0) {
          throw new Error('La Pokédex no devolvió entradas.');
        }
      } catch (error) {
        this.loadError.set('No se pudo cargar la Pokédex local. Recarga la página y verifica el almacenamiento del navegador.');
        console.error('Error cargando la Pokédex:', error);
      } finally {
        this.isLoading.set(false);
      }
    })();
    this.currentLoad = load;
    await load;
    this.currentLoad = null;
  }

  async refreshPokemon(event: RefresherCustomEvent) {
    await this.loadPokemon(true);
    await event.target.complete();
  }

  openDetails(pokemon: PokemonData) {
    if (!pokemon.isDiscovered) return;
    this.selectedPokemon.set(pokemon);
    this.isModalOpen.set(true);
    void this.voiceService.announcePokemon(pokemon);
  }

  closeDetails() {
    this.isModalOpen.set(false);
    this.voiceService.stop();
  }

  playVoice() {
    const pokemon = this.selectedPokemon();
    if (pokemon) void this.voiceService.announcePokemon(pokemon);
  }

  /**
   * Etiqueta legible para un movimiento (mismo formato que en la tarjeta AR).
   */
  formatMoveLabel(mv: PokemonMove): string {
    if (mv.method === 'level-up') {
      return mv.level > 0 ? `Nv${mv.level} ${mv.displayName}` : mv.displayName;
    }
    if (mv.method === 'machine' && mv.machineKind) {
      return `${mv.machineKind}${String(mv.machineNumber || '').padStart(2, '0')} ${mv.displayName}`;
    }
    if (mv.method === 'egg') return `🥚 ${mv.displayName}`;
    if (mv.method === 'tutor') return `👨‍🏫 ${mv.displayName}`;
    return mv.displayName;
  }

  goHome() {
    void this.router.navigateByUrl('/home');
  }

  openArPokedex() {
    void this.router.navigateByUrl('/ar-pokedex');
  }
}
