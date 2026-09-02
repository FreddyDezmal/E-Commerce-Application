import { PrismaClient } from '@prisma/client';
import { prisma } from '../config/database';
import { IAddressRepository } from './interfaces';
import { AddressRecord } from '../types/domain';

export class AddressRepository implements IAddressRepository {
  constructor(private readonly client: PrismaClient = prisma) {}

  async findById(id: string): Promise<AddressRecord | null> {
    const row = await this.client.address.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findByUser(userId: string): Promise<AddressRecord[]> {
    const rows = await this.client.address.findMany({ where: { userId } });
    return rows.map(this.toDomain);
  }

  async create(input: Omit<AddressRecord, 'id'>): Promise<AddressRecord> {
    const row = await this.client.address.create({
      data: {
        userId: input.userId,
        line1: input.line1,
        city: input.city,
        region: input.region,
        postalCode: input.postalCode,
        country: input.country,
        isDefault: input.isDefault
      }
    });
    return this.toDomain(row);
  }

  private toDomain(row: any): AddressRecord {
    return {
      id: row.id,
      userId: row.userId,
      line1: row.line1,
      city: row.city,
      region: row.region,
      postalCode: row.postalCode,
      country: row.country,
      isDefault: row.isDefault
    };
  }
}
