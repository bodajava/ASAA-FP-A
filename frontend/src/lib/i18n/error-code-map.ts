import type { TranslationKey } from './translations';

interface BackendErrorResponse {
  statusCode?: number;
  message?: string | string[];
  error?: string;
  code?: string;
}

type TFunction = (key: TranslationKey, params?: Record<string, string | number>) => string;

/**
 * Non-hook version for translating backend error codes.
 * Import translations directly.
 */
export function translateErrorCode(code: string, t: TFunction): string {
  const codeKey = `backend.${code}` as TranslationKey;
  try {
    return t(codeKey);
  } catch {
    return t('backend.DEFAULT');
  }
}

/**
 * Extracts a translated error message from an API error response.
 * Checks for `code` field first (backend error codes), then falls back to `message`.
 */
export function getTranslatedApiError(err: unknown, fallbackKey: TranslationKey, t: TFunction): string {
  if (!err || typeof err !== 'object') {
    return t(fallbackKey);
  }

  const errorObj = err as BackendErrorResponse;

  if (errorObj.code && typeof errorObj.code === 'string') {
    return translateErrorCode(errorObj.code, t);
  }

  if (typeof errorObj.message === 'string') {
    return errorObj.message;
  }

  if (Array.isArray(errorObj.message) && errorObj.message.length > 0) {
    return String(errorObj.message[0]);
  }

  return t(fallbackKey);
}
