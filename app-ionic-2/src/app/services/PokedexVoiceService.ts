import { Injectable } from '@angular/core';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { Capacitor } from '@capacitor/core';

@Injectable({
  providedIn: 'root'
})
export class PokedexVoiceService {
  // Para un teléfono físico usa la IPv4 de la computadora en la misma red Wi-Fi.
  // Ejemplo: http://192.168.1.15:3000/api/tts
  private openJTalkServerUrl = this.resolveServerUrl();
  private audioElement = new Audio();
  public isSpeaking = false;

  /**
   * Resuelve automáticamente la IP del servidor según la plataforma
   */
  private resolveServerUrl(): string {
    const customIp = typeof localStorage !== 'undefined' ? localStorage.getItem('pokedex_server_ip') : null;
    if (customIp) {
      return `http://${customIp}:3000/api/tts`;
    }

    const platform = Capacitor.getPlatform();
    if (platform === 'android') {
      return 'http://10.0.2.2:3000/api/tts';
    }
    const host = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost';
    return `http://${host}:3000/api/tts`;
  }

  /**
   * Permite cambiar la URL del servidor dinámicamente si pruebas en dispositivo físico
   */
  public setCustomServerUrl(url: string): void {
    this.openJTalkServerUrl = url;
  }

  /**
   * Genera y pronuncia el discurso oficial de la Pokédex para el Pokémon escaneado.
   */
  async announcePokemon(pokemon: {
    formattedName: string;
    types: { name: string }[];
    heightMeters: number;
    weightKg: number;
    description: string;
  }): Promise<void> {
    const typeList = pokemon.types.map(t => t.name).join(' y ');
    const speechText = `${pokemon.formattedName}. Pokémon de tipo ${typeList}. Altura: ${pokemon.heightMeters} metros. Peso: ${pokemon.weightKg} kilogramos. ${pokemon.description}`;

    await this.speak(speechText, pokemon.formattedName);
  }

  /**
   * Reproduce el texto usando OpenJTalk local o síntesis nativa con modulación robótica.
   */
  async speak(text: string, phoneticName?: string): Promise<void> {
    this.stop(); // Detener cualquier reproducción previa
    this.isSpeaking = true;

    try {
      // 1. Intento principal: Síntesis con OpenJTalk en servidor local
      if (this.openJTalkServerUrl) {
        // Para OpenJTalk podemos enviar el texto completo o el nombre fonético
        const canUseServer = await this.tryOpenJTalk(phoneticName || text);
        if (canUseServer) return;
      }

      // 2. Fallback Automático: Capacitor Text-To-Speech nativo (móvil)
      await TextToSpeech.speak({
        text: text,
        lang: 'es-ES',
        rate: 0.95,        // Velocidad pausada y clara estilo Pokédex
        pitch: 1.15,       // Tono agudo y sintético estilo anime retro
        volume: 1.0,
        category: 'ambient'
      });
    } catch {
      // 3. Fallback Final: Web Speech API del navegador (Chrome / Safari / Firefox)
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-ES';
        utterance.rate = 0.95;
        utterance.pitch = 1.15;
        utterance.onend = () => { this.isSpeaking = false; };
        utterance.onerror = () => { this.isSpeaking = false; };
        window.speechSynthesis.speak(utterance);
      }
    } finally {
      this.isSpeaking = false;
    }
  }

  /**
   * Realiza la solicitud HTTP al microservicio local de OpenJTalk y reproduce el buffer WAV
   */
  private tryOpenJTalk(text: string): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const url = `${this.openJTalkServerUrl}?text=${encodeURIComponent(text)}&voice=nitech&rate=1.0&pitch=1.1`;

        this.audioElement.src = url;

        // Timeout de 2 segundos: si el servidor local no responde rápido, saltar al fallback
        const timeout = setTimeout(() => {
          this.audioElement.onplay = null;
          this.audioElement.onerror = null;
          resolve(false);
        }, 2000);

        this.audioElement.onplay = () => {
          clearTimeout(timeout);
          this.isSpeaking = true;
        };

        this.audioElement.onended = () => {
          this.isSpeaking = false;
        };

        this.audioElement.onerror = () => {
          clearTimeout(timeout);
          resolve(false);
        };

        this.audioElement.play().then(() => {
          resolve(true);
        }).catch(() => {
          clearTimeout(timeout);
          resolve(false);
        });
      } catch {
        resolve(false);
      }
    });
  }

  /**
   * Detiene la reproducción en curso en cualquiera de los motores
   */
  stop(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    TextToSpeech.stop().catch(() => {});
    this.isSpeaking = false;
  }
}
