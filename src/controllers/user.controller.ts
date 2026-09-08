import { NextFunction, Request, Response } from 'express';
import { UserService } from '../services/user.service';
import { UnauthorizedError } from '../errors/AppError';

function requireUserId(req: Request): string {
  if (!req.user) {
    throw new UnauthorizedError();
  }
  return req.user.id;
}

export class UserController {
  constructor(private readonly userService: UserService) {}

  getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const profile = await this.userService.getProfile(requireUserId(req));
      res.status(200).json(profile);
    } catch (error) {
      next(error);
    }
  };

  updateMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const profile = await this.userService.updateProfile(requireUserId(req), req.body);
      res.status(200).json(profile);
    } catch (error) {
      next(error);
    }
  };
}
