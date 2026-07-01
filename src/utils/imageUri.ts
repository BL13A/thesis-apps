import { getApiBaseUrl } from '@/services/apiClient';

/**
 * React Native Image cannot load server filesystem paths (e.g. C:\...\recognition_logs\...).
 * Converts API-relative paths and legacy stored paths into fetchable HTTP URLs.
 */
export function resolveRemoteImageUri(uri?: string | null): string | undefined {
  if (!uri) return undefined;

  const value = uri.trim();
  if (!value) return undefined;

  if (
    value.startsWith('data:') ||
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('file://') ||
    value.startsWith('content://')
  ) {
    return value;
  }

  if (value.startsWith('/api/')) {
    return `${getApiBaseUrl()}${value}`;
  }

  if (value.startsWith('tiles/product-images/')) {
    return `${getApiBaseUrl()}/api/${value}`;
  }

  const normalized = value.replace(/\\/g, '/');
  if (normalized.includes('recognition_logs/') || /\.(jpe?g|png|webp)$/i.test(normalized)) {
    const filename = normalized.split('/').pop();
    if (filename) {
      return `${getApiBaseUrl()}/api/ai/recognition-images/${filename}`;
    }
  }

  return undefined;
}
