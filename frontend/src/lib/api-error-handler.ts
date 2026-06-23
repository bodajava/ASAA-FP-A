'use client';

import type { TranslationKey } from './i18n/translations';

type TFunction = (key: TranslationKey, params?: Record<string, string | number>) => string;

interface ApiErrorData {
  statusCode?: number;
  message?: string | string[];
  error?: string;
  code?: string;
}

/**
 * Extract a user-friendly translated error message from any API error.
 * Handles Axios errors, network errors, and generic errors.
 * Returns a translated string suitable for toast/banner display.
 */
export function getApiErrorMessage(
  err: unknown,
  t: TFunction,
  fallbackKey: TranslationKey = 'common.error',
): string {
  if (!err || typeof err !== 'object') {
    return t(fallbackKey);
  }

  // Axios error
  if ('response' in err) {
    const axiosErr = err as { response?: { data?: ApiErrorData; status?: number } };

    // Check for backend error code first
    if (axiosErr.response?.data?.code) {
      const codeKey = `backend.${axiosErr.response.data.code}` as TranslationKey;
      try {
        return t(codeKey);
      } catch {
        // Fall through to message
      }
    }

    // Check for message
    const msg = axiosErr.response?.data?.message;
    if (typeof msg === 'string' && msg.length > 0 && msg.length < 200) {
      return msg;
    }
    if (Array.isArray(msg) && msg.length > 0) {
      return String(msg[0]);
    }

    // Map status codes
    const status = axiosErr.response?.status;
    if (status === 401) return t('backend.AUTH_TOKEN_EXPIRED');
    if (status === 403) return t('backend.DEFAULT');
    if (status === 404) return t('backend.NOT_FOUND');
    if (status && status >= 500) return t('backend.DEFAULT');
  }

  // Network error
  if ('code' in err && (err as { code: string }).code === 'ERR_NETWORK') {
    const locale = typeof window !== 'undefined'
      ? localStorage.getItem('asaa_locale') || 'en'
      : 'en';
    return locale === 'ar'
      ? 'خطأ في الشبكة. يرجى التحقق من اتصالك.'
      : 'Network error. Please check your connection.';
  }

  // Generic Error
  if (err instanceof Error && err.message.length < 200) {
    return err.message;
  }

  return t(fallbackKey);
}

/**
 * Query-level error handler for TanStack Query.
 * Returns a function that can be passed to onError callbacks.
 */
export function createQueryErrorHandler(t: TFunction) {
  return (err: unknown): string => {
    return getApiErrorMessage(err, t, 'common.error');
  };
}
