import dotenv from 'dotenv';

dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim() !== '' ? value : fallback;
}

export const env = {
  nodeEnv: optionalEnv('NODE_ENV', 'development'),
  port: Number(optionalEnv('PORT', '4000')),

  databaseUrl: requireEnv('DATABASE_URL'),

  jwtSecret: requireEnv('JWT_SECRET'),
  jwtExpiresIn: optionalEnv('JWT_EXPIRES_IN', '60m'),
  bcryptSaltRounds: Number(optionalEnv('BCRYPT_SALT_ROUNDS', '12')),

  corsOrigin: optionalEnv('CORS_ORIGIN', 'http://localhost:5173')
} as const;

export const isProduction = env.nodeEnv === 'production';
export const isTest = env.nodeEnv === 'test';
