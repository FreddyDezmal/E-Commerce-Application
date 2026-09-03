import { NextFunction, Request, Response } from 'express';
import { AppError, ValidationError } from './AppError';

export function notFoundHandler(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const error = new AppError(
    `Route ${req.method} ${req.originalUrl} not found`,
    404
  );

  next(error);
}


export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  
  if (res.headersSent) {
    next(error);
    return;
  }

  
  if (error instanceof AppError) {
    const response: {
      error: {
        code: string;
        message: string;
        details?: unknown;
      };
    } = {
      error: {
        code: getErrorCode(error),
        message: error.message
      }
    };

   
    if (
      error instanceof ValidationError &&
      error.details !== undefined
    ) {
      response.error.details = error.details;
    }

    res.status(error.statusCode).json(response);
    return;
  }

  
  console.error('Unexpected error:', error);

  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred'
    }
  });
}


function getErrorCode(error: AppError): string {
  switch (error.statusCode) {
    case 400:
      return 'VALIDATION_ERROR';

    case 401:
      return 'UNAUTHORIZED';

    case 403:
      return 'FORBIDDEN';

    case 404:
      return 'NOT_FOUND';

    case 409:
      return 'CONFLICT';

    default:
      return 'APPLICATION_ERROR';
  }
}
