import AsyncStorage from '@react-native-async-storage/async-storage';

/** Set EXPO_PUBLIC_API_URL in .env — use your PC LAN IP for Expo Go on a physical phone. */
export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.8.124:3000'
).replace(/\/$/, '');

const ACCESS_TOKEN_KEY = '@tilevision_jwt';

type ApiMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

interface ApiRequestOptions {
  method?: ApiMethod;
  body?: unknown;
  auth?: boolean;
}

interface ApiMultipartOptions {
  method?: Exclude<ApiMethod, 'GET'>;
  body: FormData;
  auth?: boolean;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

export function getApiBaseUrl(): string {
  return API_BASE_URL.replace(/\/$/, '');
}

export function getAuthApiUrl(path: string): string {
  return `${getApiBaseUrl()}/api/auth${path}`;
}

export function getInspectionsApiUrl(path = ''): string {
  return `${getApiBaseUrl()}/api/inspections${path}`;
}

export function getNotificationsApiUrl(path = ''): string {
  return `${getApiBaseUrl()}/api/notifications${path}`;
}

export function getAiApiUrl(path: string): string {
  return `${getApiBaseUrl()}/api/ai${path}`;
}

export function getInspectApiUrl(query = ''): string {
  return `${getApiBaseUrl()}/api/inspect${query}`;
}

export function getTilesApiUrl(path = ''): string {
  return `${getApiBaseUrl()}/api/tiles${path}`;
}

export function getInventoryApiUrl(path: string): string {
  return `${getApiBaseUrl()}/api/inventory${path}`;
}

export function getStockMovementsApiUrl(path = ''): string {
  return `${getApiBaseUrl()}/api/stock-movements${path}`;
}

export function getDeliveriesApiUrl(path = ''): string {
  return `${getApiBaseUrl()}/api/deliveries${path}`;
}

export function getRecognitionLogsApiUrl(path = ''): string {
  return `${getApiBaseUrl()}/api/recognition-logs${path}`;
}

export function getRecommendationsApiUrl(tileId: string): string {
  return `${getApiBaseUrl()}/api/recommendations/${tileId}`;
}

export function getDashboardApiUrl(path: string): string {
  return `${getApiBaseUrl()}/api/dashboard${path}`;
}

export async function saveAccessToken(token: string): Promise<void> {
  await AsyncStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export async function getAccessToken(): Promise<string | null> {
  return AsyncStorage.getItem(ACCESS_TOKEN_KEY);
}

export async function clearAccessToken(): Promise<void> {
  await AsyncStorage.removeItem(ACCESS_TOKEN_KEY);
}

async function buildAuthHeaders(auth: boolean): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  if (!auth) {
    return headers;
  }

  const token = await getAccessToken();
  if (!token) {
    throw new ApiError('Not authenticated', 401);
  }
  headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function parseResponse<T>(response: Response): Promise<T> {
  let result: T;
  try {
    result = (await response.json()) as T;
  } catch {
    throw new ApiError(`API request failed (${response.status})`, response.status);
  }

  if (!response.ok) {
    const message =
      typeof result === 'object' &&
      result !== null &&
      'error' in result &&
      typeof (result as { error?: string }).error === 'string'
        ? (result as { error: string }).error
        : `API request failed (${response.status})`;

    if (response.status === 401) {
      unauthorizedHandler?.();
    }

    throw new ApiError(message, response.status);
  }

  return result;
}

export async function apiRequest<T>(url: string, options: ApiRequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = false } = options;

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(await buildAuthHeaders(auth)),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(`Cannot reach TileVision API at ${API_BASE_URL}`, 0);
  }

  return parseResponse<T>(response);
}

export async function apiMultipartRequest<T>(
  url: string,
  options: ApiMultipartOptions,
): Promise<T> {
  const { method = 'POST', body, auth = false } = options;

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: await buildAuthHeaders(auth),
      body,
    });
  } catch {
    throw new ApiError(`Cannot reach TileVision API at ${API_BASE_URL}`, 0);
  }

  return parseResponse<T>(response);
}
