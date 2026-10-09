export interface PokemonType {
  name: string;
  color: string;
  bgPixel: string;
}

export interface PokemonStat {
  name: string;
  baseStat: number;
}

export type MoveLearnMethod = 'level-up' | 'machine' | 'tutor' | 'egg' | 'stadium' | 'light-ball-egg';
export type MachineKind = 'TM' | 'HM' | null;

export interface PokemonMove {
  name: string;              // ej: "tackle" (en minúsculas, formato PokeAPI)
  displayName: string;        // ej: "Tackle" (capitalizado)
  method: MoveLearnMethod;   // cómo se aprende
  level: number;             // nivel al que se aprende (0 si no es level-up)
  machineKind: MachineKind;  // 'TM', 'HM', o null si no aplica
  machineNumber?: number;    // ej: 1 para TM01/HM01
}

export interface PokemonData {
  id: number;
  apiName?: string;
  pokedexNumber: string;       // Ej: "#001" al "#151"
  name: string;
  formattedName: string;
  heightMeters: number;        // Altura en metros
  weightKg: number;           // Peso en kilogramos
  types: PokemonType[];
  abilities: string[];
  stats: PokemonStat[];
  moves: PokemonMove[];        // Movimientos de Gen 1 (Red/Blue/Yellow)
  description: string;         // Texto descriptivo de la Pokédex (flavor text en español)
  spritePixelUrl: string;      // Sprite 8-bit / Pixel Art
  spriteArtworkUrl: string;    // Ilustración oficial de alta resolución
  isDiscovered: boolean;
  discoveredAt?: string;
  scannedCount: number;
}
