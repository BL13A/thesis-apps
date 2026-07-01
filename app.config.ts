import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ConfigContext, ExpoConfig } from 'expo/config';

function readEnvValue(name: string): string | undefined {
  if (process.env[name]?.trim()) {
    return process.env[name]!.trim();
  }

  const envPath = resolve(__dirname, '.env');
  if (!existsSync(envPath)) return undefined;

  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator === -1) continue;
    if (trimmed.slice(0, separator).trim() !== name) continue;
    return trimmed.slice(separator + 1).trim();
  }

  return undefined;
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? 'TileVision-Mobile',
  slug: config.slug ?? 'TileVision-Mobile',
  android: {
    ...config.android,
    usesCleartextTraffic: true,
  },
  extra: {
    ...config.extra,
    apiUrl: readEnvValue('EXPO_PUBLIC_API_URL'),
  },
});
