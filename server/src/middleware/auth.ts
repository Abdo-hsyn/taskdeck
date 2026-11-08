import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { unauthenticated } from '../lib/errors.js';

export const COOKIE_NAME = 'taskdeck_token';

export type AuthUser = { id: string; name: string; email: string };

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function signToken(user: AuthUser): string {
  return jwt.sign({ sub: user.id, name: user.name, email: user.email }, env.jwtSecret, {
    expiresIn: '7d',
  });
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.isProduction,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

/** Verifies the JWT cookie and attaches `req.user`. Throws 401 when invalid. */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return next(unauthenticated());

  try {
    const payload = jwt.verify(token, env.jwtSecret) as jwt.JwtPayload;
    if (typeof payload.sub !== 'string') return next(unauthenticated());
    req.user = {
      id: payload.sub,
      name: String(payload.name ?? ''),
      email: String(payload.email ?? ''),
    };
    next();
  } catch {
    next(unauthenticated('Invalid or expired session'));
  }
}
