import { Controller, Get, Param, Res, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { LocalFileService } from './services/local-file.service';

@Controller('download')
export class DownloadController {
  constructor(private readonly localFileService: LocalFileService) {}

  /**
   * Serve exported files. Public endpoint (no auth) — the file ID acts as a capability URL.
   * Files expire after 24h (enforced by cleanup or TTL check).
   */
  @Public()
  @Get(':fileId')
  async download(@Param('fileId') fileId: string, @Res() res: Response) {
    const buffer = this.localFileService.read(fileId);
    if (!buffer) {
      throw new NotFoundException({ code: 50001, message: '文件不存在或已过期' });
    }

    // Extract original filename from fileId (format: timestamp_filename)
    const parts = fileId.split('_');
    const filename = parts.length > 1 ? parts.slice(1).join('_') : fileId;
    const mimeType = this.localFileService.getMimeType(filename);

    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      'Content-Length': buffer.length.toString(),
    });
    res.send(buffer);
  }
}
