import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  IonModal
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
import { PokemonData } from '../models/pokemon.model';

@Component({
  selector: 'app-pokedex-list',
  templateUrl: './pokedex-list.page.html',
  styleUrls: ['./pokedex-list.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonContent,
    IonButton,
    IonIcon,
    IonSearchbar,
    IonModal
  ]
})
export class PokedexListPage implements OnInit {
  public storageService = inject(PokedexStorageService);
  public voiceService = inject(PokedexVoiceService);

  public searchTerm = '';
  public filterType = 'all'; // 'all', 'discovered', 'locked'
  public selectedPokemon: PokemonData | null = null;
  public isModalOpen = false;
  public isLoading = true;
  public loadError = '';
  private router = inject(Router);

  constructor() {
    addIcons({
      arrowBackOutline,
      volumeHighOutline,
      closeOutline,
      sparklesOutline,
      scanOutline
    });
  }

  async ngOnInit() {
    try {
      await Promise.race([
        this.storageService.initPokedexDatabase(),
        new Promise<never>((_, reject) => {
          window.setTimeout(
            () => reject(new Error('La inicialización de la Pokédex superó el tiempo esperado.')),
            5000
          );
        })
      ]);
      if (this.storageService.pokedexList.length === 0) {
        throw new Error('La Pokédex no devolvió entradas.');
      }
    } catch (error) {
      this.loadError = 'No se pudo cargar la Pokédex local. Recarga la página y verifica el almacenamiento del navegador.';
      console.error('Error cargando la Pokédex:', error);
    } finally {
      this.isLoading = false;
    }
  }

  get filteredPokemonList(): PokemonData[] {
    return this.storageService.pokedexList.filter(p => {
      const matchSearch =
        p.pokedexNumber.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        p.name.toLowerCase().includes(this.searchTerm.toLowerCase());

      if (this.filterType === 'discovered') return matchSearch && p.isDiscovered;
      if (this.filterType === 'locked') return matchSearch && !p.isDiscovered;
      return matchSearch;
    });
  }

  openDetails(pokemon: PokemonData) {
    if (!pokemon.isDiscovered) return; // Si no está descubierto, no abre modal
    this.selectedPokemon = pokemon;
    this.isModalOpen = true;
    this.voiceService.announcePokemon(pokemon);
  }

  closeDetails() {
    this.isModalOpen = false;
    this.voiceService.stop();
  }

  playVoice() {
    if (this.selectedPokemon) {
      this.voiceService.announcePokemon(this.selectedPokemon);
    }
  }

  goHome() {
    void this.router.navigateByUrl('/home');
  }

  openArPokedex() {
    void this.router.navigateByUrl('/ar-pokedex');
  }
}
