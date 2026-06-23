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

export function setStoredToken(token: string): void {
  setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
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
    const token = getStoredToken();

    const isLoginRequest = config.url?.endsWith('/auth/login') || false;

    // Inject Bearer token as fallback (primary auth is via HttpOnly cookie)
    if (token && !config.headers['Authorization']) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

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

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response interceptor – unified error handling and token refreshing
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const originalRequest = error.config as any;

      if (error.response?.status === 401 && originalRequest) {
        const isAuthRequest =
          originalRequest.url?.endsWith('/auth/refresh') ||
          originalRequest.url?.endsWith('/auth/login');
        const hasStoredToken = getStoredToken();

        // If the request is login or refresh, or if we don't have a stored token, or if we already retried, don't try to refresh
        if (isAuthRequest || !hasStoredToken || originalRequest._retry) {
          clearAuthStorage();
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('auth:expired'));
          }
          if (typeof window !== 'undefined') {
            const locale = localStorage.getItem('asaa_locale') || 'en';
            error.message = translateApiError(error, locale);
          }
          return Promise.reject(error);
        }

        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then((token) => {
              if (originalRequest.headers) {
                originalRequest.headers['Authorization'] = `Bearer ${token}`;
              }
              return api(originalRequest);
            })
            .catch((err) => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          // Attempt to refresh the token (cookies are sent automatically)
          const res = await api.post<{ accessToken: string; refreshToken: string }>(
            '/auth/refresh',
            {},
            { _retry: true } as any,
          );
          const { accessToken } = res.data;

          setStoredToken(accessToken);

          if (originalRequest.headers) {
            originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
          }

          processQueue(null, accessToken);
          return api(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError, null);
          clearAuthStorage();
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('auth:expired'));
          }
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      // Attach a user-friendly translated message
      if (typeof window !== 'undefined') {
        const locale = localStorage.getItem('asaa_locale') || 'en';
        error.message = translateApiError(error, locale);
      }
    }
    return Promise.reject(error);
  },
);

function translateApiError(error: any, locale: string): string {
  const isAr = locale === 'ar';
  const status = error?.response?.status;
  const serverMsg = (error?.response?.data as { message?: string } | undefined)?.message;

  // If server sent a message, use it as-is (could be localized already)
  if (serverMsg && typeof serverMsg === 'string' && serverMsg.length > 0 && serverMsg.length < 200) {
    return serverMsg;
  }

  // Handle timeout errors
  if (error?.code === 'ECONNABORTED' || (error?.message && typeof error.message === 'string' && error.message.includes('timeout'))) {
    return isAr ? 'انتهت مهلة الطلب. يرجى التحقق من اتصالك والمحاولة مرة أخرى.' : 'Request timed out. Please check your connection and try again.';
  }

  if (error?.code === 'ERR_NETWORK') {
    return isAr ? 'خطأ في الشبكة. يرجى التحقق من اتصالك والمحاولة مرة أخرى.' : 'Network error. Please check your connection and try again.';
  }

  if (status) {
    if (status >= 500) {
      return isAr ? 'خطأ في الخادم. يرجى المحاولة لاحقاً.' : 'Server error. Please try again later.';
    }
    if (status === 404) {
      return isAr ? 'غير موجود.' : 'Not found.';
    }
    if (status === 403) {
      return isAr ? 'ليس لديك صلاحية للوصول إلى هذا المورد.' : 'You do not have permission to access this resource.';
    }
    if (status === 400) {
      return isAr ? 'فشل الطلب. يرجى مراجعة البيانات والمحاولة مرة أخرى.' : 'Request failed. Please check your data and try again.';
    }
  }

  return isAr ? 'حدث خطأ غير متوقع.' : 'An unexpected error occurred.';
}

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
// Supports AbortController signal for request cancellation.
// ---------------------------------------------------------------------------
export async function apiGet<T>(
  url: string,
  config?: AxiosRequestConfig & { bypassCache?: boolean },
): Promise<T> {
  const bypass = config?.bypassCache;
  const companyId = getStoredCompanyId() || '';
  const tenantId = getStoredTenantId() || '';
  const cacheKey = `${tenantId}:${companyId}:${url}:${JSON.stringify(config?.params || {})}`;

  if (!bypass && !config?.signal) {
    const cached = clientCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 60_000) { // 1 minute client cache
      return cached.data as T;
    }
  }

  const response = await api.get<T>(url, config);

  if (!bypass && !config?.signal) {
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
