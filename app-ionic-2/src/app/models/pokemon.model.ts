export interface PokemonType {
  name: string;
  color: string;
  bgPixel: string;
}

export interface PokemonStat {
  name: string;
  baseStat: number;
}

export interface PokemonData {
  id: number;
  apiName?: string;
  pokedexNumber: string; // Ej: "#001" al "#151"
  name: string;
  formattedName: string;
  heightMeters: number;   // Altura en metros
  weightKg: number;       // Peso en kilogramos
  types: PokemonType[];
  abilities: string[];
  stats: PokemonStat[];
  description: string;    // Texto descriptivo de la Pokédex
  spritePixelUrl: string; // Sprite 8-bit / Pixel Art (Gen 1 / Animated)
  spriteArtworkUrl: string; // Ilustración oficial de alta resolución
  isDiscovered: boolean;
  discoveredAt?: string;
  scannedCount: number;
}
