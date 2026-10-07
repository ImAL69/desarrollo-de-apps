import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { PokemonData } from '../models/pokemon.model';

@Injectable({
  providedIn: 'root'
})
export class PokedexStorageService {
  private readonly STORAGE_KEY = 'pokedex_registered_entries_gen1';
  public readonly totalPokemons = 151; // Primera generación (Kanto #001 al #151)
  public pokedexList: PokemonData[] = [];

  /**
   * Carga la base de datos o inicializa las 151 entradas de Kanto en estado no descubierto (???).
   */
  async initPokedexDatabase(): Promise<PokemonData[]> {
    const { value } = await Preferences.get({ key: this.STORAGE_KEY });

    if (value) {
      this.pokedexList = JSON.parse(value);
    } else {
      // Inicializar lista con las 151 entradas ocultas "???"
      this.pokedexList = [];
      for (let i = 1; i <= this.totalPokemons; i++) {
        const numStr = `#${i.toString().padStart(3, '0')}`;
        this.pokedexList.push({
          id: i,
          pokedexNumber: numStr,
          name: '???',
          formattedName: '???',
          heightMeters: 0,
          weightKg: 0,
          types: [{ name: 'DESCONOCIDO', color: '#686868', bgPixel: '#383838' }],
          abilities: ['???'],
          stats: [],
          description: 'Este Pokémon de Kanto aún no ha sido escaneado ni registrado en tu Pokédex.',
          spritePixelUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${i}.png`,
          spriteArtworkUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${i}.png`,
          isDiscovered: false,
          scannedCount: 0
        });
      }
      await this.saveToStorage();
    }
    return this.pokedexList;
  }

  /**
   * Registra o actualiza un Pokémon descubierto en la base de datos.
   */
  async registerDiscoveredPokemon(scannedData: PokemonData): Promise<{ isFirstTime: boolean; entry: PokemonData }> {
    const index = this.pokedexList.findIndex(p => p.id === scannedData.id);
    let isFirstTime = true;

    if (index !== -1) {
      const existing = this.pokedexList[index];
      isFirstTime = !existing.isDiscovered;

      this.pokedexList[index] = {
        ...scannedData,
        isDiscovered: true,
        discoveredAt: existing.discoveredAt || new Date().toLocaleString(),
        scannedCount: (existing.scannedCount || 0) + 1
      };
    } else {
      scannedData.isDiscovered = true;
      scannedData.discoveredAt = new Date().toLocaleString();
      scannedData.scannedCount = 1;
      this.pokedexList.push(scannedData);
      this.pokedexList.sort((a, b) => a.id - b.id);
    }

    await this.saveToStorage();
    return { isFirstTime, entry: this.pokedexList[index !== -1 ? index : this.pokedexList.length - 1] };
  }

  private async saveToStorage(): Promise<void> {
    await Preferences.set({
      key: this.STORAGE_KEY,
      value: JSON.stringify(this.pokedexList)
    });
  }

  getDiscoveredCount(): number {
    return this.pokedexList.filter(p => p.isDiscovered).length;
  }

  getPokemonById(id: number): PokemonData | undefined {
    return this.pokedexList.find(p => p.id === id);
  }
}
