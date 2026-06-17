import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ContributionService } from './services/contribution.service';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Controller('contributions')
@UseGuards(JwtAuthGuard)
export class ContributionController {
  constructor(private readonly contributionService: ContributionService) {}

  @Get()
  list(
    @CurrentUser('id') userId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.contributionService.listBatches(userId, pagination.page!, pagination.pageSize!);
  }

  @Get(':fileId')
  getDetail(
    @Param('fileId') fileId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.contributionService.getBatchDetail(fileId, userId);
  }

  @Post(':fileId/submit')
  submitForReview(
    @Param('fileId') fileId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.contributionService.submitForReview(fileId, userId);
  }
}
