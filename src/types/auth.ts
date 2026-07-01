import type { Permission, User, UserRole } from '@/types';

export interface JwtClaims {
  sub: string;
  email: string;
  role: UserRole;
  permissions: Permission[];
  iat?: number;
  exp?: number;
}

export interface LoginResponse {
  success: boolean;
  accessToken?: string;
  tokenType?: string;
  expiresIn?: string;
  user?: User;
  permissions?: Permission[];
  error?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  error?: string;
  message?: string;
  user?: User;
  permissions?: Permission[];
  data?: T;
}
