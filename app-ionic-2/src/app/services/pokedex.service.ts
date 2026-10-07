import { Injectable } from '@angular/core';
import { PokemonData } from '../models/pokemon.model';

@Injectable({
  providedIn: 'root'
})
export class PokedexService {
  private readonly BASE_URL = 'https://pokeapi.co/api/v2';
  public readonly TOTAL_KANTO_POKEMON = 151; // Límite estricto de la 1ª Generación

  // Mapeo de colores Pixel Art por cada tipo elemental
  private readonly TYPE_COLORS: Record<string, { nameEs: string; color: string; bgPixel: string }> = {
    normal:   { nameEs: 'NORMAL',   color: '#A8A878', bgPixel: '#6D6D4E' },
    fire:     { nameEs: 'FUEGO',    color: '#F08030', bgPixel: '#9C531F' },
    water:    { nameEs: 'AGUA',     color: '#6890F0', bgPixel: '#445E9C' },
    grass:    { nameEs: 'PLANTA',   color: '#78C850', bgPixel: '#4E8234' },
    electric: { nameEs: 'ELÉCTRICO',color: '#F8D030', bgPixel: '#A1871F' },
    ice:      { nameEs: 'HIELO',    color: '#98D8D8', bgPixel: '#638D8D' },
    fighting: { nameEs: 'LUCHA',    color: '#C03028', bgPixel: '#7D1F1A' },
    poison:   { nameEs: 'VENENO',   color: '#A040A0', bgPixel: '#682A68' },
    ground:   { nameEs: 'TIERRA',   color: '#E0C068', bgPixel: '#927D44' },
    flying:   { nameEs: 'VOLADOR',  color: '#A890F0', bgPixel: '#6D5E9C' },
    psychic:  { nameEs: 'PSÍQUICO', color: '#F85888', bgPixel: '#A13959' },
    bug:      { nameEs: 'BICHO',    color: '#A8B820', bgPixel: '#6D7815' },
    rock:     { nameEs: 'ROCA',     color: '#B8A038', bgPixel: '#786824' },
    ghost:    { nameEs: 'FANTASMA', color: '#705898', bgPixel: '#493963' },
    dragon:   { nameEs: 'DRAGÓN',   color: '#7038F8', bgPixel: '#4924A1' },
    steel:    { nameEs: 'ACERO',    color: '#B8B8D0', bgPixel: '#787887' },
    fairy:    { nameEs: 'HADA',     color: '#EE99AC', bgPixel: '#9B6470' }
  };

  /**
   * Obtiene la lista de los 151 Pokémon de la 1ª Generación desde PokéAPI
   */
  async getKantoPokemonList(): Promise<{ name: string; url: string; id: number }[]> {
    try {
      const res = await fetch(`${this.BASE_URL}/pokemon?limit=${this.TOTAL_KANTO_POKEMON}&offset=0`);
      if (!res.ok) throw new Error('Error al cargar catálogo de Kanto');
      const data = await res.json();
      return data.results.map((p: any, index: number) => ({
        name: p.name,
        url: p.url,
        id: index + 1
      }));
    } catch (error) {
      console.error('Error al obtener lista de Kanto:', error);
      return [];
    }
  }

  /**
   * Obtiene la información completa de un Pokémon (1-151) combinando datos técnicos y especie.
   */
  async getPokemonInfo(pokemonNameOrId: string | number): Promise<PokemonData> {
    try {
      // 1. Petición principal de datos del Pokémon
      const res = await fetch(`${this.BASE_URL}/pokemon/${pokemonNameOrId.toString().toLowerCase()}`);
      if (!res.ok) throw new Error(`Pokémon ${pokemonNameOrId} no encontrado en PokéAPI`);
      const rawData = await res.json();

      // Validación opcional de rango de Primera Generación (1 al 151)
      const pokemonId = rawData.id;
      if (pokemonId < 1 || pokemonId > this.TOTAL_KANTO_POKEMON) {
        console.warn(`El Pokémon #${pokemonId} (${rawData.name}) está fuera del rango de la 1ª Gen (1-151).`);
      }

      // 2. Petición de especie para descripción en español (flavor text)
      let description = 'Un misterioso Pokémon de la región de Kanto registrado en Realidad Aumentada.';
      try {
        const speciesRes = await fetch(`${this.BASE_URL}/pokemon-species/${pokemonId}`);
        if (speciesRes.ok) {
          const speciesData = await speciesRes.json();
          // Buscar texto descriptivo en español, o fallback a inglés
          const esEntry = speciesData.flavor_text_entries.find(
            (e: any) => e.language.name === 'es' || e.language.name === 'es-ES'
          );
          const fallbackEntry = speciesData.flavor_text_entries.find(
            (e: any) => e.language.name === 'en'
          );
          if (esEntry) {
            description = esEntry.flavor_text.replace(/[\n\f\r]/g, ' ');
          } else if (fallbackEntry) {
            description = fallbackEntry.flavor_text.replace(/[\n\f\r]/g, ' ');
          }
        }
      } catch (err) {
        console.warn('No se pudo cargar la descripción de especie:', err);
      }

      // 3. Formateo y transformación de medidas
      const formattedNumber = `#${rawData.id.toString().padStart(3, '0')}`;
      const heightMeters = rawData.height / 10; // decímetros -> metros
      const weightKg = rawData.weight / 10;      // hectogramos -> kilogramos

      const types = rawData.types.map((t: any) => {
        const typeInfo = this.TYPE_COLORS[t.type.name] || {
          nameEs: t.type.name.toUpperCase(),
          color: '#888888',
          bgPixel: '#444444'
        };
        return {
          name: typeInfo.nameEs,
          color: typeInfo.color,
          bgPixel: typeInfo.bgPixel
        };
      });

      const abilities = rawData.abilities.map((a: any) =>
        a.ability.name.replace('-', ' ').toUpperCase()
      );

      const stats = rawData.stats.map((s: any) => ({
        name: s.stat.name.toUpperCase().replace('-', ' '),
        baseStat: s.base_stat
      }));

      // Sprites Pixel Art: Animated 8-bit / Clásico Red-Blue / Sprite oficial
      const spritePixelUrl =
        rawData.sprites.versions?.['generation-v']?.['black-white']?.animated?.front_default ||
        rawData.sprites.versions?.['generation-i']?.['red-blue']?.front_default ||
        rawData.sprites.front_default ||
        `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${rawData.id}.png`;

      const spriteArtworkUrl =
        rawData.sprites.other?.['official-artwork']?.front_default ||
        spritePixelUrl;

      return {
        id: rawData.id,
        apiName: rawData.name,
        pokedexNumber: formattedNumber,
        name: rawData.name.toUpperCase(),
        formattedName: rawData.name.charAt(0).toUpperCase() + rawData.name.slice(1),
        heightMeters,
        weightKg,
        types,
        abilities,
        stats,
        description,
        spritePixelUrl,
        spriteArtworkUrl,
        isDiscovered: true,
        scannedCount: 1
      };
    } catch (error) {
      console.error('Error al consultar PokéAPI:', error);
      throw error;
    }
  }
}
