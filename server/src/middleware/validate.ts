import { NextFunction, Request, Response } from 'express';
import { ZodError, ZodType } from 'zod';

/** Parses `req.body` with the given schema; ZodError flows to the error handler as 400. */
export function validateBody<T>(schema: ZodType<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      next(err instanceof ZodError ? err : err);
    }
  };
}
