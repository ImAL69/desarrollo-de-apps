import { Injectable, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';

export interface ServerHealth {
  ok: boolean;
  openJTalk: boolean;
  vision: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ServerConfigService {
  public readonly baseUrl = signal(this.initialBaseUrl());
  private resolutionPromise: Promise<string> | null = null;

  constructor() {
    void this.resolve();
  }

  resolve(): Promise<string> {
    if (!this.resolutionPromise) {
      let resolution: Promise<string>;
      resolution = this.resolveAvailableServer().then(({ baseUrl, available }) => {
        if (this.resolutionPromise === resolution) {
          if (available) {
            this.baseUrl.set(baseUrl);
          } else {
            this.resolutionPromise = null;
          }
        }
        return baseUrl;
      });
      this.resolutionPromise = resolution;
    }
    return this.resolutionPromise;
  }

  setServer(input: string): void {
    const baseUrl = this.normalize(input);
    this.baseUrl.set(baseUrl);
    this.resolutionPromise = Promise.resolve(baseUrl);
    try {
      localStorage.setItem('pokedex_server_ip', baseUrl);
    } catch {
      // El servidor sigue disponible durante esta sesión si el almacenamiento está bloqueado.
    }
  }

  async checkHealth(): Promise<ServerHealth> {
    const baseUrl = await this.resolve();
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 1500);

    try {
      const response = await fetch(`${baseUrl}/api/health`, { signal: controller.signal });
      const data = await response.json().catch(() => ({}));
      const openJTalk = data.openJTalk;
      return {
        ok: response.ok,
        openJTalk: typeof openJTalk === 'boolean'
          ? openJTalk
          : Boolean(openJTalk?.dictionaryConfigured && openJTalk?.nitechVoiceConfigured),
        vision: Boolean(data.vision?.providerConfigured ?? data.vision)
      };
    } catch {
      return { ok: false, openJTalk: false, vision: false };
    } finally {
      window.clearTimeout(timeout);
    }
  }

  private async resolveAvailableServer(): Promise<{ baseUrl: string; available: boolean }> {
    const candidates = this.serverCandidates();
    for (const candidate of candidates) {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 1500);
      try {
        const response = await fetch(`${candidate}/api/health`, { signal: controller.signal });
        if (response.ok) {
          return { baseUrl: candidate, available: true };
        }
      } catch {
        // Continúa con la siguiente dirección candidata.
      } finally {
        window.clearTimeout(timeout);
      }
    }

    return { baseUrl: candidates[0], available: false };
  }

  private serverCandidates(): string[] {
    const saved = this.savedServer();
    const fallback = Capacitor.getPlatform() === 'android'
      ? ['http://localhost:3000', 'http://10.0.2.2:3000']
      : [`http://${window.location.hostname || 'localhost'}:3000`];
    return [...new Set([...(saved ? [saved] : []), ...fallback])];
  }

  private initialBaseUrl(): string {
    return this.savedServer() || (Capacitor.getPlatform() === 'android'
      ? 'http://localhost:3000'
      : `http://${typeof window !== 'undefined' ? window.location.hostname || 'localhost' : 'localhost'}:3000`);
  }

  private savedServer(): string | null {
    try {
      const saved = typeof localStorage !== 'undefined'
        ? localStorage.getItem('pokedex_server_ip')
        : null;
      return saved ? this.normalize(saved) : null;
    } catch {
      return null;
    }
  }

  private normalize(input: string): string {
    const value = input.trim();
    if (!value) {
      return this.initialBaseUrl();
    }

    const url = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(value) ? value : `http://${value}`);
    if (!url.hostname) {
      throw new Error('Introduce una dirección de servidor válida.');
    }
    url.protocol = 'http:';
    url.port ||= '3000';
    url.pathname = '';
    url.search = '';
    url.hash = '';
    return url.origin;
  }
}
