import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShippingAddress } from '../../../database/entities/shipping-address.entity';

const MAX_ADDRESSES = 10;

@Injectable()
export class ShippingAddressService {
  constructor(
    @InjectRepository(ShippingAddress)
    private readonly repo: Repository<ShippingAddress>,
  ) {}

  // ── List user's addresses ──────────────────────────────────

  async listByUser(userId: string) {
    const addresses = await this.repo.find({
      where: { userId },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });

    return addresses.map((a) => ({
      id: a.id,
      receiverName: a.receiverName,
      phone: a.phone,
      province: a.province,
      city: a.city,
      district: a.district,
      detail: a.detail,
      isDefault: a.isDefault,
    }));
  }

  // ── Get single address ─────────────────────────────────────

  async getById(id: string, userId: string) {
    const addr = await this.repo.findOne({ where: { id } });
    if (!addr) throw new NotFoundException({ code: 60001, message: '地址不存在' });
    if (addr.userId !== userId) {
      throw new ForbiddenException({ code: 60002, message: '无权访问该地址' });
    }
    return addr;
  }

  // ── Create address ─────────────────────────────────────────

  async create(userId: string, dto: {
    receiverName: string;
    phone: string;
    province: string;
    city: string;
    district: string;
    detail: string;
    isDefault?: boolean;
  }) {
    // Count existing addresses
    const count = await this.repo.count({ where: { userId } });
    if (count >= MAX_ADDRESSES) {
      throw new BadRequestException({ code: 60003, message: `最多添加${MAX_ADDRESSES}个地址` });
    }

    // If set as default, unset other defaults
    if (dto.isDefault) {
      await this.repo.update({ userId, isDefault: true }, { isDefault: false });
    }

    const addr = await this.repo.save(
      this.repo.create({
        userId,
        receiverName: dto.receiverName,
        phone: dto.phone,
        province: dto.province,
        city: dto.city,
        district: dto.district,
        detail: dto.detail,
        isDefault: dto.isDefault ?? (count === 0), // first address auto-default
      }),
    );

    return { id: addr.id };
  }

  // ── Update address ─────────────────────────────────────────

  async update(id: string, userId: string, dto: {
    receiverName?: string;
    phone?: string;
    province?: string;
    city?: string;
    district?: string;
    detail?: string;
    isDefault?: boolean;
  }) {
    const addr = await this.getById(id, userId);

    // If setting as default, unset others
    if (dto.isDefault === true) {
      await this.repo.update({ userId, isDefault: true }, { isDefault: false });
    }

    // Merge updates
    if (dto.receiverName !== undefined) addr.receiverName = dto.receiverName;
    if (dto.phone !== undefined) addr.phone = dto.phone;
    if (dto.province !== undefined) addr.province = dto.province;
    if (dto.city !== undefined) addr.city = dto.city;
    if (dto.district !== undefined) addr.district = dto.district;
    if (dto.detail !== undefined) addr.detail = dto.detail;
    if (dto.isDefault !== undefined) addr.isDefault = dto.isDefault;

    await this.repo.save(addr);
  }

  // ── Delete address ─────────────────────────────────────────

  async delete(id: string, userId: string) {
    await this.getById(id, userId); // validates ownership
    await this.repo.delete(id);
  }

  // ── Snapshot address (for order freezing) ──────────────────

  async snapshot(id: string, userId: string): Promise<Record<string, any>> {
    const addr = await this.getById(id, userId);
    return {
      receiverName: addr.receiverName,
      phone: addr.phone,
      province: addr.province,
      city: addr.city,
      district: addr.district,
      detail: addr.detail,
    };
  }
}
