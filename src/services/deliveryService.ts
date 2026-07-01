import { apiRequest, getDeliveriesApiUrl } from '@/services/apiClient';
import type { Delivery, DeliveryItem, DeliveryStatus } from '@/types';

export interface DeliveryInput {
  customerName: string;
  contactNumber: string;
  address: string;
  deliveryDate: string;
  status?: DeliveryStatus;
  items: Array<Pick<DeliveryItem, 'tileId' | 'quantity'>>;
}

export async function fetchDeliveries(): Promise<Delivery[]> {
  const result = await apiRequest<{ success: boolean; deliveries: Delivery[] }>(
    getDeliveriesApiUrl(''),
    { auth: true },
  );
  return result.deliveries;
}

export async function createDelivery(input: DeliveryInput): Promise<Delivery> {
  const result = await apiRequest<{ success: boolean; delivery: Delivery }>(
    getDeliveriesApiUrl(''),
    { method: 'POST', body: input, auth: true },
  );
  return result.delivery;
}

export async function updateDelivery(
  deliveryId: string,
  input: Partial<DeliveryInput>,
): Promise<Delivery> {
  const result = await apiRequest<{ success: boolean; delivery: Delivery }>(
    getDeliveriesApiUrl(`/${deliveryId}`),
    { method: 'PUT', body: input, auth: true },
  );
  return result.delivery;
}
