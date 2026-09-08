import { NextFunction, Request, Response } from 'express';
import { CartService } from '../services/cart.service';
import { UnauthorizedError } from '../errors/AppError';

function requireUserId(req: Request): string {
  if (!req.user) {
    throw new UnauthorizedError();
  }
  return req.user.id;
}

export class CartController {
  constructor(private readonly cartService: CartService) {}

  getCart = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const cart = await this.cartService.getCart(requireUserId(req));
      res.status(200).json(cart);
    } catch (error) {
      next(error);
    }
  };

  addItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = requireUserId(req);
      const cart = await this.cartService.addItem(userId, req.body.productId, req.body.quantity);
      res.status(201).json(cart);
    } catch (error) {
      next(error);
    }
  };

  updateItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = requireUserId(req);
      const cart = await this.cartService.updateItemQuantity(userId, req.params.id, req.body.quantity);
      res.status(200).json(cart);
    } catch (error) {
      next(error);
    }
  };

  removeItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = requireUserId(req);
      await this.cartService.removeItem(userId, req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}
