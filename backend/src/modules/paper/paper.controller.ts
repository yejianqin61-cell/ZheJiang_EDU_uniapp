import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { PaperService } from './paper.service';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('papers')
@UseGuards(JwtAuthGuard)
export class PaperController {
  constructor(private readonly paperService: PaperService) {}

  @Get('config-options')
  getConfigOptions() {
    return this.paperService.getConfigOptions();
  }

  @Get('knowledge-points')
  getKnowledgePoints(@Query('subject') subject: string, @Query('grade') grade: string) {
    return this.paperService.getKnowledgePoints(subject, grade);
  }

  @Post('generate')
  generate(
    @CurrentUser('id') userId: string,
    @Body() dto: { subject: string; grade: string; knowledgePointIds?: string[]; difficulty: string; questionCount: number },
  ) {
    return this.paperService.generate(userId, dto);
  }

  @Post(':id/regenerate')
  regenerate(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.paperService.regenerate(id, userId);
  }
}
