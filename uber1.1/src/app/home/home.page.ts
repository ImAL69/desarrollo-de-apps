import { Component, OnInit } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonButton, IonContent, IonHeader, IonInput, IonItem, IonSelect, IonSelectOption, IonSpinner, IonTitle, IonToolbar } from '@ionic/angular';
import { ApiService, type Role, type User } from '../core/api.service';

type Mode = 'login' | 'register' | 'forgot';
const browserStorage = (): Storage | null => typeof localStorage === 'undefined' ? null : localStorage;

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [FormsModule, JsonPipe, IonButton, IonContent, IonHeader, IonInput, IonItem, IonSelect, IonSelectOption, IonSpinner, IonTitle, IonToolbar],
})
export class HomePage implements OnInit {
  token = browserStorage()?.getItem('uber_access_token') ?? '';
  user: User | null = this.loadUser();
  mode: Mode = 'login';
  busy = false;
  faresBusy = false;
  fares: Fare[] = [];
  faresNotice = '';
  notice = '';
  result: unknown = null;
  fields: Record<string, string> = { login: '', password: '', name: '', email: '', phone: '', role: 'client', origin_name: 'Mi ubicación', origin_latitude: '4.6766', origin_longitude: '-74.0483', destination_name: 'Destino', destination_latitude: '4.6664', destination_longitude: '-74.0536', score: '5' };

  constructor(readonly api: ApiService) {}

  ngOnInit(): void {
    if (this.token) this.api.auth.me(this.token).then(({ user }) => this.setSession(this.token, user)).catch(() => this.clearSession());
  }

  private loadUser(): User | null {
    try { return JSON.parse(browserStorage()?.getItem('uber_user') ?? 'null') as User | null; } catch { return null; }
  }
  setField(key: string, value: string | number | null | undefined): void { this.fields[key] = String(value ?? ''); }
  private setSession(token: string, user: User): void {
    this.token = token; this.user = user;
    browserStorage()?.setItem('uber_access_token', token); browserStorage()?.setItem('uber_user', JSON.stringify(user));
  }
  private clearSession(): void {
    browserStorage()?.removeItem('uber_access_token'); browserStorage()?.removeItem('uber_user');
    this.token = ''; this.user = null; this.result = null;
  }
  async run(action: () => Promise<unknown>): Promise<unknown> {
    this.busy = true; this.notice = '';
    try { this.result = await action(); return this.result; }
    catch (error) { this.notice = error instanceof Error ? error.message : 'Ocurrió un error inesperado.'; this.result = null; return null; }
    finally { this.busy = false; }
  }
  async submitAuth(): Promise<void> {
    let response: any;
    if (this.mode === 'forgot') response = await this.run(() => this.api.auth.forgotPassword(this.fields['email'] ?? '', this.fields['new_password'] ?? ''));
    else if (this.mode === 'register') {
      const body: Record<string, unknown> = { name: this.fields['name'], email: this.fields['email'], phone: this.fields['phone'], password: this.fields['password'], role: this.fields['role'] };
      if (this.fields['role'] === 'driver') Object.assign(body, { license_number: this.fields['license_number'], plate: this.fields['plate'], brand: this.fields['brand'], model: this.fields['model'], year: Number(this.fields['year']), capacity: Number(this.fields['capacity']), color: this.fields['color'] });
      response = await this.run(() => this.api.auth.register(body));
    } else response = await this.run(() => this.api.auth.login(this.fields['login'] ?? '', this.fields['password'] ?? ''));
    if (response?.access_token && response?.user) this.setSession(response.access_token, response.user);
  }
  async signOut(): Promise<void> { await this.run(() => this.api.auth.logout(this.token)); this.clearSession(); }
  async loadFares(): Promise<void> {
    this.faresBusy = true;
    this.faresNotice = '';
    try {
      const response = await this.api.admin.fares(this.token);
      this.fares = extractFares(response);
      if (!this.fares.length) this.faresNotice = 'No hay tarifas registradas.';
    } catch (error) {
      this.faresNotice = error instanceof Error ? error.message : 'No se pudieron cargar las tarifas.';
    } finally {
      this.faresBusy = false;
    }
  }
  async createFare(): Promise<void> {
    this.faresBusy = true;
    this.faresNotice = '';
    try {
      await this.api.admin.createFare(this.token, {
        name: this.fields['fare_name'],
        base_fare: this.number('fare_base'),
        price_per_km: this.number('fare_km'),
        price_per_minute: this.number('fare_minute'),
        minimum_fare: this.number('fare_minimum'),
        surge_multiplier: this.number('fare_surge'),
        active: true,
      });
      try {
        const response = await this.api.admin.fares(this.token);
        this.fares = extractFares(response);
        this.faresNotice = this.fares.length
          ? 'Tarifa creada y lista actualizada.'
          : 'Tarifa creada, pero la API no devolvió tarifas para mostrar.';
      } catch {
        this.faresNotice = 'Tarifa creada, pero no se pudo actualizar la lista.';
      }
    } catch (error) {
      this.faresNotice = error instanceof Error ? error.message : 'No se pudo crear la tarifa.';
    } finally {
      this.faresBusy = false;
    }
  }
  coordinates(): Record<string, number> { return { origin_latitude: Number(this.fields['origin_latitude']), origin_longitude: Number(this.fields['origin_longitude']), destination_latitude: Number(this.fields['destination_latitude']), destination_longitude: Number(this.fields['destination_longitude']) }; }
  requestRide(): Promise<unknown> { return this.api.client.createRideRequest(this.token, { ...this.coordinates(), origin_name: this.fields['origin_name'] ?? 'Mi ubicación', destination_name: this.fields['destination_name'] ?? 'Destino' }); }
  async sendLocation(): Promise<void> {
    if (!navigator.geolocation) { this.notice = 'Este dispositivo no permite obtener la ubicación.'; return; }
    navigator.geolocation.getCurrentPosition(position => void this.run(() => this.api.driver.location(this.token, { latitude: position.coords.latitude, longitude: position.coords.longitude, heading: position.coords.heading ?? undefined, speed: position.coords.speed ?? undefined, trip_id: this.number('driver_trip_id') || undefined })), error => this.notice = error.message);
  }
  number(key: string): number { return Number(this.fields[key] ?? 0); }
  roleName(role: Role): string { return role === 'client' ? 'cliente' : role === 'driver' ? 'conductor' : 'administrador'; }
}

interface Fare {
  id: number;
  name: string;
  base_fare: number;
  price_per_km: number;
  price_per_minute: number;
  minimum_fare: number;
  surge_multiplier: number;
  active: boolean;
}

function extractFares(value: unknown): Fare[] {
  if (Array.isArray(value)) return value as Fare[];
  if (!value || typeof value !== 'object') return [];
  const response = value as Record<string, unknown>;
  const candidates = [response['fares'], response['data'], response['items']];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate as Fare[];
    if (candidate && typeof candidate === 'object') {
      const nested = candidate as Record<string, unknown>;
      if (Array.isArray(nested['data'])) return nested['data'] as Fare[];
      if (Array.isArray(nested['fares'])) return nested['fares'] as Fare[];
    }
  }
  return [];
}
