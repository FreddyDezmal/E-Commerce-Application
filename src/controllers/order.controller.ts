import { NextFunction, Request, Response } from 'express';
import { OrderService } from '../services/order.service';
import { UnauthorizedError } from '../errors/AppError';
import { OrderStatus } from '../types/domain';

function requireUser(req: Request): { id: string; role: 'customer' | 'admin' } {
  if (!req.user) {
    throw new UnauthorizedError();
  }
  return req.user as { id: string; role: 'customer' | 'admin' };
}

interface QueryHolder {
  validatedQuery?: { page?: number; limit?: number; status?: OrderStatus };
}

export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  checkout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = requireUser(req);
      const order = await this.orderService.checkout(user.id, req.body.shippingAddressId ?? null);
      res.status(201).json(order);
    } catch (error) {
      next(error);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = requireUser(req);
      const query = (req as unknown as QueryHolder).validatedQuery ?? {};
      const page = query.page ?? 1;
      const limit = query.limit ?? 20;

      const result =
        user.role === 'admin'
          ? await this.orderService.listAllOrders(page, limit, query.status)
          : await this.orderService.listOrdersForUser(user.id, page, limit);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = requireUser(req);
      const order = await this.orderService.getOrderForUser(req.params.id, user.id, user.role);
      res.status(200).json(order);
    } catch (error) {
      next(error);
    }
  };

  updateStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const order = await this.orderService.updateStatus(req.params.id, req.body.status);
      res.status(200).json(order);
    } catch (error) {
      next(error);
    }
  };
}
