const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://20.20.1.157:8000/api').replace(/\/$/, '');

export type Role = 'client' | 'driver' | 'admin';
export interface User { id: number; name: string; email: string; phone?: string; role: Role; status?: string }
export interface AuthResponse { success: boolean; message: string; access_token: string; token_type: string; expires_in: number; user: User }
export interface Fare { id: number; name: string; base_fare: number; price_per_km: number; price_per_minute: number; minimum_fare: number; surge_multiplier: number; active: boolean }
export interface RideRequest { id: number; status: string; origin_name: string; destination_name: string; estimated_fare: number; estimated_distance_km?: number; estimated_duration_min?: number; [key: string]: unknown }
export interface Trip { id: number; status: string; estimated_fare?: number; final_fare?: number; [key: string]: unknown }

export class ApiError extends Error {
  status: number;
  details: unknown;
  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  } catch {
    throw new ApiError(`No se pudo conectar con la API (${API_BASE_URL}). Revisa VITE_API_BASE_URL y que el servidor esté activo.`, 0);
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errors = data && typeof data === 'object' ? (data as { errors?: Record<string, string[]>; message?: string }) : {};
    const validationMessage = errors.errors ? Object.values(errors.errors).flat().join(' ') : '';
    throw new ApiError(validationMessage || errors.message || `Error de API (${response.status})`, response.status, data);
  }
  return data as T;
}

const json = (method: string, body?: unknown): RequestInit => ({ method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });

export const api = {
  auth: {
    register: (body: Record<string, unknown>) => request<AuthResponse>('/auth/register', json('POST', body)),
    login: (login: string, password: string) => request<AuthResponse>('/auth/login', json('POST', { login, password })),
    me: (token: string) => request<{ success: boolean; user: User }>('/auth/me', {}, token),
    logout: (token: string) => request<{ success: boolean; message: string }>('/auth/logout', json('POST'), token),
    forgotPassword: (email: string, new_password: string) => request<{ success: boolean; message: string }>('/auth/forgot-password', json('POST', { email, new_password })),
  },
  fares: { active: () => request<{ success: boolean; fare: Fare }>('/fares/active') },
  client: {
    estimateFare: (token: string, body: Record<string, number>) => request('/client/estimate-fare', json('POST', body), token),
    createRideRequest: (token: string, body: Record<string, unknown>) => request<{ success: boolean; message: string; ride_request: RideRequest }>('/client/ride-requests', json('POST', body), token),
    active: (token: string) => request('/client/active', {}, token),
    cancel: (token: string, id: number, reason: string) => request(`/client/cancel/${id}`, json('POST', { reason }), token),
    trips: (token: string) => request('/client/trips', {}, token),
    rateTrip: (token: string, id: number, body: { score: number; comment?: string; has_incident?: boolean }) => request(`/client/trips/${id}/rating`, json('POST', body), token),
  },
  driver: {
    availability: (token: string, status: 'available' | 'unavailable') => request('/driver/availability', json('PUT', { status }), token),
    rideRequests: (token: string) => request('/driver/ride-requests', {}, token),
    accept: (token: string, id: number) => request(`/driver/ride-requests/${id}/accept`, json('POST'), token),
    arrive: (token: string, id: number) => request(`/driver/trips/${id}/arrive`, json('POST'), token),
    start: (token: string, id: number) => request(`/driver/trips/${id}/start`, json('POST'), token),
    complete: (token: string, id: number, body: { actual_distance_km: number; actual_duration_min: number }) => request(`/driver/trips/${id}/complete`, json('POST', body), token),
    location: (token: string, body: { latitude: number; longitude: number; heading?: number; speed?: number; trip_id?: number }) => request('/driver/location', json('POST', body), token),
  },
  admin: {
    dashboard: (token: string) => request('/admin/dashboard', {}, token),
    drivers: (token: string, approval_status?: string) => request(`/admin/drivers${approval_status ? `?approval_status=${encodeURIComponent(approval_status)}` : ''}`, {}, token),
    approveDriver: (token: string, id: number, body: { approval_status: string; admin_notes?: string }) => request(`/admin/drivers/${id}/approval`, json('PATCH', body), token),
    fares: (token: string) => request('/admin/fares', {}, token),
    createFare: (token: string, body: Record<string, unknown>) => request('/admin/fares', json('POST', body), token),
    trips: (token: string, filters: Record<string, string | number> = {}) => {
      const query = new URLSearchParams(Object.entries(filters).map(([key, value]) => [key, String(value)]));
      return request(`/admin/trips${query.size ? `?${query.toString()}` : ''}`, {}, token);
    },
    reports: (token: string) => request('/admin/reports', {}, token),
    auditLogs: (token: string) => request('/admin/audit-logs', {}, token),
  },
};
