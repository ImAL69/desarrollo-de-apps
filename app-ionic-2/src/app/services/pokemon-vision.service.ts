import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { PokemonVisionResult } from '../models/pokemon-vision.model';

@Injectable({
  providedIn: 'root'
})
export class PokemonVisionService {
  private visionServerUrl = this.resolveVisionUrl();

  private resolveVisionUrl(): string {
    const customIp = typeof localStorage !== 'undefined' ? localStorage.getItem('pokedex_server_ip') : null;
    if (customIp) {
      return `http://${customIp}:3000/api/vision/identify`;
    }

    const platform = Capacitor.getPlatform();
    if (platform === 'android') {
      // En emulador Android mapea a 10.0.2.2.
      // Si se usa celular físico por USB con 'adb reverse tcp:3000 tcp:3000', localhost:3000 funciona directo.
      return 'http://10.0.2.2:3000/api/vision/identify';
    }
    const host = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost';
    return `http://${host}:3000/api/vision/identify`;
  }

  public setCustomVisionUrl(url: string): void {
    this.visionServerUrl = url;
  }

  /**
   * Extrae un fotograma del stream de video de la cámara hacia un canvas oculto en base64 (JPEG)
   */
  captureFrame(videoElement: HTMLVideoElement): string | null {
    if (!videoElement || videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
      return null;
    }

    const canvas = document.createElement('canvas');
    const targetWidth = Math.min(videoElement.videoWidth, 640);
    const targetHeight = Math.round((targetWidth / videoElement.videoWidth) * videoElement.videoHeight);

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(videoElement, 0, 0, targetWidth, targetHeight);
    return canvas.toDataURL('image/jpeg', 0.85);
  }

  /**
   * Envía el fotograma al motor de visión para clasificar el juguete, figura 3D o imagen real
   */
  async identifyPokemon(imageBase64: string): Promise<PokemonVisionResult> {
    try {
      const response = await fetch(this.visionServerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64 })
      });

      if (response.ok) {
        const data = await response.json();
        const isDetected = Boolean(data.detected || (data.pokemonId >= 1 && data.pokemonId <= 151));

        if (isDetected && data.pokemonId >= 1 && data.pokemonId <= 151) {
          return {
            detected: true,
            pokemonId: data.pokemonId,
            name: data.name,
            displayName: data.displayName || data.name.toUpperCase(),
            confidence: data.confidence || 0.95,
            source: 'server_vision',
            details: data.description || 'Pokémon de Kanto identificado por Visión Artificial'
          };
        }

        return {
          detected: false,
          pokemonId: 0,
          name: 'none',
          displayName: 'Ninguno',
          confidence: 0,
          source: 'server_vision',
          details: data.description || 'Ningún Pokémon detectado en la mira'
        };
      }
    } catch (err) {
      console.warn('Servidor de visión local no disponible:', err);
    }

    return {
      detected: false,
      pokemonId: 0,
      name: 'none',
      displayName: 'Ninguno',
      confidence: 0,
      source: 'client_fallback',
      details: 'Conexión con el servidor de visión no disponible'
    };
  }
}
