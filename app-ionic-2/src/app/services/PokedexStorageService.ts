import { computed, Injectable, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { PokemonData } from '../models/pokemon.model';

@Injectable({
  providedIn: 'root'
})
export class PokedexStorageService {
  private readonly STORAGE_KEY = 'pokedex_registered_entries_gen1';
  public readonly totalPokemons = 151;
  public readonly entries = signal<PokemonData[]>([]);
  public readonly discoveredCount = computed(() =>
    this.entries().filter(pokemon => pokemon.isDiscovered).length
  );
  private initializationPromise: Promise<PokemonData[]> | null = null;

  initPokedexDatabase(): Promise<PokemonData[]> {
    if (!this.initializationPromise) {
      const initialization = this.loadDatabase();
      this.initializationPromise = initialization;
      void initialization.catch(() => {
        if (this.initializationPromise === initialization) {
          this.initializationPromise = null;
        }
      });
    }
    return this.initializationPromise;
  }

  async reload(): Promise<PokemonData[]> {
    const entries = await this.loadDatabase();
    this.initializationPromise = Promise.resolve(entries);
    return entries;
  }

  async registerDiscoveredPokemon(
    scannedData: PokemonData
  ): Promise<{ isFirstTime: boolean; entry: PokemonData }> {
    await this.initPokedexDatabase();

    const currentEntries = this.entries();
    const existing = currentEntries.find(pokemon => pokemon.id === scannedData.id);
    const entry: PokemonData = {
      ...scannedData,
      isDiscovered: true,
      discoveredAt: existing?.discoveredAt || new Date().toLocaleString(),
      scannedCount: (existing?.scannedCount || 0) + 1
    };
    const entries = currentEntries
      .map(pokemon => pokemon.id === entry.id ? entry : pokemon)
      .sort((first, second) => first.id - second.id);

    this.entries.set(entries);
    await this.saveToStorage(entries);
    return { isFirstTime: !existing?.isDiscovered, entry };
  }

  getDiscoveredCount(): number {
    return this.discoveredCount();
  }

  getPokemonById(id: number): PokemonData | undefined {
    return this.entries().find(pokemon => pokemon.id === id);
  }

  private async loadDatabase(): Promise<PokemonData[]> {
    const { value } = await Preferences.get({ key: this.STORAGE_KEY });
    const storedEntries: PokemonData[] = value ? JSON.parse(value) : [];
    const entries = this.normalizeEntries(storedEntries);
    this.entries.set(entries);

    if (!value || JSON.stringify(storedEntries) !== JSON.stringify(entries)) {
      await this.saveToStorage(entries);
    }

    return entries;
  }

  private normalizeEntries(storedEntries: PokemonData[]): PokemonData[] {
    const entriesById = new Map<number, PokemonData>();
    for (const entry of storedEntries) {
      if (Number.isInteger(entry?.id) && entry.id >= 1 && entry.id <= this.totalPokemons) {
        entriesById.set(entry.id, entry);
      }
    }

    return Array.from({ length: this.totalPokemons }, (_, index) => {
      const id = index + 1;
      return { ...this.createPlaceholder(id), ...entriesById.get(id), id };
    });
  }

  private createPlaceholder(id: number): PokemonData {
    return {
      id,
      pokedexNumber: `#${id.toString().padStart(3, '0')}`,
      name: '???',
      formattedName: '???',
      heightMeters: 0,
      weightKg: 0,
      types: [{ name: 'DESCONOCIDO', color: '#686868', bgPixel: '#383838' }],
      abilities: ['???'],
      stats: [],
      moves: [],
      description: 'Este Pokémon de Kanto aún no ha sido escaneado ni registrado en tu Pokédex.',
      spritePixelUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`,
      spriteArtworkUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`,
      isDiscovered: false,
      scannedCount: 0
    };
  }

  private async saveToStorage(entries: PokemonData[]): Promise<void> {
    await Preferences.set({
      key: this.STORAGE_KEY,
      value: JSON.stringify(entries)
    });
  }
}
