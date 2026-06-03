import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import axios from 'axios';
import { Paper } from '../../database/entities/paper.entity';
import { Order } from '../../database/entities/order.entity';
import { PaperQuestionSnapshot } from '../../database/entities/paper-question-snapshot.entity';
import { LocalFileService } from './services/local-file.service';

@Injectable()
export class ExportService {
  private readonly pythonUrl: string;

  constructor(
    @InjectRepository(Paper)
    private readonly paperRepo: Repository<Paper>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(PaperQuestionSnapshot)
    private readonly snapshotRepo: Repository<PaperQuestionSnapshot>,
    private readonly localFileService: LocalFileService,
    private readonly config: ConfigService,
  ) {
    this.pythonUrl = config.get<string>('export.pythonServiceUrl', 'http://localhost:5000');
  }

  async exportDocx(paperId: string, userId: string) {
    const { paper, snapshots } = await this.verifyAndLoad(paperId, userId);

    const payload = this.buildPayload(paper.title, snapshots);
    let buffer: Buffer;

    try {
      buffer = await this.callPythonExport('docx', payload);
    } catch (err: any) {
      // Dev fallback: generate text file locally when Python isn't running
      console.warn(`Python export service unavailable, using dev fallback: ${err.message}`);
      buffer = this.generateTextExport(paper.title, snapshots);
    }

    // Save file and update paper
    const filename = `${paper.title}.docx`;
    const fileId = await this.localFileService.save(filename, buffer);

    await this.paperRepo.update(paperId, {
      exportDocxUrl: this.localFileService.getDownloadUrl(fileId),
      exportedAt: new Date(),
      status: 'exported',
    });

    const expiresAt = new Date(Date.now() + this.localFileService.getLinkTtl() * 1000);
    return {
      downloadUrl: this.localFileService.getDownloadUrl(fileId),
      expiresAt: expiresAt.toISOString(),
    };
  }

  async exportPdf(paperId: string, userId: string) {
    const { paper, snapshots } = await this.verifyAndLoad(paperId, userId);

    // PDF depends on DOCX first. Check if DOCX was already generated.
    if (!paper.exportDocxUrl) {
      throw new ConflictException({ code: 40002, message: '请先生成DOCX，再导出PDF' });
    }

    const payload = this.buildPayload(paper.title, snapshots);
    let buffer: Buffer;

    try {
      buffer = await this.callPythonExport('pdf', payload);
    } catch (err: any) {
      console.warn(`Python PDF export unavailable, using dev fallback: ${err.message}`);
      // Dev fallback: same text content as "PDF"
      buffer = this.generateTextExport(paper.title, snapshots);
    }

    const filename = `${paper.title}.pdf`;
    const fileId = await this.localFileService.save(filename, buffer);

    await this.paperRepo.update(paperId, {
      exportPdfUrl: this.localFileService.getDownloadUrl(fileId),
      exportedAt: new Date(),
    });

    const expiresAt = new Date(Date.now() + this.localFileService.getLinkTtl() * 1000);
    return {
      downloadUrl: this.localFileService.getDownloadUrl(fileId),
      expiresAt: expiresAt.toISOString(),
    };
  }

  // === Private helpers ===

  private async verifyAndLoad(paperId: string, userId: string) {
    const paper = await this.paperRepo.findOne({ where: { id: paperId, userId } });
    if (!paper) throw new NotFoundException({ code: 30001, message: '试卷不存在' });

    const order = await this.orderRepo.findOne({
      where: { paperId, userId, status: 'paid' },
    });
    if (!order) throw new ConflictException({ code: 40001, message: '请先完成支付' });

    const snapshots = await this.snapshotRepo.find({
      where: { paperId },
      order: { sortOrder: 'ASC' },
    });

    if (snapshots.length === 0) {
      throw new NotFoundException({ code: 40002, message: '试卷内容为空，无法导出' });
    }

    return { paper, snapshots };
  }

  private buildPayload(title: string, snapshots: PaperQuestionSnapshot[]) {
    return {
      title,
      questions: snapshots.map((s) => ({
        index: s.sortOrder,
        ...s.snapshot,
      })),
    };
  }

  private async callPythonExport(format: 'docx' | 'pdf', payload: any): Promise<Buffer> {
    const res = await axios.post(
      `${this.pythonUrl}/export/${format}`,
      payload,
      {
        responseType: 'arraybuffer',
        timeout: 15000,
      },
    );
    return Buffer.from(res.data);
  }

  /**
   * Dev fallback: generate a simple text representation of the paper.
   * Saved as .docx/.pdf but actually contains readable text content.
   */
  private generateTextExport(title: string, snapshots: PaperQuestionSnapshot[]): Buffer {
    let text = `${title}\n\n`;
    text += `=${'='.repeat(40)}\n\n`;

    // Questions section
    text += `【试题部分】\n\n`;
    for (const s of snapshots) {
      const q = s.snapshot;
      text += `${q.index}. (${q.type}) ${q.content}\n`;
      if (q.options?.length) {
        for (const opt of q.options) {
          text += `    ${opt}\n`;
        }
      }
      text += `    分值: ${q.score ?? 5} | 难度: ${['', '简单', '中等', '困难'][q.difficulty] ?? '?'}\n\n`;
    }

    // Answers section (separated)
    text += `\n=${'='.repeat(40)}\n\n`;
    text += `【参考答案】\n\n`;
    for (const s of snapshots) {
      const q = s.snapshot;
      text += `${q.index}. 答案: ${q.answer ?? '(无)'}`;
      if (q.analysis) {
        text += `\n    解析: ${q.analysis}`;
      }
      text += '\n\n';
    }

    return Buffer.from(text, 'utf-8');
  }
}
