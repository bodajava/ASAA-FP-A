'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import api, {
  apiPost,
  clearAuthStorage,
  getStoredCompanyId,
  getStoredTenantId,
  getItem,
  removeItem,
  setItem,
  STORAGE_KEYS,
} from './api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
import { Company } from '@/types/api';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  tenantId: string;
  role: string;
}

interface LoginCredentials {
  email: string;
  password: string;
  tenantId: string;
}

interface BackendUser {
  id: string | number | bigint;
  tenantId: string | number | bigint;
  name: string;
  email: string;
  status: string;
  role?: {
    id: string | number | bigint;
    name: string;
  } | null;
}

interface BackendLoginResponse {
  accessToken: string;
  refreshToken: string;
  user: BackendUser;
}

export interface TenantPlan {
  id: string;
  name: string;
  code: string;
}

export interface Tenant {
  id: string;
  name: string;
  plan: TenantPlan | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  tenant: Tenant | null;
  activeCompanyId: string | null;
  availableCompanies: Company[];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  setActiveCompany: (companyId: string) => void;
  refreshUser: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
const AuthContext = createContext<AuthContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null);
  const [availableCompanies, setAvailableCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch tenant details
  const fetchTenant = useCallback(async () => {
    try {
      const data = await api.get<Tenant>('/tenants/current').then((r) => r.data);
      setTenant(data);
    } catch {
      setTenant(null);
    }
  }, []);

  // Fetch the current user's profile from localStorage (fallback since /auth/me is not implemented in backend)
  const fetchUser = useCallback(async () => {
    try {
      const stored = getItem(STORAGE_KEYS.USER);
      if (stored) {
        const profile = JSON.parse(stored) as AuthUser;
        setUser(profile);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  }, []);

  // Fetch companies belonging to the authenticated tenant
  const fetchCompanies = useCallback(async () => {
    try {
      const companies = await api
        .get<Company[]>('/companies')
        .then((r) => r.data);
      const list = Array.isArray(companies) ? companies : [];
      setAvailableCompanies(list);

      const stored = getStoredCompanyId();
      const isValid = stored && list.some((c) => c.id === stored);
      if (!isValid && list.length > 0) {
        const defaultId = list[0].id;
        setItem(STORAGE_KEYS.COMPANY_ID, defaultId);
        setActiveCompanyId(defaultId);
      } else if (!stored) {
        setActiveCompanyId(null);
      }
    } catch {
      setAvailableCompanies([]);
    }
  }, []);

  // Listen for auth:expired events dispatched by the API 401 interceptor
  useEffect(() => {
    function handleAuthExpired() {
      setUser(null);
      setAvailableCompanies([]);
      setActiveCompanyId(null);
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('auth:expired', handleAuthExpired);
      return () => window.removeEventListener('auth:expired', handleAuthExpired);
    }
  }, []);

  // Initialise from cookie-based session on mount
  useEffect(() => {
    const companyId = getStoredCompanyId();

    async function init() {
      try {
        await fetchUser();
        const storedUser = getItem(STORAGE_KEYS.USER);
        if (storedUser) {
          await Promise.all([fetchCompanies(), fetchTenant()]);
        }
      } catch {
        // No active session or network error — user will need to log in
      }
      if (companyId) {
        setActiveCompanyId(companyId);
      }
      setIsLoading(false);
    }

    void init();
  }, [fetchUser, fetchCompanies, fetchTenant]);

  // ------------------------------------------------------------------
  const login = useCallback(
    async (credentials: LoginCredentials): Promise<void> => {
      const { email, password, tenantId } = credentials;
      // x-tenant-id must be sent explicitly at login time — no stored token exists yet
      const response = await apiPost<BackendLoginResponse>(
        '/auth/login',
        { email, password },
        {
          headers: { 'x-tenant-id': tenantId },
        },
      );

      // Token is stored in HttpOnly cookie by the server — no localStorage needed
      setItem(STORAGE_KEYS.TENANT_ID, String(tenantId));

      const fullName = response.user.name ?? '';
      const [fName = '', lName = ''] = fullName.split(' ');
      const mappedUser: AuthUser = {
        id: String(response.user.id),
        email: response.user.email,
        firstName: fName || response.user.name || 'User',
        lastName: lName,
        tenantId: String(tenantId),
        role: response.user.role?.name ?? 'User',
      };

      setItem(STORAGE_KEYS.USER, JSON.stringify(mappedUser));
      setUser(mappedUser);

      // Fetch companies and auto-select first
      try {
        const companies = await api
          .get<Company[]>('/companies')
          .then((r) => r.data);
        const list = Array.isArray(companies) ? companies : [];
        setAvailableCompanies(list);

        const stored = getStoredCompanyId();
        const defaultId =
          (stored && list.some((c) => c.id === stored) ? stored : null) ??
          list[0]?.id ??
          null;

        if (defaultId) {
          setItem(STORAGE_KEYS.COMPANY_ID, defaultId);
          setActiveCompanyId(defaultId);
        }
      } catch {
        /* non-fatal */
      }

      try {
        const tenantData = await api.get<Tenant>('/tenants/current').then((r) => r.data);
        setTenant(tenantData);
      } catch {
        setTenant(null);
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await apiPost('/auth/logout');
    } catch {
      // Cookie will be cleared server-side; proceed anyway
    }
    clearAuthStorage();
    setUser(null);
    setAvailableCompanies([]);
    setActiveCompanyId(null);
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }, []);

  const setActiveCompany = useCallback((companyId: string) => {
    if (companyId) {
      setItem(STORAGE_KEYS.COMPANY_ID, companyId);
      setActiveCompanyId(companyId);
    } else {
      removeItem(STORAGE_KEYS.COMPANY_ID);
      setActiveCompanyId(null);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    await Promise.all([
      fetchUser(),
      fetchTenant(),
      fetchCompanies(),
    ]).catch(() => {
      /* handle silently */
    });
  }, [fetchUser, fetchTenant, fetchCompanies]);

  // ------------------------------------------------------------------
  const value: AuthContextValue = {
    user,
    tenant,
    activeCompanyId,
    availableCompanies,
    isAuthenticated: user !== null,
    isLoading,
    login,
    logout,
    setActiveCompany,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an <AuthProvider>');
  }
  return ctx;
}

// Re-export tenantId helper for convenience
export function getActiveTenantId(): string | null {
  return getStoredTenantId();
}
