import { Request } from 'express';

export interface AuthUser {
  id: string;
  telegramId: string;
  firstName: string;
  lastName: string | null;
  username: string | null;
}

export type AuthenticatedRequest = Request & { user: AuthUser };
