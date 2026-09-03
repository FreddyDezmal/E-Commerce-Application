import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { JwtPayload } from '../types/auth';

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn']
  });
}

export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, env.jwtSecret);

  if (typeof decoded !== 'object' || decoded === null) {
    throw new Error('Invalid token payload');
  }

  if (typeof decoded.sub !== 'string') {
    throw new Error('Invalid token subject');
  }

  if (decoded.role !== 'customer' && decoded.role !== 'admin') {
    throw new Error('Invalid token role');
  }

  return {
    sub: decoded.sub,
    role: decoded.role
  };
}