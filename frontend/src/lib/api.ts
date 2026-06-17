import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

// Storage keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'asaa_access_token',
  TENANT_ID: 'asaa_tenant_id',
  COMPANY_ID: 'asaa_company_id',
  USER: 'asaa_user',
} as const;

// ---------------------------------------------------------------------------
// Token helpers (safe for SSR – guards against `window` being undefined)
// ---------------------------------------------------------------------------
export function getItem(key: string): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(key);
}

export function setItem(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, value);
}

export function removeItem(key: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(key);
}

export function getStoredToken(): string | null {
  return getItem(STORAGE_KEYS.ACCESS_TOKEN);
}

export function getStoredTenantId(): string | null {
  return getItem(STORAGE_KEYS.TENANT_ID);
}

export function getStoredCompanyId(): string | null {
  return getItem(STORAGE_KEYS.COMPANY_ID);
}

export function clearAuthStorage(): void {
  removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  removeItem(STORAGE_KEYS.TENANT_ID);
  removeItem(STORAGE_KEYS.COMPANY_ID);
  removeItem(STORAGE_KEYS.USER);
}

// ---------------------------------------------------------------------------
// Axios instance
// ---------------------------------------------------------------------------
const api: AxiosInstance = axios.create({
  baseURL: BACKEND_URL,
  timeout: 30_000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor – inject tenant & company headers on every outgoing request
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    const tenantId = getStoredTenantId();
    const companyId = getStoredCompanyId();

    const isLoginRequest = config.url?.endsWith('/auth/login') || false;

    // x-tenant-id validation (must be numeric)
    const incomingTenantId = (config.headers['x-tenant-id'] as string) ?? tenantId;
    if (incomingTenantId && /^\d+$/.test(incomingTenantId)) {
      config.headers['x-tenant-id'] = incomingTenantId;
    } else {
      delete config.headers['x-tenant-id'];
    }

    // x-company-id validation (must be numeric, omit entirely during login)
    if (isLoginRequest) {
      delete config.headers['x-company-id'];
    } else {
      const incomingCompanyId = (config.headers['x-company-id'] as string) ?? companyId;
      if (incomingCompanyId && /^\d+$/.test(incomingCompanyId)) {
        config.headers['x-company-id'] = incomingCompanyId;
      } else {
        delete config.headers['x-company-id'];
      }
    }

    return config;
  },
  (error: unknown) => Promise.reject(error),
);

// Response interceptor – unified error handling
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        // Clear auth storage so the auth context detects isAuthenticated = false
        // and redirects to /login cleanly via Next.js router.
        clearAuthStorage();
        if (typeof window !== 'undefined') {
          // Dispatch a custom event so the auth context can react immediately
          // without waiting for the next fetchUser() call.
          window.dispatchEvent(new Event('auth:expired'));
        }
      }
    }
    return Promise.reject(error);
  },
);

export default api;

// ---------------------------------------------------------------------------
// Client-side Memory Cache for GET requests
// ---------------------------------------------------------------------------
interface CacheEntry {
  data: any;
  timestamp: number;
}

const clientCache = new Map<string, CacheEntry>();

export function clearClientCache(): void {
  clientCache.clear();
}

// ---------------------------------------------------------------------------
// Typed helper – extract `data` from AxiosResponse
// ---------------------------------------------------------------------------
export async function apiGet<T>(
  url: string,
  config?: AxiosRequestConfig & { bypassCache?: boolean },
): Promise<T> {
  const bypass = config?.bypassCache;
  const companyId = getStoredCompanyId() || '';
  const tenantId = getStoredTenantId() || '';
  const cacheKey = `${tenantId}:${companyId}:${url}:${JSON.stringify(config?.params || {})}`;

  if (!bypass) {
    const cached = clientCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 60_000) { // 1 minute client cache
      return cached.data as T;
    }
  }

  const response = await api.get<T>(url, config);

  if (!bypass) {
    clientCache.set(cacheKey, {
      data: response.data,
      timestamp: Date.now(),
    });
  }

  return response.data;
}

export async function apiPost<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  clearClientCache();
  const response = await api.post<T>(url, body, config);
  return response.data;
}

export async function apiPatch<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  clearClientCache();
  const response = await api.patch<T>(url, body, config);
  return response.data;
}

export async function apiPut<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  clearClientCache();
  const response = await api.put<T>(url, body, config);
  return response.data;
}

export async function apiDelete<T>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<T> {
  clearClientCache();
  const response = await api.delete<T>(url, config);
  return response.data;
}
