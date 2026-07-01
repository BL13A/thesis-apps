import { apiRequest, getDashboardApiUrl } from '@/services/apiClient';
import type { DashboardSummary } from '@/types';

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const result = await apiRequest<{ success: boolean; summary: DashboardSummary }>(
    getDashboardApiUrl('/summary'),
    { auth: true },
  );
  return result.summary;
}
