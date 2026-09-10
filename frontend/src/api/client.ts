import type { ApiProblemDetails } from '../types/api';

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

if (!BASE_URL) {
  // Fail loudly in dev rather than silently calling a relative "/api/..."
 
  console.error(
    'VITE_API_BASE_URL is not set. Copy .env.example to .env and point it at the ASP.NET Core API.'
  );
}

const TOKEN_KEY = 'ecommerce.auth.token';

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(problem: ApiProblemDetails) {
    super(problem.detail || problem.title || 'Request failed');
    this.name = 'ApiError';
    this.status = problem.status;
    this.code = problem.code;
    this.details = problem.details;
  }
}

// Raised when the API is unreachable at all (network/DNS/CORS-preflight failure).
export class NetworkError extends Error {
  constructor(message = 'Could not reach the server. Check your connection and try again.') {
    super(message);
    this.name = 'NetworkError';
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// Notified when the server tells us the current token is no longer valid,so AuthContext can clear state and the router can redirect to /login.
type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler | null = null;

export function registerUnauthorizedHandler(handler: UnauthorizedHandler): void {
  onUnauthorized = handler;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  auth?: boolean; // attach Authorization header, defaults to true
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(path.replace(/^\//, ''), BASE_URL + '/');
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, auth = true } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (auth) {
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new NetworkError();
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const isJson = response.headers.get('content-type')?.includes('json');
  const payload = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    if (response.status === 401 && onUnauthorized) {
      onUnauthorized();
    }

    const problem: ApiProblemDetails = payload ?? {
      status: response.status,
      title: response.statusText || 'Request failed',
      detail: friendlyFallback(response.status),
    };
    throw new ApiError(problem);
  }

  return payload as T;
}

function friendlyFallback(status: number): string {
  switch (status) {
    case 400:
      return 'The request was invalid.';
    case 401:
      return 'Your session has expired. Please sign in again.';
    case 403:
      return 'You do not have permission to perform this action.';
    case 404:
      return 'The requested resource could not be found.';
    case 409:
      return 'This operation conflicts with existing data.';
    case 422:
      return 'Some of the submitted data was invalid.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

export const apiClient = {
  get: <T>(path: string, query?: RequestOptions['query'], auth = true) =>
    request<T>(path, { method: 'GET', query, auth }),
  post: <T>(path: string, body?: unknown, auth = true) =>
    request<T>(path, { method: 'POST', body, auth }),
  put: <T>(path: string, body?: unknown, auth = true) =>
    request<T>(path, { method: 'PUT', body, auth }),
  delete: <T>(path: string, auth = true) => request<T>(path, { method: 'DELETE', auth }),
};
