import { TestBed } from '@angular/core/testing';

import { PokemonData } from '../models/pokemon.model';
import { PokedexStorageService } from './PokedexStorageService';

describe('PokedexStorageService', () => {
  let service: PokedexStorageService;

  beforeEach(() => {
    localStorage.clear();
    service = TestBed.inject(PokedexStorageService);
  });

  it('initializes the full catalog before registration and counts repeated scans', async () => {
    const pokemon: PokemonData = {
      id: 94,
      apiName: 'gengar',
      pokedexNumber: '#094',
      name: 'GENGAR',
      formattedName: 'Gengar',
      heightMeters: 1.5,
      weightKg: 40.5,
      types: [{ name: 'FANTASMA', color: '#705898', bgPixel: '#493963' }],
      abilities: ['CURSED BODY'],
      stats: [],
      moves: [],
      description: 'Se oculta en las sombras.',
      spritePixelUrl: '',
      spriteArtworkUrl: '',
      isDiscovered: true,
      scannedCount: 1
    };

    const firstScan = await service.registerDiscoveredPokemon(pokemon);

    expect(service.entries()).toHaveLength(151);
    expect(service.discoveredCount()).toBe(1);
    expect(firstScan.isFirstTime).toBe(true);
    expect(firstScan.entry.id).toBe(94);

    const secondScan = await service.registerDiscoveredPokemon(pokemon);

    expect(secondScan.isFirstTime).toBe(false);
    expect(secondScan.entry.id).toBe(94);
    expect(secondScan.entry.scannedCount).toBe(2);
    expect(service.discoveredCount()).toBe(1);
  });
});
