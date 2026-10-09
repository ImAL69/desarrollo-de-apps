import { Injectable, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { PokemonData } from '../models/pokemon.model';

/**
 * Servicio de caché local con SQLite (@capacitor-community/sqlite) para datos
 * completos de los 151 Pokémon de Kanto, incluyendo movimientos, habilidades,
 * tipos, stats y descripciones en español.
 *
 * En web fallback: usa un Map en memoria (los datos se cargan desde PokéAPI
 * la primera vez y se mantienen solo mientras la sesión está abierta).
 */
@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  public readonly isReady = signal(false);
  private sqlite: any = null;
  private connection: any = null;
  private memoryCache = new Map<number, PokemonData>();
  private initPromise: Promise<void> | null = null;

  async ensureReady(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    this.initPromise = this.initialize();
    return this.initPromise;
  }

  private async initialize(): Promise<void> {
    if (Capacitor.getPlatform() === 'web') {
      // Web fallback: usar caché en memoria. La sincronización se hace on-demand.
      this.isReady.set(true);
      return;
    }

    try {
      // Import dinámico para evitar error en web (donde el plugin no está disponible)
      const { CapacitorSQLite, SQLiteConnection } = await import('@capacitor-community/sqlite');
      this.sqlite = new SQLiteConnection(CapacitorSQLite);
      const dbName = 'pokedex_kanto.db';
      const dbVersion = 1;
      this.connection = await this.sqlite.createConnection(
        dbName,
        false,
        'no-encryption',
        dbVersion,
        false
      );
      await this.connection.open();
      await this.createSchema();
      this.isReady.set(true);
    } catch (err) {
      console.warn('[DatabaseService] SQLite no disponible, usando caché en memoria:', err);
      this.sqlite = null;
      this.connection = null;
      this.isReady.set(true);
    }
  }

  private async createSchema(): Promise<void> {
    if (!this.connection) return;
    const stmts = [
      `CREATE TABLE IF NOT EXISTS pokemon_cache (
        id INTEGER PRIMARY KEY,
        api_name TEXT,
        pokedex_number TEXT,
        name TEXT,
        formatted_name TEXT,
        height_meters REAL,
        weight_kg REAL,
        types_json TEXT,
        abilities_json TEXT,
        stats_json TEXT,
        moves_json TEXT,
        description TEXT,
        sprite_pixel_url TEXT,
        sprite_artwork_url TEXT,
        cached_at INTEGER
      );`,
      `CREATE INDEX IF NOT EXISTS idx_pokemon_name ON pokemon_cache(name);`
    ];
    for (const stmt of stmts) {
      await this.connection.execute(stmt);
    }
  }

  async getPokemon(id: number): Promise<PokemonData | null> {
    await this.ensureReady();
    if (this.memoryCache.has(id)) return this.memoryCache.get(id)!;
    if (!this.connection) return null;
    try {
      const result = await this.connection.query('SELECT * FROM pokemon_cache WHERE id = ?', [id]);
      if (!result.values || result.values.length === 0) return null;
      return this.rowToPokemon(result.values[0]);
    } catch (err) {
      console.warn('[DatabaseService] Error leyendo Pokémon', id, err);
      return null;
    }
  }

  async getAllCachedPokemon(): Promise<PokemonData[]> {
    await this.ensureReady();
    if (!this.connection) {
      return Array.from(this.memoryCache.values());
    }
    try {
      const result = await this.connection.query('SELECT * FROM pokemon_cache ORDER BY id ASC');
      if (!result.values) return [];
      return result.values.map((row: any) => this.rowToPokemon(row));
    } catch (err) {
      console.warn('[DatabaseService] Error listando Pokémon cacheados:', err);
      return [];
    }
  }

  async savePokemon(pokemon: PokemonData): Promise<void> {
    await this.ensureReady();
    this.memoryCache.set(pokemon.id, pokemon);
    if (!this.connection) return;
    try {
      await this.connection.run(
        `INSERT OR REPLACE INTO pokemon_cache
          (id, api_name, pokedex_number, name, formatted_name, height_meters, weight_kg,
           types_json, abilities_json, stats_json, moves_json, description,
           sprite_pixel_url, sprite_artwork_url, cached_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          pokemon.id,
          pokemon.apiName || '',
          pokemon.pokedexNumber,
          pokemon.name,
          pokemon.formattedName,
          pokemon.heightMeters,
          pokemon.weightKg,
          JSON.stringify(pokemon.types),
          JSON.stringify(pokemon.abilities),
          JSON.stringify(pokemon.stats),
          JSON.stringify(pokemon.moves),
          pokemon.description,
          pokemon.spritePixelUrl,
          pokemon.spriteArtworkUrl,
          Date.now()
        ]
      );
    } catch (err) {
      console.warn('[DatabaseService] Error guardando Pokémon', pokemon.id, err);
    }
  }

  async getCachedCount(): Promise<number> {
    await this.ensureReady();
    if (!this.connection) return this.memoryCache.size;
    try {
      const result = await this.connection.query('SELECT COUNT(*) as cnt FROM pokemon_cache');
      const row = result.values?.[0];
      return row?.cnt ?? 0;
    } catch {
      return 0;
    }
  }

  private rowToPokemon(row: any): PokemonData {
    return {
      id: row.id,
      apiName: row.api_name || undefined,
      pokedexNumber: row.pokedex_number,
      name: row.name,
      formattedName: row.formatted_name,
      heightMeters: row.height_meters,
      weightKg: row.weight_kg,
      types: JSON.parse(row.types_json || '[]'),
      abilities: JSON.parse(row.abilities_json || '[]'),
      stats: JSON.parse(row.stats_json || '[]'),
      moves: JSON.parse(row.moves_json || '[]'),
      description: row.description || '',
      spritePixelUrl: row.sprite_pixel_url,
      spriteArtworkUrl: row.sprite_artwork_url,
      isDiscovered: true,
      scannedCount: 0
    };
  }
}
