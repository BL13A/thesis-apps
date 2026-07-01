import {
  apiRequest,
  clearAccessToken,
  getAccessToken,
  getAuthApiUrl,
  saveAccessToken,
} from '@/services/apiClient';
import { fetchCurrentUser } from '@/services/profileService';
import type { ApiResponse, LoginResponse } from '@/types/auth';
import type { User } from '@/types';

export async function loginWithJwt(
  email: string,
  password: string,
): Promise<{ success: true; user: User } | { success: false; error: string }> {
  try {
    const result = await apiRequest<LoginResponse>(getAuthApiUrl('/login'), {
      method: 'POST',
      body: { email: email.trim().toLowerCase(), password },
    });

    if (!result.success || !result.accessToken || !result.user) {
      return { success: false, error: result.error ?? 'Login failed.' };
    }

    await saveAccessToken(result.accessToken);
    return { success: true, user: result.user };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Login failed.',
    };
  }
}

export async function restoreSessionFromToken(): Promise<User | null> {
  const token = await getAccessToken();
  if (!token) return null;

  const user = await fetchCurrentUser();
  if (!user) {
    await clearAccessToken();
    return null;
  }

  return user;
}

export async function logoutJwt(): Promise<void> {
  await clearAccessToken();
}

export async function requestPasswordResetWithApi(
  email: string,
): Promise<{ success: true; message: string } | { success: false; error: string }> {
  try {
    const result = await apiRequest<ApiResponse>(getAuthApiUrl('/forgot-password'), {
      method: 'POST',
      body: { email },
    });

    if (!result.success) {
      return { success: false, error: result.error ?? 'Unable to send reset code.' };
    }

    return {
      success: true,
      message:
        result.message ??
        'If an account exists for that email, a verification code has been sent.',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unable to send reset code.',
    };
  }
}

export async function validateResetTokenWithApi(
  token: string,
): Promise<{ success: true; valid: true } | { success: false; valid: false }> {
  try {
    const result = await apiRequest<ApiResponse & { valid?: boolean }>(
      `${getAuthApiUrl('/validate-reset-token')}?token=${encodeURIComponent(token)}`,
    );
    return result.success && result.valid
      ? { success: true, valid: true }
      : { success: false, valid: false };
  } catch {
    return { success: false, valid: false };
  }
}

export async function confirmPasswordResetWithApi(
  token: string,
  newPassword: string,
): Promise<{ success: true; message: string } | { success: false; error: string }> {
  try {
    const result = await apiRequest<ApiResponse>(getAuthApiUrl('/reset-password'), {
      method: 'POST',
      body: { token, newPassword },
    });

    if (!result.success) {
      return { success: false, error: result.error ?? 'Unable to reset password.' };
    }

    return {
      success: true,
      message: result.message ?? 'Password updated successfully.',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unable to reset password.',
    };
  }
}

export async function changePasswordWithApi(
  currentPassword: string,
  newPassword: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await apiRequest<ApiResponse>(getAuthApiUrl('/change-password'), {
      method: 'POST',
      auth: true,
      body: { currentPassword, newPassword },
    });

    if (!result.success) {
      return { success: false, error: result.error ?? 'Unable to change password.' };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unable to change password.',
    };
  }
}
