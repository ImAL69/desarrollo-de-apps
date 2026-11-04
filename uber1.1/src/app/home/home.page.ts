import { DecimalPipe, JsonPipe } from '@angular/common';
import { Component, HostListener, inject, type OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonToolbar,
} from '@ionic/angular';

import { ApiService, type Role, type User } from '../core/api.service';

type Mode = 'login' | 'register' | 'forgot';
interface FareDisplay {
  name?: string;
  estimatedFare?: number;
  distanceKm?: number;
  durationMin?: number;
  baseFare?: number;
  pricePerKm?: number;
  pricePerMinute?: number;
  minimumFare?: number;
  surgeMultiplier?: number;
  currency: string;
}
const browserStorage = (): Storage | null => (typeof localStorage === 'undefined' ? null : localStorage);

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [
    FormsModule,
    DecimalPipe,
    JsonPipe,
    IonButton,
    IonContent,
    IonHeader,
    IonInput,
    IonItem,
    IonSelect,
    IonSelectOption,
    IonSpinner,
    IonToolbar,
  ],
})
export class HomePage implements OnInit {
  token = browserStorage()?.getItem('uber_access_token') ?? '';
  user: User | null = this.loadUser();
  mode: Mode = 'login';
  busy = false;
  notice = '';
  result: unknown = null;
  pointerX = 0;
  pointerY = 0;
  fields: Record<string, string> = {
    login: '',
    password: '',
    name: '',
    email: '',
    phone: '',
    role: 'client',
    origin_name: 'Mi ubicación',
    origin_latitude: '4.6766',
    origin_longitude: '-74.0483',
    destination_name: 'Destino',
    destination_latitude: '4.6664',
    destination_longitude: '-74.0536',
    score: '5',
  };

  readonly api = inject(ApiService);

  ngOnInit(): void {
    if (this.token)
      this.api.auth
        .me(this.token)
        .then(({ user }) => this.setSession(this.token, user))
        .catch(() => this.clearSession());
  }

  private loadUser(): User | null {
    try {
      return JSON.parse(browserStorage()?.getItem('uber_user') ?? 'null') as User | null;
    } catch {
      return null;
    }
  }
  setField(key: string, value: string | number | null | undefined): void {
    this.fields[key] = String(value ?? '');
  }
  private setSession(token: string, user: User): void {
    this.token = token;
    this.user = user;
    browserStorage()?.setItem('uber_access_token', token);
    browserStorage()?.setItem('uber_user', JSON.stringify(user));
  }
  private clearSession(): void {
    browserStorage()?.removeItem('uber_access_token');
    browserStorage()?.removeItem('uber_user');
    this.token = '';
    this.user = null;
    this.result = null;
  }
  async run(action: () => Promise<unknown>): Promise<unknown> {
    this.busy = true;
    this.notice = '';
    try {
      this.result = await action();
      return this.result;
    } catch (error) {
      this.notice = error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
      this.result = null;
      return null;
    } finally {
      this.busy = false;
    }
  }
  clearResult(): void {
    this.result = null;
    this.notice = '';
  }
  trackPointer(event: PointerEvent): void {
    const target = event.currentTarget as HTMLElement;
    const bounds = target.getBoundingClientRect();
    this.pointerX = Math.round(((event.clientX - bounds.left) / bounds.width) * 100);
    this.pointerY = Math.round(((event.clientY - bounds.top) / bounds.height) * 100);
  }
  resetPointer(): void {
    this.pointerX = 50;
    this.pointerY = 50;
  }
  @HostListener('window:keydown.escape')
  handleEscape(): void {
    if (!this.busy && (this.notice || this.result !== null)) this.clearResult();
  }
  fareResult(): FareDisplay | null {
    if (!this.result || typeof this.result !== 'object') return null;
    const response = this.result as Record<string, unknown>;
    const fare = this.objectValue(response['fare']);
    const estimate = this.objectValue(response['estimate']);
    const breakdown = this.objectValue(estimate?.['fare_breakdown']);
    if (!fare && !estimate) return null;
    const source = fare ?? breakdown ?? {};
    return {
      name: this.stringValue(fare?.['name']),
      estimatedFare: this.numberValue(estimate?.['estimated_fare']),
      distanceKm: this.numberValue(estimate?.['distance_km']),
      durationMin: this.numberValue(estimate?.['duration_min']),
      baseFare: this.numberValue(source['base_fare']),
      pricePerKm: this.numberValue(source['price_per_km']),
      pricePerMinute: this.numberValue(source['price_per_minute']),
      minimumFare: this.numberValue(source['minimum_fare']),
      surgeMultiplier: this.numberValue(source['surge_multiplier']),
      currency: this.stringValue(estimate?.['currency']) || 'COP',
    };
  }
  formatCurrency(value: number | undefined, currency = 'COP'): string {
    if (value === undefined) return 'No disponible';
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);
  }
  private objectValue(value: unknown): Record<string, unknown> | null {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  }
  private numberValue(value: unknown): number | undefined {
    return typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim() !== ''
        ? Number(value)
        : undefined;
  }
  private stringValue(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
  }
  async submitAuth(): Promise<void> {
    let response: any;
    if (this.mode === 'forgot')
      response = await this.run(() =>
        this.api.auth.forgotPassword(this.fields['email'] ?? '', this.fields['new_password'] ?? ''),
      );
    else if (this.mode === 'register') {
      const body: Record<string, unknown> = {
        name: this.fields['name'],
        email: this.fields['email'],
        phone: this.fields['phone'],
        password: this.fields['password'],
        role: this.fields['role'],
      };
      if (this.fields['role'] === 'driver')
        Object.assign(body, {
          license_number: this.fields['license_number'],
          plate: this.fields['plate'],
          brand: this.fields['brand'],
          model: this.fields['model'],
          year: Number(this.fields['year']),
          capacity: Number(this.fields['capacity']),
          color: this.fields['color'],
        });
      response = await this.run(() => this.api.auth.register(body));
    } else
      response = await this.run(() => this.api.auth.login(this.fields['login'] ?? '', this.fields['password'] ?? ''));
    if (response?.access_token && response?.user) this.setSession(response.access_token, response.user);
  }
  async signOut(): Promise<void> {
    await this.run(() => this.api.auth.logout(this.token));
    this.clearSession();
  }
  coordinates(): Record<string, number> {
    return {
      origin_latitude: Number(this.fields['origin_latitude']),
      origin_longitude: Number(this.fields['origin_longitude']),
      destination_latitude: Number(this.fields['destination_latitude']),
      destination_longitude: Number(this.fields['destination_longitude']),
    };
  }
  requestRide(): Promise<unknown> {
    return this.api.client.createRideRequest(this.token, {
      ...this.coordinates(),
      origin_name: this.fields['origin_name'] ?? 'Mi ubicación',
      destination_name: this.fields['destination_name'] ?? 'Destino',
    });
  }
  async sendLocation(): Promise<void> {
    if (!navigator.geolocation) {
      this.notice = 'Este dispositivo no permite obtener la ubicación.';
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        void this.run(() =>
          this.api.driver.location(this.token, {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            heading: position.coords.heading ?? undefined,
            speed: position.coords.speed ?? undefined,
            trip_id: this.number('driver_trip_id') || undefined,
          }),
        ),
      (error) => (this.notice = error.message),
    );
  }
  number(key: string): number {
    return Number(this.fields[key] ?? 0);
  }
  roleName(role: Role): string {
    return role === 'client' ? 'cliente' : role === 'driver' ? 'conductor' : 'administrador';
  }
}
