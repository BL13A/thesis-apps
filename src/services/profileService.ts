import { apiRequest, getAuthApiUrl } from '@/services/apiClient';
import type { ApiResponse } from '@/types/auth';
import type { User } from '@/types';

export async function fetchCurrentUser(): Promise<User | null> {
  try {
    const result = await apiRequest<ApiResponse>(getAuthApiUrl('/me'), { auth: true });
    if (!result.success || !result.user) {
      return null;
    }
    return result.user;
  } catch {
    return null;
  }
}

export async function updateProfileOnApi(updates: {
  name: string;
  email: string;
  mobileNumber: string;
}): Promise<{ success: true; user: User } | { success: false; error: string }> {
  try {
    const result = await apiRequest<ApiResponse>(getAuthApiUrl('/profile'), {
      method: 'PATCH',
      auth: true,
      body: updates,
    });

    if (!result.success || !result.user) {
      return { success: false, error: result.error ?? 'Unable to save profile.' };
    }

    return { success: true, user: result.user };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unable to save profile.',
    };
  }
}
