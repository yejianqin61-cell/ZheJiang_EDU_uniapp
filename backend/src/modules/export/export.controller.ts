import { Controller, Post, Param, UseGuards } from '@nestjs/common';
import { ExportService } from './export.service';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('papers')
@UseGuards(JwtAuthGuard)
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Post(':id/export/docx')
  exportDocx(@Param('id') paperId: string, @CurrentUser('id') userId: string) {
    return this.exportService.exportDocx(paperId, userId);
  }

  @Post(':id/export/pdf')
  exportPdf(@Param('id') paperId: string, @CurrentUser('id') userId: string) {
    return this.exportService.exportPdf(paperId, userId);
  }
}
