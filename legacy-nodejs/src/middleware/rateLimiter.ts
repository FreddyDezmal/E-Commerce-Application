import rateLimit from 'express-rate-limit';
import { isTest } from '../config/env';

/**
 * Strict rate limit on login/register (Milestone 2 §19 / brute-force
 * mitigation, §20 Security Threats). Skipped entirely under NODE_ENV=test
 * so the automated test suite isn't itself rate-limited.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many attempts, please try again later' } }
});


export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest
});
