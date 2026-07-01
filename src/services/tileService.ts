import {
  apiRequest,
  getInventoryApiUrl,
  getTilesApiUrl,
} from '@/services/apiClient';
import type { StockMovement, TileProduct } from '@/types';

export interface TileFilters {
  search?: string;
  tileType?: string;
  size?: string;
  color?: string;
  finish?: string;
  material?: string;
  status?: string;
}

function buildQuery(filters: TileFilters = {}): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value?.trim()) {
      params.set(key, value.trim());
    }
  });
  const query = params.toString();
  return query ? `?${query}` : '';
}

export async function fetchTiles(filters?: TileFilters): Promise<TileProduct[]> {
  const result = await apiRequest<{ success: boolean; tiles: TileProduct[] }>(
    `${getTilesApiUrl('')}${buildQuery(filters)}`,
    { auth: true },
  );
  return result.tiles;
}

export async function fetchTileById(
  tileId: string,
): Promise<{ tile: TileProduct; stockHistory: StockMovement[] }> {
  const result = await apiRequest<{
    success: boolean;
    tile: TileProduct;
    stockHistory: StockMovement[];
  }>(getTilesApiUrl(`/${tileId}`), { auth: true });
  return { tile: result.tile, stockHistory: result.stockHistory };
}

export async function fetchLowStockTiles(): Promise<TileProduct[]> {
  const result = await apiRequest<{ success: boolean; tiles: TileProduct[] }>(
    getInventoryApiUrl('/low-stock'),
    { auth: true },
  );
  return result.tiles;
}
