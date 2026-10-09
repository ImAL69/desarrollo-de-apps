import { Injectable, inject } from '@angular/core';
import {
  PokemonData,
  PokemonMove,
  MoveLearnMethod,
  MachineKind
} from '../models/pokemon.model';
import { DatabaseService } from './database.service';

@Injectable({
  providedIn: 'root'
})
export class PokedexService {
  private readonly BASE_URL = 'https://pokeapi.co/api/v2';
  public readonly TOTAL_KANTO_POKEMON = 151;

  private db = inject(DatabaseService);

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

  // Versiones de Gen 1 (Kanto) que aplican
  private readonly GEN1_VERSION_GROUPS = new Set(['red-blue', 'yellow']);

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
   * Obtiene la info completa de un Pokémon (1-151). Cache-first con SQLite.
   * Incluye movimientos de Gen 1 (Red/Blue/Yellow) con distinción TM/HM.
   */
  async getPokemonInfo(pokemonNameOrId: string | number): Promise<PokemonData> {
    const idNum = typeof pokemonNameOrId === 'number'
      ? pokemonNameOrId
      : parseInt(pokemonNameOrId, 10) || 0;

    // 0. Cache-first (SQLite o memoria)
    if (idNum >= 1 && idNum <= this.TOTAL_KANTO_POKEMON) {
      const cached = await this.db.getPokemon(idNum);
      if (cached) {
        // Marcamos como descubierto porque el caller lo va a persistir
        return { ...cached, isDiscovered: true, scannedCount: 1 };
      }
    }

    // 1. Petición principal
    const res = await fetch(`${this.BASE_URL}/pokemon/${pokemonNameOrId.toString().toLowerCase()}`);
    if (!res.ok) throw new Error(`Pokémon ${pokemonNameOrId} no encontrado en PokéAPI`);
    const rawData = await res.json();

    const pokemonId = rawData.id;
    if (pokemonId < 1 || pokemonId > this.TOTAL_KANTO_POKEMON) {
      console.warn(`El Pokémon #${pokemonId} (${rawData.name}) está fuera del rango de la 1ª Gen.`);
    }

    // 2. Specie + descripción en español
    let description = 'Un misterioso Pokémon de la región de Kanto registrado en Realidad Aumentada.';
    try {
      const speciesRes = await fetch(`${this.BASE_URL}/pokemon-species/${pokemonId}`);
      if (speciesRes.ok) {
        const speciesData = await speciesRes.json();
        const esEntry = speciesData.flavor_text_entries.find(
          (e: any) => e.language.name === 'es' || e.language.name === 'es-ES'
        );
        const fallbackEntry = speciesData.flavor_text_entries.find(
          (e: any) => e.language.name === 'en'
        );
        if (esEntry) description = esEntry.flavor_text.replace(/[\n\f\r]/g, ' ').replace(/\s+/g, ' ').trim();
        else if (fallbackEntry) description = fallbackEntry.flavor_text.replace(/[\n\f\r]/g, ' ').replace(/\s+/g, ' ').trim();
      }
    } catch (err) {
      console.warn('No se pudo cargar la descripción de especie:', err);
    }

    // 3. Datos básicos
    const formattedNumber = `#${rawData.id.toString().padStart(3, '0')}`;
    const heightMeters = rawData.height / 10;
    const weightKg = rawData.weight / 10;

    const types = rawData.types.map((t: any) => {
      const typeInfo = this.TYPE_COLORS[t.type.name] || {
        nameEs: t.type.name.toUpperCase(),
        color: '#888888',
        bgPixel: '#444444'
      };
      return { name: typeInfo.nameEs, color: typeInfo.color, bgPixel: typeInfo.bgPixel };
    });

    const abilities = rawData.abilities
      .filter((a: any) => !a.is_hidden || a.is_hidden === false || rawData.abilities.length === 1)
      .map((a: any) => a.ability.name.replace('-', ' ').toUpperCase());

    const stats = rawData.stats.map((s: any) => ({
      name: s.stat.name.toUpperCase().replace('-', ' '),
      baseStat: s.base_stat
    }));

    const spritePixelUrl =
      rawData.sprites.versions?.['generation-v']?.['black-white']?.animated?.front_default ||
      rawData.sprites.versions?.['generation-i']?.['red-blue']?.front_default ||
      rawData.sprites.front_default ||
      `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${rawData.id}.png`;

    const spriteArtworkUrl =
      rawData.sprites.other?.['official-artwork']?.front_default ||
      spritePixelUrl;

    // 4. Movimientos de Gen 1 (Red/Blue/Yellow) con distinción TM/HM
    const moves = await this.extractGen1Moves(rawData.moves || []);

    const pokemon: PokemonData = {
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
      moves,
      description,
      spritePixelUrl,
      spriteArtworkUrl,
      isDiscovered: true,
      scannedCount: 1
    };

    // 5. Guardar en caché (no bloquea el retorno)
    void this.db.savePokemon(pokemon).catch(err =>
      console.warn('[PokedexService] No se pudo cachear Pokémon', pokemonId, err)
    );

    return pokemon;
  }

