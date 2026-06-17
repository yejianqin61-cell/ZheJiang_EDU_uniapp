import { IsOptional, IsArray, ValidateNested, IsInt, Min, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

class DownloadPricingDto {
  @IsInt()
  @Min(1)
  unitPrice: number;
}

class PrintTierDto {
  @IsInt()
  tier: number;

  @IsInt()
  @Min(1)
  minQuantity: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxQuantity: number | null;

  @IsInt()
  @Min(1)
  unitPrice: number;
}

export class UpdatePricingDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => DownloadPricingDto)
  download?: DownloadPricingDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PrintTierDto)
  print?: PrintTierDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => DownloadPricingDto)
  cashback?: DownloadPricingDto;
}
