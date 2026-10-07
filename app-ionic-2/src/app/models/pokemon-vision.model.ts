export interface PokemonVisionResult {
  detected: boolean;        // true si se detectó claramente un Pokémon de Kanto (#001-#151)
  pokemonId: number;        // ID en Kanto (#001 al #151) o 0 si no hay ninguno
  name: string;             // Nombre en minúsculas (ej: 'pikachu') o 'none'
  displayName: string;      // Nombre formateado (ej: 'Pikachu') o 'Ninguno'
  confidence: number;       // Nivel de confianza de 0.0 a 1.0 (ej: 0.95)
  source: 'server_vision' | 'client_fallback' | 'manual_target';
  details?: string;         // Descripción técnica del objeto reconocido
}