  /**
   * Extrae los movimientos aprendidos en Gen 1 (Red/Blue/Yellow) desde la respuesta cruda de PokéAPI.
   * Distingue entre movimientos naturales (level-up, egg, tutor) y por máquina (TM/HM).
   */
  private async extractGen1Moves(rawMoves: any[]): Promise<PokemonMove[]> {
    const seen = new Set<string>();
    const result: PokemonMove[] = [];

    // Mapa para deduplicar (mismo move name puede aparecer en Red-Blue y Yellow)
    for (const m of rawMoves) {
      const moveName: string = m.move?.name || '';
      if (!moveName) continue;

      const vgd = (m.version_group_details || []).find(
        (d: any) => this.GEN1_VERSION_GROUPS.has(d.version_group?.name)
      );
      if (!vgd) continue;

      const method = vgd.move_learn_method?.name as MoveLearnMethod;
      const level = vgd.level_learned_at || 0;
      const key = `${moveName}|${method}`;
      if (seen.has(key)) continue;
      seen.add(key);

      let machineKind: MachineKind = null;
      let machineNumber: number | undefined;

      if (method === 'machine') {
        // Para saber si es TM o HM, hay que consultar /api/v2/machine/{id}
        const machineUrl: string = vgd.move_learn_method?.url || '';
        // En realidad, PokéAPI expone el machine en otra ruta; usamos /move/{id} para ello
        try {
          const moveData = await this.fetchMove(moveName);
          // Buscar en qué máquina está este movimiento en Gen 1
          const gen1Machine = (moveData.machines || []).find(
            (mm: any) => mm.version_group && this.GEN1_VERSION_GROUPS.has(mm.version_group.name)
          );
          if (gen1Machine) {
            const machineId = this.extractIdFromUrl(gen1Machine.machine.url);
            const itemData = await this.fetchMachineItem(machineId);
            const itemName: string = itemData.name || '';
            // Los nombres de items en Gen 1 son: 'tm01' .. 'tm50', 'hm01' .. 'hm07'
            const match = itemName.match(/^(tm|hm)(\d+)$/i);
            if (match) {
              machineKind = match[1].toUpperCase() as 'TM' | 'HM';
              machineNumber = parseInt(match[2], 10);
            }
          }
        } catch (err) {
          console.warn(`[PokedexService] No se pudo resolver máquina para ${moveName}:`, err);
        }
      }

      result.push({
        name: moveName,
        displayName: moveName.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' '),
        method,
        level,
        machineKind,
        machineNumber
      });
    }

    // Ordenar: primero level-up por nivel, luego egg, tutor, machine
    const methodOrder: MoveLearnMethod[] = ['level-up', 'egg', 'tutor', 'machine', 'stadium', 'light-ball-egg'];
    result.sort((a, b) => {
      const ai = methodOrder.indexOf(a.method);
      const bi = methodOrder.indexOf(b.method);
      if (ai !== bi) return ai - bi;
      if (a.method === 'level-up') return a.level - b.level;
      if (a.method === 'machine' && b.method === 'machine') {
        // TM antes que HM, luego por número
        if (a.machineKind !== b.machineKind) {
          if (a.machineKind === 'TM') return -1;
          if (b.machineKind === 'TM') return 1;
        }
        return (a.machineNumber || 0) - (b.machineNumber || 0);
      }
      return a.name.localeCompare(b.name);
    });

    return result;
  }

  private async fetchMove(moveName: string): Promise<any> {
    const res = await fetch(`${this.BASE_URL}/move/${moveName}/`);
    if (!res.ok) throw new Error(`No se pudo cargar el movimiento ${moveName}`);
    return res.json();
  }

  private async fetchMachineItem(machineId: number): Promise<{ name: string }> {
    if (!machineId) return { name: '' };
    const res = await fetch(`${this.BASE_URL}/machine/${machineId}/`);
    if (!res.ok) return { name: '' };
    const data = await res.json();
    // El item real está en data.item.url → /api/v2/item/{id}
    const itemUrl: string = data.item?.url || '';
    const itemId = this.extractIdFromUrl(itemUrl);
    if (!itemId) return { name: '' };
    const itemRes = await fetch(`${this.BASE_URL}/item/${itemId}/`);
    if (!itemRes.ok) return { name: '' };
    const itemData = await itemRes.json();
    return { name: itemData.name || '' };
  }

  private extractIdFromUrl(url: string): number {
    const match = url.match(/\/(\d+)\/?$/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Precarga todos los 151 Pokémon en la caché SQLite (operación de sincronización inicial).
   * Útil la primera vez que se abre la app para permitir uso 100% offline.
   */
  async preloadAllKantoPokemon(onProgress?: (current: number, total: number) => void): Promise<void> {
    for (let i = 1; i <= this.TOTAL_KANTO_POKEMON; i++) {
      const cached = await this.db.getPokemon(i);
      if (cached) {
        onProgress?.(i, this.TOTAL_KANTO_POKEMON);
        continue;
      }
      try {
        await this.getPokemonInfo(i);
      } catch (err) {
        console.warn(`[PokedexService] Error precargando #${i}:`, err);
      }
      onProgress?.(i, this.TOTAL_KANTO_POKEMON);
    }
  }
}
