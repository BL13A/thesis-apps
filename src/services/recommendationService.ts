import { apiRequest, getRecommendationsApiUrl } from '@/services/apiClient';
import type { TileProduct } from '@/types';

export async function fetchRecommendations(tileId: string): Promise<TileProduct[]> {
  const result = await apiRequest<{ success: boolean; recommendations: TileProduct[] }>(
    getRecommendationsApiUrl(tileId),
    { auth: true },
  );
  return result.recommendations;
}
