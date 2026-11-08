import { Request } from 'express';
import { notFound } from './errors.js';

/**
 * Reads a route param as a string.
 * Express 5 types params as `string | string[]`, so this narrows safely
 * (a missing/odd param is a 404, not a crash).
 */
export function param(req: Request, name: string): string {
  const value = req.params[name];
  if (typeof value !== 'string' || value.length === 0) throw notFound();
  return value;
}
