import { IsString, IsBoolean, IsOptional, Length, Matches } from 'class-validator';

export class CreateAddressDto {
  @IsString()
  @Length(1, 32)
  receiverName: string;

  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone: string;

  @IsString()
  @Length(1, 32)
  province: string;

  @IsString()
  @Length(1, 32)
  city: string;

  @IsString()
  @Length(1, 32)
  district: string;

  @IsString()
  @Length(1, 256)
  detail: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
