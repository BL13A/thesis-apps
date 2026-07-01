import type { InspectionRecord, QAStatus } from '@/types';
import { apiRequest, getInspectionsApiUrl } from '@/services/apiClient';

interface InspectionResponse {
  success: boolean;
  inspection?: InspectionRecord;
  error?: string;
}

export async function submitQaReview(
  id: string,
  qaStatus: QAStatus,
  qaRemarks: string,
  reviewerName: string,
): Promise<InspectionRecord> {
  const result = await apiRequest<InspectionResponse>(getInspectionsApiUrl(`/${id}/review`), {
    method: 'PATCH',
    auth: true,
    body: { qaStatus, qaRemarks, reviewerName },
  });

  if (!result.success || !result.inspection) {
    throw new Error(result.error ?? 'Unable to update QA review.');
  }

  return result.inspection;
}
