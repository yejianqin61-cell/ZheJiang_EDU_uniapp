import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ShippingAddressService } from './services/shipping-address.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Controller('shipping-addresses')
@UseGuards(JwtAuthGuard)
export class ShippingAddressController {
  constructor(private readonly addrService: ShippingAddressService) {}

  @Get()
  list(@CurrentUser('id') userId: string) {
    return this.addrService.listByUser(userId);
  }

  @Get(':id')
  get(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.addrService.getById(id, userId);
  }

  @Post()
  create(@CurrentUser('id') userId: string, @Body() dto: CreateAddressDto) {
    return this.addrService.create(userId, dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: UpdateAddressDto) {
    return this.addrService.update(id, userId, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.addrService.delete(id, userId);
  }
}
