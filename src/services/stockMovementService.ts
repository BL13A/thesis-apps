import { apiRequest, getStockMovementsApiUrl } from '@/services/apiClient';
import type { StockMovement, StockTransactionType, TileProduct } from '@/types';

export interface CreateStockMovementInput {
  tileId: string;
  transactionType: StockTransactionType;
  quantity: number;
  reason: string;
  transactionDate: string;
}

export async function createStockMovement(
  input: CreateStockMovementInput,
): Promise<{ movement: StockMovement; tile: TileProduct }> {
  const result = await apiRequest<{
    success: boolean;
    movement: StockMovement;
    tile: TileProduct;
  }>(getStockMovementsApiUrl(''), {
    method: 'POST',
    body: input,
    auth: true,
  });
  return { movement: result.movement, tile: result.tile };
}

export async function fetchStockMovements(tileId: string): Promise<StockMovement[]> {
  const result = await apiRequest<{ success: boolean; movements: StockMovement[] }>(
    getStockMovementsApiUrl(`/${tileId}`),
    { auth: true },
  );
  return result.movements;
}
