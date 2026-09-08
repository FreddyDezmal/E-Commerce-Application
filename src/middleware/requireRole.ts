import { NextFunction, Request, Response } from 'express';
import { ForbiddenError, UnauthorizedError } from '../errors/AppError';
import { Role } from '../types/auth';

/*
 Role-based authorization. MUST run after `authenticate`
 in the middleware chain. Distinguishes "not authenticated at all" (401 —
 a misconfiguration if this fires, since authenticate should always run
 first) from "authenticated but the wrong role" (403).
 */
export function requireRole(role: Role) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('Authentication required before authorization can be checked'));
      return;
    }
    if (req.user.role !== role) {
      next(new ForbiddenError(`This action requires the '${role}' role`));
      return;
    }
    next();
  };
}
