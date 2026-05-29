import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Paper } from '../../database/entities/paper.entity';
import { Order } from '../../database/entities/order.entity';
import { PaperQuestionSnapshot } from '../../database/entities/paper-question-snapshot.entity';

@Injectable()
export class ExportService {
  constructor(
    @InjectRepository(Paper)
    private readonly paperRepo: Repository<Paper>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(PaperQuestionSnapshot)
    private readonly snapshotRepo: Repository<PaperQuestionSnapshot>,
  ) {}

  async exportDocx(paperId: string, userId: string) {
    await this.verifyPaid(paperId, userId);

    // TODO:
    // 1. Read paper_question_snapshot with full question data (answer, analysis, score, etc.)
    // 2. Call Python export service: POST /export/docx with snapshot JSON
    // 3. Upload generated DOCX to COS
    // 4. Update paper.export_docx_url and paper.exported_at
    // 5. Return COS signed URL (24h TTL)

    return { downloadUrl: '', expiresAt: new Date(Date.now() + 86400000).toISOString() };
  }

  async exportPdf(paperId: string, userId: string) {
    await this.verifyPaid(paperId, userId);

    // TODO: same flow, LibreOffice conversion step
    return { downloadUrl: '', expiresAt: new Date(Date.now() + 86400000).toISOString() };
  }

  private async verifyPaid(paperId: string, userId: string) {
    const paper = await this.paperRepo.findOne({ where: { id: paperId, userId } });
    if (!paper) throw new NotFoundException({ code: 30001, message: '试卷不存在' });

    const order = await this.orderRepo.findOne({
      where: { paperId, userId, status: 'paid' },
    });
    if (!order) throw new ConflictException({ code: 40001, message: '请先完成支付' });
  }
}
