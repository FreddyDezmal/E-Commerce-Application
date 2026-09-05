import { NextFunction, Request, Response } from 'express';
import { ZodSchema } from 'zod';
import { ValidationError } from '../errors/AppError';

// Wraps a Zod schema as Express middleware. Rejects malformed input with 400 before it reaches any controller/service/database call
export function validateBody(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(new ValidationError('Invalid request body', result.error.flatten()));
      return;
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      next(new ValidationError('Invalid query parameters', result.error.flatten()));
      return;
    }
    (req as Request & { validatedQuery?: unknown }).validatedQuery = result.data;
    next();
  };
}
