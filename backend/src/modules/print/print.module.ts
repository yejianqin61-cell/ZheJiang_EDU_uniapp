import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShippingAddress } from '../../database/entities/shipping-address.entity';
import { PricingConfig } from '../../database/entities/pricing-config.entity';
import { Order } from '../../database/entities/order.entity';
import { ShippingAddressService } from './services/shipping-address.service';
import { PricingService } from './services/pricing.service';
import { PrintOrderService } from './services/print-order.service';
import { ShippingAddressController } from './shipping-address.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ShippingAddress, PricingConfig, Order]),
  ],
  controllers: [ShippingAddressController],
  providers: [ShippingAddressService, PricingService, PrintOrderService],
  exports: [ShippingAddressService, PricingService, PrintOrderService],
})
export class PrintModule implements OnModuleInit {
  constructor(private readonly pricingService: PricingService) {}

  async onModuleInit() {
    // Seed default pricing on first boot (SQL.js in-memory dev)
    await this.pricingService.seedDefaults();
  }
}
