import { Injectable, inject, signal } from '@angular/core';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { Capacitor } from '@capacitor/core';
import { PokemonData } from '../models/pokemon.model';
import { ServerConfigService } from './server-config.service';

@Injectable({
  providedIn: 'root'
})
export class PokedexVoiceService {
  public readonly isSpeaking = signal(false);
  private audioElement = new Audio();
  private generation = 0;
  private serverConfig = inject(ServerConfigService);

  async announcePokemon(pokemon: PokemonData): Promise<void> {
    const generation = this.startSequence();
    const name = (pokemon.apiName ?? pokemon.formattedName.toLowerCase()).toLowerCase();
    const typeList = pokemon.types.map(type => type.name).join(' y ');
    const speechText = `${pokemon.formattedName}. Pokémon número ${pokemon.id} de tipo ${typeList}. Altura ${pokemon.heightMeters} metros. Peso ${pokemon.weightKg} kilogramos. ${pokemon.description}`;

    try {
      // 1. Intro en japonés con OpenJTalk (anime-style)
      await this.playOpenJTalkName(name, generation);
      if (!this.isCurrent(generation)) return;
      // 2. Descripción completa en español: pre-grabado MP3 si existe, fallback Web Speech
      const played = await this.playPrerecordedAudio(pokemon.id, generation);
      if (!this.isCurrent(generation)) return;
      if (!played) {
        // Sin MP3 disponible, narramos en español con TTS del sistema
        await this.speakSpanish(speechText, generation);
      }
    } finally {
      if (this.isCurrent(generation)) {
        this.isSpeaking.set(false);
      }
    }
  }

  async speak(text: string): Promise<void> {
    const generation = this.startSequence();
    try {
      await this.speakSpanish(text, generation);
    } finally {
      if (this.isCurrent(generation)) {
        this.isSpeaking.set(false);
      }
    }
  }

  stop(): void {
    this.generation++;
    this.stopPlayback();
    this.isSpeaking.set(false);
  }

  private startSequence(): number {
    this.stopPlayback();
    this.generation++;
    this.isSpeaking.set(true);
    return this.generation;
  }

  private stopPlayback(): void {
    this.audioElement.pause();
    this.audioElement.currentTime = 0;
    this.audioElement.onended = null;
    this.audioElement.onerror = null;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    void TextToSpeech.stop().catch(() => undefined);
  }

  private async playOpenJTalkName(name: string, generation: number): Promise<void> {
    try {
      const baseUrl = await this.serverConfig.resolve();
      if (!this.isCurrent(generation)) return;
      const url = `${baseUrl}/api/tts?text=${encodeURIComponent(name)}`;
      await new Promise<void>(resolve => {
        let settled = false;
        const finish = (timedOut = false) => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timeout);
          this.audioElement.onended = null;
          this.audioElement.onerror = null;
          if (timedOut) {
            this.audioElement.pause();
            this.audioElement.currentTime = 0;
          }
          resolve();
        };
        const timeout = window.setTimeout(() => finish(true), 6000);

        this.audioElement.onended = () => finish();
        this.audioElement.onerror = () => finish();
        this.audioElement.src = url;
        void this.audioElement.play().catch(() => finish());
      });
    } catch {
      // Sin OpenJTalk, la locución continúa directamente en español.
    }
  }

  /**
   * Reproduce el MP3 pre-grabado en assets/audio/pokemon/{NNN}.mp3 si existe.
   * Devuelve true si se reprodujo, false si el archivo no existe o falla.
   */
  private async playPrerecordedAudio(pokemonId: number, generation: number): Promise<boolean> {
    if (!Number.isInteger(pokemonId) || pokemonId < 1 || pokemonId > 151) return false;
    const paddedId = String(pokemonId).padStart(3, '0');
    const audioPath = `assets/audio/pokemon/${paddedId}.mp3`;

    return new Promise<boolean>(resolve => {
      let settled = false;
      const finish = (result: boolean) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        this.audioElement.onended = null;
        this.audioElement.onerror = null;
        if (!result) {
          this.audioElement.pause();
          this.audioElement.currentTime = 0;
        }
        resolve(result);
      };
      const timeout = window.setTimeout(() => finish(false), 30000);

      this.audioElement.onended = () => finish(true);
      this.audioElement.onerror = () => finish(false);
      this.audioElement.src = audioPath;
      void this.audioElement.play()
        .then(() => {
          if (!this.isCurrent(generation)) {
            finish(false);
          }
        })
        .catch(() => finish(false));
    });
  }

  private async speakSpanish(text: string, generation: number): Promise<void> {
    if (!this.isCurrent(generation)) return;
    if (Capacitor.getPlatform() === 'web' && 'speechSynthesis' in window) {
      await new Promise<void>(resolve => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-ES';
        utterance.rate = 0.95;
        utterance.pitch = 1.15;
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        window.speechSynthesis.speak(utterance);
      });
      return;
    }

    try {
      await TextToSpeech.speak({
        text,
        lang: 'es-ES',
        rate: 0.95,
        pitch: 1.15,
        volume: 1.0,
        category: 'ambient'
      });
    } catch {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        await new Promise<void>(resolve => {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = 'es-ES';
          utterance.rate = 0.95;
          utterance.pitch = 1.15;
          utterance.onend = () => resolve();
          utterance.onerror = () => resolve();
          window.speechSynthesis.speak(utterance);
        });
      }
    }
  }

  private isCurrent(generation: number): boolean {
    return generation === this.generation;
  }
}
