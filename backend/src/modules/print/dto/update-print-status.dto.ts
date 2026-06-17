import { IsOptional, IsString, IsIn } from 'class-validator';

const VALID_STATUSES = ['printing', 'shipped', 'delivered', 'null'] as const;

export class UpdatePrintStatusDto {
  @IsOptional()
  @IsString()
  @IsIn(VALID_STATUSES, { message: '物流状态仅可为 printing / shipped / delivered / null' })
  printStatus?: string | null;
}
