import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors.js';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.status).json({ error: { message: err.message, code: err.code } });
    return;
  }

  if (err instanceof ZodError) {
    const message = err.issues
      .map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`)
      .join('; ');
    res.status(400).json({ error: { message, code: 'VALIDATION' } });
    return;
  }

  // Prisma unique-constraint violation
  if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === 'P2002') {
    res.status(409).json({ error: { message: 'Resource already exists', code: 'CONFLICT' } });
    return;
  }

  // Body-parser / HTTP errors that already carry a client-facing status
  // (e.g. malformed JSON → 400 entity.parse.failed).
  if (typeof err === 'object' && err !== null) {
    const client = err as { status?: unknown; statusCode?: unknown; expose?: unknown };
    const status = Number(client.status ?? client.statusCode);
    if (client.expose === true && status >= 400 && status < 500) {
      res.status(status).json({ error: { message: 'Invalid request body', code: 'VALIDATION' } });
      return;
    }
  }

  console.error('[error]', err);
  res.status(500).json({ error: { message: 'Internal server error', code: 'INTERNAL' } });
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: { message: 'Route not found', code: 'NOT_FOUND' } });
}
