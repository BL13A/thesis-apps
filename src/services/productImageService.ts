import {
  cacheDirectory,
  downloadAsync,
  getInfoAsync,
  makeDirectoryAsync,
} from 'expo-file-system/legacy';
import { getAccessToken } from '@/services/apiClient';
import { resolveRemoteImageUri } from '@/utils/imageUri';

const CACHE_DIR = `${cacheDirectory ?? ''}product-images/`;
const uriCache = new Map<string, string>();

async function ensureCacheDir(): Promise<void> {
  if (!cacheDirectory) return;
  const info = await getInfoAsync(CACHE_DIR);
  if (!info.exists) {
    await makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
}

function isInlineImageUri(uri: string): boolean {
  return (
    uri.startsWith('data:') ||
    uri.startsWith('file://') ||
    uri.startsWith('content://')
  );
}

/**
 * Resolve product image for display.
 * API embeds ceramic dataset photos as data: URIs — use those directly.
 * Falls back to downloading HTTP URLs when needed.
 */
export async function loadCachedProductImageUri(
  imageUri?: string | null,
): Promise<string | null> {
  const value = imageUri?.trim();
  if (!value) {
    return null;
  }

  if (isInlineImageUri(value)) {
    return value;
  }

  const remoteUri = resolveRemoteImageUri(value);
  if (!remoteUri || !cacheDirectory) {
    return null;
  }

  const cached = uriCache.get(remoteUri);
  if (cached) {
    const info = await getInfoAsync(cached);
    if (info.exists) {
      return cached;
    }
    uriCache.delete(remoteUri);
  }

  const filename = remoteUri.split('/').pop()?.split('?')[0] || 'product.jpg';
  const localUri = `${CACHE_DIR}${filename}`;

  await ensureCacheDir();

  const existing = await getInfoAsync(localUri);
  if (existing.exists) {
    uriCache.set(remoteUri, localUri);
    return localUri;
  }

  const token = await getAccessToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const result = await downloadAsync(remoteUri, localUri, { headers });
    if (result.status < 200 || result.status >= 300) {
      return null;
    }
    uriCache.set(remoteUri, result.uri);
    return result.uri;
  } catch {
    return null;
  }
}
