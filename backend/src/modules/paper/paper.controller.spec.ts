/**
 * PaperController 单元测试
 */
import { Test, TestingModule } from '@nestjs/testing';
import { PaperController } from './paper.controller';
import { PaperService } from './paper.service';

describe('PaperController', () => {
  let controller: PaperController;
  let paperService: any;

  beforeEach(async () => {
    paperService = {
      getConfigOptions: jest.fn().mockReturnValue({ grades: [], subjects: [], difficulties: [] }),
      getKnowledgePoints: jest.fn().mockResolvedValue([]),
      generate: jest.fn().mockResolvedValue({ paperId: 'paper-1', title: '测试卷', questions: [], generateTime: 15.0 }),
      getPaperById: jest.fn().mockResolvedValue({ paperId: 'paper-1', title: '测试卷', status: 'draft', questions: [] }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaperController],
      providers: [{ provide: PaperService, useValue: paperService }],
    }).compile();

    controller = module.get<PaperController>(PaperController);
  });

  it('GET /papers/config-options → should return config', () => {
    const result = controller.getConfigOptions();
    expect(result).toHaveProperty('grades');
    expect(result).toHaveProperty('subjects');
    expect(result).toHaveProperty('difficulties');
  });

  it('GET /papers/knowledge-points → should query by subject and grade', async () => {
    await controller.getKnowledgePoints('数学', '五年级');
    expect(paperService.getKnowledgePoints).toHaveBeenCalledWith('数学', '五年级');
  });

  it('POST /papers/generate → should generate a paper', async () => {
    const dto = { subject: '数学', grade: '五年级', difficulty: 'mixed', questionCount: 5 };
    const result = await controller.generate('user-1', dto);
    expect(result.paperId).toBe('paper-1');
    expect(result.generateTime).toBe(15.0);
  });

  it('GET /papers/:id → should return paper detail', async () => {
    const result = await controller.getPaper('paper-1', 'user-1');
    expect(result.paperId).toBe('paper-1');
    expect(paperService.getPaperById).toHaveBeenCalledWith('paper-1', 'user-1');
  });
});
