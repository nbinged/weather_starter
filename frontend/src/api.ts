import type { CreateLocationPayload, Location } from './types';

const API_BASE = '/api';

interface LocationsResponse {
  locations: Location[];
}

interface ApiError {
  detail?: string;
}

export interface NearestLocationResult {
  location: Location;
  created: boolean;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as ApiError;
    throw new Error(error.detail || 'Request failed');
  }
  if (response.status === 204) return null as T;
  return (await response.json()) as T;
}

export const listLocations = () => request<LocationsResponse>('/locations');

export const createLocation = (payload: CreateLocationPayload) =>
  request<Location>('/locations', { method: 'POST', body: JSON.stringify(payload) });

export async function createNearestLocation(
  payload: CreateLocationPayload,
): Promise<NearestLocationResult> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 30_000);
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/locations/nearest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('The forecast lookup took too long. Check the app server, then try again.');
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }

  if (response.status === 404) {
    throw new Error(
      'The app server needs a restart to load this feature. Restart it, then try again.',
    );
  }
  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as ApiError;
    throw new Error(error.detail || 'Could not find the nearest forecast area');
  }

  return {
    location: (await response.json()) as Location,
    created: response.status === 201,
  };
}

export const refreshLocation = (id: number) =>
  request<Location>(`/locations/${id}/refresh`, { method: 'POST' });

export const deleteLocation = (id: number) =>
  request<void>(`/locations/${id}`, { method: 'DELETE' });

export function logInteraction(event: string, metadata: object = {}) {
  const page = typeof window === 'undefined' ? undefined : window.location.pathname;
  void fetch(`${API_BASE}/logs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event, metadata, page }),
    keepalive: true,
  }).catch(() => {});
}
