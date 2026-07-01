import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  changePasswordWithApi,
  confirmPasswordResetWithApi,
  loginWithJwt,
  logoutJwt,
  requestPasswordResetWithApi,
  restoreSessionFromToken,
} from '@/services/authService';
import { fetchCurrentUser, updateProfileOnApi } from '@/services/profileService';
import { setUnauthorizedHandler } from '@/services/apiClient';
import type { User, UserRole } from '@/types';
import { hasRole } from '@/utils/permissions';
import { clearUser, getStoredUser, saveUser } from '@/utils/storage';

interface ProfileUpdates {
  name: string;
  email: string;
  mobileNumber: string;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  usesJwtAuth: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  requestPasswordReset: (
    email: string,
  ) => Promise<{ success: boolean; error?: string; message?: string }>;
  confirmPasswordReset: (
    token: string,
    newPassword: string,
  ) => Promise<{ success: boolean; error?: string; message?: string }>;
  logout: () => Promise<void>;
  updateProfile: (updates: ProfileUpdates) => Promise<{ success: boolean; error?: string }>;
  changePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<{ success: boolean; error?: string }>;
  refreshUser: () => Promise<void>;
  isWarehouse: boolean;
  isQA: boolean;
  hasRole: (role: UserRole) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(async () => {
    await logoutJwt();
    await clearUser();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const sessionUser = await fetchCurrentUser();
    if (sessionUser) {
      await saveUser(sessionUser);
      setUser(sessionUser);
      return;
    }

    await logout();
  }, [logout]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      void logout();
    });

    return () => {
      setUnauthorizedHandler(null);
    };
  }, [logout]);

  useEffect(() => {
    (async () => {
      const cachedUser = await getStoredUser();
      if (cachedUser) {
        setUser(cachedUser);
      }

      try {
        const sessionUser = await restoreSessionFromToken();
        if (sessionUser) {
          await saveUser(sessionUser);
          setUser(sessionUser);
        } else {
          await clearUser();
          setUser(null);
        }
      } catch {
        await clearUser();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await loginWithJwt(email, password);
    if (!result.success) {
      return result;
    }
    await saveUser(result.user);
    setUser(result.user);
    return { success: true };
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      return { success: false, error: 'Enter your email address first.' };
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(trimmed)) {
      return { success: false, error: 'Enter a valid email address.' };
    }

    return requestPasswordResetWithApi(trimmed);
  }, []);

  const confirmPasswordReset = useCallback(async (token: string, newPassword: string) => {
    const trimmedToken = token.trim();
    const trimmedPassword = newPassword.trim();

    if (!trimmedToken || !trimmedPassword) {
      return { success: false, error: 'Reset link is invalid. Request a new password reset email.' };
    }

    if (trimmedPassword.length < 8) {
      return { success: false, error: 'New password must be at least 8 characters.' };
    }

    return confirmPasswordResetWithApi(trimmedToken, trimmedPassword);
  }, []);

  const updateProfile = useCallback(async (updates: ProfileUpdates) => {
    if (!user) {
      return { success: false, error: 'No active session.' };
    }

    const result = await updateProfileOnApi(updates);
    if (!result.success) {
      return result;
    }

    await saveUser(result.user);
    setUser(result.user);
    return { success: true };
  }, [user]);

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      if (!user) {
        return { success: false, error: 'No active session.' };
      }

      if (newPassword.length < 8) {
        return { success: false, error: 'New password must be at least 8 characters.' };
      }

      return changePasswordWithApi(currentPassword, newPassword);
    },
    [user],
  );

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      usesJwtAuth: true,
      login,
      requestPasswordReset,
      confirmPasswordReset,
      logout,
      updateProfile,
      changePassword,
      refreshUser,
      isWarehouse: hasRole(user, 'Warehouse Personnel'),
      isQA: hasRole(user, 'Quality Assurance Officer'),
      hasRole: (role: UserRole) => hasRole(user, role),
    }),
    [
      user,
      isLoading,
      login,
      requestPasswordReset,
      confirmPasswordReset,
      logout,
      updateProfile,
      changePassword,
      refreshUser,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
