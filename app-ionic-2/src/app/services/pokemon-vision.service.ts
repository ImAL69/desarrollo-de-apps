import { Injectable, inject } from '@angular/core';
import { PokemonVisionResult } from '../models/pokemon-vision.model';
import { ServerConfigService } from './server-config.service';

@Injectable({
  providedIn: 'root'
})
export class PokemonVisionService {
  private serverConfig = inject(ServerConfigService);

  captureFrame(videoElement: HTMLVideoElement): string | null {
    if (!videoElement || videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
      return null;
    }

    const canvas = document.createElement('canvas');
    const targetWidth = Math.min(videoElement.videoWidth, 640);
    const targetHeight = Math.round((targetWidth / videoElement.videoWidth) * videoElement.videoHeight);

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const context = canvas.getContext('2d');
    if (!context) return null;

    context.drawImage(videoElement, 0, 0, targetWidth, targetHeight);
    return canvas.toDataURL('image/jpeg', 0.85);
  }

  async identifyPokemon(imageBase64: string): Promise<PokemonVisionResult> {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);

    try {
      const baseUrl = await this.serverConfig.resolve();
      const response = await fetch(`${baseUrl}/api/vision/identify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64 }),
        signal: controller.signal
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        return this.failure(
          response.status === 503 && data.retryable ? 'busy' : 'invalid',
          String(data.error || 'El servidor no pudo analizar la imagen.')
        );
      }

      const pokemonId = Number(data.pokemonId);
      const isDetected = Boolean(data.detected) &&
        Number.isInteger(pokemonId) &&
        pokemonId >= 1 &&
        pokemonId <= 151;

      if (!isDetected) {
        return {
          detected: false,
          pokemonId: 0,
          name: String(data.name || 'none'),
          displayName: String(data.displayName || 'Ninguno'),
          confidence: Number(data.confidence) || 0,
          source: 'server_vision',
          details: String(data.description || 'Ningún Pokémon detectado en la mira')
        };
      }

      const name = String(data.name || '');
      return {
        detected: true,
        pokemonId,
        name,
        displayName: String(data.displayName || (name ? name.toUpperCase() : 'Ninguno')),
        confidence: Number(data.confidence) || 0.95,
        source: 'server_vision',
        details: String(data.description || 'Pokémon de Kanto identificado por Visión Artificial')
      };
    } catch (error) {
      const message = error instanceof Error && error.name === 'AbortError'
        ? 'La solicitud de visión superó el tiempo de espera.'
        : 'Conexión con el servidor de visión no disponible.';
      return this.failure('offline', message);
    } finally {
      window.clearTimeout(timeout);
    }
  }

  private failure(errorKind: 'busy' | 'offline' | 'invalid', details: string): PokemonVisionResult {
    return {
      detected: false,
      pokemonId: 0,
      name: 'none',
      displayName: 'Ninguno',
      confidence: 0,
      source: errorKind === 'offline' ? 'client_fallback' : 'server_vision',
      details,
      errorKind
    };
  }
}
