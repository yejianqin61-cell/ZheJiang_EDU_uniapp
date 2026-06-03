import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { IsString, IsNotEmpty, IsOptional, IsInt, Min, Max, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { PaperService } from './paper.service';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

class GenerateDto {
  @IsString() @IsNotEmpty()
  subject: string;

  @IsString() @IsNotEmpty()
  grade: string;

  @IsOptional() @IsArray()
  knowledgePointIds?: string[];

  @IsString() @IsNotEmpty()
  difficulty: string;

  @Type(() => Number)
  @IsInt() @Min(1) @Max(50)
  questionCount: number;
}

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
  generate(@CurrentUser('id') userId: string, @Body() dto: GenerateDto) {
    return this.paperService.generate(userId, dto);
  }

  @Post(':id/regenerate')
  regenerate(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.paperService.regenerate(id, userId);
  }

  @Get(':id')
  getPaper(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.paperService.getPaperById(id, userId);
  }

  @Get('debug/count')
  async debugCount(@Query('subject') subject: string, @Query('grade') grade: string) {
    return this.paperService.debugCount(subject, grade);
  }
}
