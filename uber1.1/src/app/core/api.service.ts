import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

export type Role = 'client' | 'driver' | 'admin';
export interface User { id: number; name: string; email: string; phone?: string; role: Role; status?: string }
export interface AuthResponse { success: boolean; message: string; access_token: string; token_type: string; expires_in: number; user: User }

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly baseUrl = environment.apiBaseUrl.replace(/\/$/, '');

  private async request<T>(path: string, method = 'GET', body?: unknown, token?: string): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers['Authorization'] = `Bearer ${token}`;
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    } catch {
      throw new Error(`No se pudo conectar con la API (${this.baseUrl}). Revisa la configuración y que el servidor esté activo.`);
    }
    const data: any = await response.json().catch(() => ({}));
    if (!response.ok) {
      const validation = data?.errors ? Object.values(data.errors as Record<string, string[]>).flat().join(' ') : '';
      throw new Error(validation || data?.message || `Error de API (${response.status})`);
    }
    return data as T;
  }

  auth = {
    register: (body: Record<string, unknown>) => this.request<AuthResponse>('/auth/register', 'POST', body),
    login: (login: string, password: string) => this.request<AuthResponse>('/auth/login', 'POST', { login, password }),
    me: (token: string) => this.request<{ success: boolean; user: User }>('/auth/me', 'GET', undefined, token),
    logout: (token: string) => this.request('/auth/logout', 'POST', undefined, token),
    forgotPassword: (email: string, new_password: string) => this.request('/auth/forgot-password', 'POST', { email, new_password }),
  };
  fares = { active: () => this.request('/fares/active') };
  client = {
    estimateFare: (token: string, body: Record<string, number>) => this.request('/client/estimate-fare', 'POST', body, token),
    createRideRequest: (token: string, body: Record<string, unknown>) => this.request('/client/ride-requests', 'POST', body, token),
    active: (token: string) => this.request('/client/active', 'GET', undefined, token),
    cancel: (token: string, id: number, reason: string) => this.request(`/client/cancel/${id}`, 'POST', { reason }, token),
    trips: (token: string) => this.request('/client/trips', 'GET', undefined, token),
    rateTrip: (token: string, id: number, body: { score: number; comment?: string; has_incident?: boolean }) => this.request(`/client/trips/${id}/rating`, 'POST', body, token),
  };
  driver = {
    availability: (token: string, status: 'available' | 'unavailable') => this.request('/driver/availability', 'PUT', { status }, token),
    rideRequests: (token: string) => this.request('/driver/ride-requests', 'GET', undefined, token),
    accept: (token: string, id: number) => this.request(`/driver/ride-requests/${id}/accept`, 'POST', undefined, token),
    arrive: (token: string, id: number) => this.request(`/driver/trips/${id}/arrive`, 'POST', undefined, token),
    start: (token: string, id: number) => this.request(`/driver/trips/${id}/start`, 'POST', undefined, token),
    complete: (token: string, id: number, body: { actual_distance_km: number; actual_duration_min: number }) => this.request(`/driver/trips/${id}/complete`, 'POST', body, token),
    location: (token: string, body: { latitude: number; longitude: number; heading?: number; speed?: number; trip_id?: number }) => this.request('/driver/location', 'POST', body, token),
  };
  admin = {
    dashboard: (token: string) => this.request('/admin/dashboard', 'GET', undefined, token),
    drivers: (token: string, status?: string) => this.request(`/admin/drivers${status ? `?approval_status=${encodeURIComponent(status)}` : ''}`, 'GET', undefined, token),
    approveDriver: (token: string, id: number, body: { approval_status: string; admin_notes?: string }) => this.request(`/admin/drivers/${id}/approval`, 'PATCH', body, token),
    fares: (token: string) => this.request('/admin/fares', 'GET', undefined, token),
    createFare: (token: string, body: Record<string, unknown>) => this.request('/admin/fares', 'POST', body, token),
    trips: (token: string, filters: Record<string, string | number> = {}) => {
      const query = new URLSearchParams(Object.entries(filters).map(([key, value]) => [key, String(value)]));
      return this.request(`/admin/trips${query.size ? `?${query.toString()}` : ''}`, 'GET', undefined, token);
    },
    reports: (token: string) => this.request('/admin/reports', 'GET', undefined, token),
    auditLogs: (token: string) => this.request('/admin/audit-logs', 'GET', undefined, token),
  };
}
