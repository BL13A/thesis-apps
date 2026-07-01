import type { DeliveryStatus, StockStatus } from '@/types';
import type { StatusTone } from '@/utils/status';

export function getStockStatusTone(status: StockStatus | string): StatusTone {
  if (status === 'In Stock') return 'passed';
  if (status === 'Out of Stock') return 'rejected';
  if (status === 'Low Stock') return 'pending';
  return 'neutral';
}

export function getDeliveryStatusTone(status: DeliveryStatus | string): StatusTone {
  if (status === 'Delivered') return 'passed';
  if (status === 'Cancelled') return 'rejected';
  if (status === 'Pending') return 'pending';
  return 'neutral';
}

export function formatConfidence(score: number): string {
  return `${Math.round(score * 100)}%`;
}
