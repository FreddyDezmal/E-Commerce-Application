/*
  Application-level role type. Deliberately defined here rather than
  imported from the generated Prisma `Role` enum: the JWT/auth layer
  should not be structurally coupled to the persistence layer's generated types
 */
export type Role = 'customer' | 'admin';

// Minimal JWT payload
export interface JwtPayload {
  sub: string; // user id
  role: Role;
}

export interface SafeUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  createdAt: Date;
}
