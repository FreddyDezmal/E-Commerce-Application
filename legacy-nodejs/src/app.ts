import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import routes from './routes';
import { errorHandler, notFoundHandler } from './errors/errorHandler';
import { globalRateLimiter } from './middleware/rateLimiter';
import { env, isProduction, isTest } from './config/env';

export function createApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.corsOrigin.split(',').map((origin) => origin.trim()),
      credentials: true
    })
  );

  if (!isTest) {
    app.use(morgan(isProduction ? 'combined' : 'dev'));
  }

  app.use(express.json());
  app.use(globalRateLimiter);

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.use('/api', routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
