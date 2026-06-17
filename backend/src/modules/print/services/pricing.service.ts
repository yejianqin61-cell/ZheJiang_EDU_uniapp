import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PricingConfig } from '../../../database/entities/pricing-config.entity';

export interface PrintTier {
  tier: number;
  minQuantity: number;
  maxQuantity: number | null;
  unitPrice: number;
}

export interface PricingResult {
  tier: number;
  unitPrice: number;
  total: number;
}

@Injectable()
export class PricingService {
  constructor(
    @InjectRepository(PricingConfig)
    private readonly repo: Repository<PricingConfig>,
  ) {}

  // ── Get all pricing config ─────────────────────────────────

  async getPricingConfig() {
    const all = await this.repo.find({ order: { type: 'ASC', tier: 'ASC' } });

    const download = all.find((c) => c.type === 'download');
    const printTiers = all.filter((c) => c.type === 'print');
    const cashback = all.find((c) => c.type === 'cashback');

    return {
      download: download
        ? { unitPrice: download.unitPrice, description: '按题计费' }
        : { unitPrice: 200, description: '按题计费' },
      print: printTiers.map((t) => ({
        tier: t.tier,
        minQuantity: t.minQuantity,
        maxQuantity: t.maxQuantity,
        unitPrice: t.unitPrice,
      })),
      cashback: cashback
        ? { unitPrice: cashback.unitPrice, description: '教师贡献题通过审核，每题返现' }
        : { unitPrice: 100, description: '教师贡献题通过审核，每题返现' },
    };
  }

  // ── Download price ─────────────────────────────────────────

  async getDownloadPrice(): Promise<number> {
    const config = await this.repo.findOne({ where: { type: 'download', tier: 1 } });
    return config?.unitPrice ?? 200;
  }

  // ── Calculate print price ──────────────────────────────────

  /**
   * Match the copies count to the appropriate pricing tier.
   * Returns the tier number, unit price, and total cost.
   */
  async calculatePrintPrice(copies: number): Promise<PricingResult> {
    if (copies < 1) {
      throw new BadRequestException({ code: 30007, message: '份数必须大于0' });
    }

    const tiers = await this.repo.find({
      where: { type: 'print' },
      order: { tier: 'ASC' },
    });

    if (tiers.length === 0) {
      // Fallback: no tiers configured
      return { tier: 1, unitPrice: 500, total: copies * 500 };
    }

    for (const tier of tiers) {
      const min = tier.minQuantity ?? 1;
      const max = tier.maxQuantity ?? Number.MAX_SAFE_INTEGER;
      if (copies >= min && copies <= max) {
        return {
          tier: tier.tier,
          unitPrice: tier.unitPrice,
          total: copies * tier.unitPrice,
        };
      }
    }

    // Should never reach here if tiers are continuous
    const lastTier = tiers[tiers.length - 1];
    return {
      tier: lastTier.tier,
      unitPrice: lastTier.unitPrice,
      total: copies * lastTier.unitPrice,
    };
  }

  // ── Update pricing config ──────────────────────────────────

  async updatePricing(dto: {
    download?: { unitPrice: number };
    print?: PrintTier[];
    cashback?: { unitPrice: number };
  }, updatedBy: string) {
    if (dto.download) {
      if (dto.download.unitPrice <= 0) {
        throw new BadRequestException({ code: 90001, message: '单题价格必须大于0' });
      }
      await this.repo.upsert(
        {
          type: 'download',
          tier: 1,
          minQuantity: null,
          maxQuantity: null,
          unitPrice: dto.download.unitPrice,
          updatedBy,
        },
        ['type', 'tier'],
      );
    }

    if (dto.print && dto.print.length > 0) {
      this.validatePrintTiers(dto.print);

      for (const tier of dto.print) {
        if (tier.unitPrice <= 0) {
          throw new BadRequestException({ code: 90001, message: `第${tier.tier}档单价必须大于0` });
        }
        await this.repo.upsert(
          {
            type: 'print',
            tier: tier.tier,
            minQuantity: tier.minQuantity,
            maxQuantity: tier.maxQuantity,
            unitPrice: tier.unitPrice,
            updatedBy,
          },
          ['type', 'tier'],
        );
      }
    }

    if (dto.cashback) {
      if (dto.cashback.unitPrice <= 0) {
        throw new BadRequestException({ code: 90001, message: '返现金额必须大于0' });
      }
      await this.repo.upsert(
        {
          type: 'cashback',
          tier: 1,
          minQuantity: null,
          maxQuantity: null,
          unitPrice: dto.cashback.unitPrice,
          updatedBy,
        },
        ['type', 'tier'],
      );
    }
  }

  // ── Validation ─────────────────────────────────────────────

  private validatePrintTiers(tiers: PrintTier[]) {
    if (tiers.length !== 3) {
      throw new BadRequestException({ code: 90002, message: '打印定价必须恰好3档' });
    }

    // Sort by tier
    const sorted = [...tiers].sort((a, b) => a.tier - b.tier);

    // Tier 1: min must be 1
    if (sorted[0].minQuantity !== 1) {
      throw new BadRequestException({ code: 90003, message: '第1档起始份数必须为1' });
    }

    // Tiers 1 & 2: max must not be null; adjacent tiers must be continuous
    for (let i = 0; i < sorted.length - 1; i++) {
      const curr = sorted[i];
      const next = sorted[i + 1];

      if (curr.maxQuantity === null) {
        throw new BadRequestException({
          code: 90004,
          message: `第${curr.tier}档最大份数不能为空（仅末档可为上不封顶）`,
        });
      }

      if (curr.maxQuantity + 1 !== next.minQuantity) {
        throw new BadRequestException({
          code: 90005,
          message: `第${curr.tier}档最大份数(${curr.maxQuantity})+1 必须等于第${next.tier}档起始份数(${next.minQuantity})`,
        });
      }
    }

    // Tier 3 (last): max must be null (no upper limit)
    const last = sorted[sorted.length - 1];
    if (last.maxQuantity !== null) {
      throw new BadRequestException({
        code: 90006,
        message: `第${last.tier}档（末档）必须上不封顶（最大份数为空）`,
      });
    }
  }

  // ── Seed default pricing (called on app bootstrap) ─────────

  async seedDefaults() {
    const existing = await this.repo.count();
    if (existing > 0) return;

    await this.repo.save([
      this.repo.create({ type: 'download', tier: 1, minQuantity: null, maxQuantity: null, unitPrice: 200 }),
      this.repo.create({ type: 'print', tier: 1, minQuantity: 1, maxQuantity: 10, unitPrice: 500 }),
      this.repo.create({ type: 'print', tier: 2, minQuantity: 11, maxQuantity: 50, unitPrice: 400 }),
      this.repo.create({ type: 'print', tier: 3, minQuantity: 51, maxQuantity: null, unitPrice: 300 }),
      this.repo.create({ type: 'cashback', tier: 1, minQuantity: null, maxQuantity: null, unitPrice: 100 }),
    ]);
  }
}
