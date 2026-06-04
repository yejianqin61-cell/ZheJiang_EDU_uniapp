/**
 * 共享测试工具 — 统一 mock 工厂 + 测试数据 fixtures
 *
 * 所有模块测试通过导入此文件来避免重复编写 mock 代码。
 *
 * 使用示例:
 * ```
 * import { mockRepo, mockConfig, mockJwt, createUser, createQuestion } from '../../test-utils';
 *
 * const userRepo = mockRepo({ findOne: createUser() });
 * const config = mockConfig({ 'wx.appId': 'test-app-id' });
 * ```
 */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

// ── Re-exports for convenience ─────────────────────────────────
export { Test, TestingModule, getRepositoryToken, ConfigService, JwtService };

// ═══════════════════════════════════════════════════════════════
// Mock 工厂
// ═══════════════════════════════════════════════════════════════

/** QueryBuilder mock builder */
function createQueryBuilderMock(overrides: Record<string, any> = {}) {
  const qb: any = {
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    setParameters: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    getOne: jest.fn().mockResolvedValue(null),
    getCount: jest.fn().mockResolvedValue(0),
    getRawMany: jest.fn().mockResolvedValue([]),
    getRawOne: jest.fn().mockResolvedValue(null),
    ...overrides,
  };
  return qb;
}

/**
 * 创建 mock TypeORM Repository
 * @param overrides — 覆盖默认 mock 返回值
 */
export function mockRepo<T = any>(overrides: Record<string, any> = {}): any {
  return {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    findOneBy: jest.fn().mockResolvedValue(null),
    findOneOrFail: jest.fn().mockResolvedValue(null),
    findAndCount: jest.fn().mockResolvedValue([[], 0]),
    save: jest.fn().mockImplementation((entity: any) => {
      // 如果 entity 是数组，返回数组；否则返回带 id 的单个对象
      if (Array.isArray(entity)) {
        return Promise.resolve(entity.map((e, i) => ({ ...e, id: e.id ?? `saved-${i + 1}` })));
      }
      return Promise.resolve({ id: 'saved-1', ...entity });
    }),
    create: jest.fn().mockImplementation((dto: any) => dto),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
    remove: jest.fn().mockImplementation((entity: any) => Promise.resolve(entity)),
    softDelete: jest.fn().mockResolvedValue({ affected: 1 }),
    restore: jest.fn().mockResolvedValue({ affected: 1 }),
    count: jest.fn().mockResolvedValue(0),
    increment: jest.fn().mockResolvedValue({ affected: 1 }),
    decrement: jest.fn().mockResolvedValue({ affected: 1 }),
    merge: jest.fn().mockImplementation((_entity: any, dto: any) => dto),
    preload: jest.fn().mockImplementation((dto: any) => Promise.resolve(dto)),
    query: jest.fn().mockResolvedValue([]),
    createQueryBuilder: jest.fn().mockReturnValue(createQueryBuilderMock()),
    exist: jest.fn().mockResolvedValue(false),
    ...overrides,
  };
}

/**
 * 创建 mock ConfigService
 * @param overrides — 键值对覆盖，get(key) 返回 overrides[key] 或 undefined
 */
export function mockConfig(overrides: Record<string, any> = {}): Partial<ConfigService> {
  return {
    get: jest.fn((key: string, fallback?: any) => {
      if (key in overrides) return overrides[key];
      return fallback;
    }),
    getOrThrow: jest.fn((key: string) => {
      if (key in overrides) return overrides[key];
      throw new Error(`Configuration key "${key}" not found`);
    }),
  } as any;
}

/**
 * 创建 mock JwtService
 */
export function mockJwt(overrides: Record<string, any> = {}): Partial<JwtService> {
  return {
    sign: jest.fn().mockReturnValue('mock.jwt.token.abc123'),
    signAsync: jest.fn().mockResolvedValue('mock.jwt.token.abc123'),
    verify: jest.fn().mockReturnValue({ sub: 'user-1', openid: 'test-openid', role: 'teacher' }),
    verifyAsync: jest.fn().mockResolvedValue({ sub: 'user-1', openid: 'test-openid', role: 'teacher' }),
    decode: jest.fn().mockReturnValue({ sub: 'user-1' }),
    ...overrides,
  } as any;
}

/**
 * 创建 mock BullMQ Queue（用于知识库管道）
 */
export function mockQueue(overrides: Record<string, any> = {}): any {
  return {
    add: jest.fn().mockResolvedValue({ id: 'job-1' }),
    getJob: jest.fn().mockResolvedValue(null),
    getJobs: jest.fn().mockResolvedValue([]),
    pause: jest.fn().mockResolvedValue(undefined),
    resume: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

/**
 * 创建模拟 Express 请求对象 (用于 Guard 测试)
 */
export function mockRequest(overrides: Record<string, any> = {}): any {
  return {
    headers: {},
    user: null,
    ...overrides,
  };
}

/**
 * 创建模拟 ExecutionContext (用于 Guard/Interceptor 测试)
 */
export function mockExecutionContext(overrides: Record<string, any> = {}): any {
  const req = mockRequest(overrides.req);
  return {
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue(req),
      getResponse: jest.fn().mockReturnValue({
        statusCode: 200,
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      }),
      getNext: jest.fn(),
    }),
    getHandler: jest.fn().mockReturnValue(() => {}),
    getClass: jest.fn().mockReturnValue({}),
    ...overrides,
  };
}

/**
 * 创建模拟 Reflector (用于 RolesGuard 测试)
 */
export function mockReflector(overrides: Record<string, any> = {}): any {
  return {
    get: jest.fn().mockReturnValue(undefined),
    getAllAndOverride: jest.fn().mockReturnValue(undefined),
    getAllAndMerge: jest.fn().mockReturnValue([]),
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════
// 测试数据工厂 (Fixtures)
// ═══════════════════════════════════════════════════════════════

/** 创建测试 User 数据 */
export function createUser(overrides: Record<string, any> = {}) {
  return {
    id: 'user-1',
    openid: 'test-openid-abc',
    role: 'teacher' as const,
    nickname: '测试教师',
    avatarUrl: 'https://example.com/avatar.png',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-06-01'),
    ...overrides,
  };
}

/** 创建管理员 User */
export function createAdmin(overrides: Record<string, any> = {}) {
  return createUser({
    id: 'admin-1',
    openid: 'admin-openid',
    role: 'admin' as const,
    nickname: '管理员',
    ...overrides,
  });
}

/** 创建测试 Question 数据 */
export function createQuestion(overrides: Record<string, any> = {}) {
  return {
    id: 'q-1',
    type: 'single_choice',
    content: '1 + 1 = ?',
    options: ['A. 1', 'B. 2', 'C. 3', 'D. 4'],
    answer: 'B',
    analysis: '加法运算，1+1=2',
    difficulty: 1,
    subject: '数学',
    grade: '五年级',
    sourceFileId: 'file-1',
    status: 'approved',
    isDeleted: false,
    embedding: null,
    reviewedById: null,
    reviewedAt: null,
    createdAt: new Date('2026-06-01'),
    updatedAt: new Date('2026-06-01'),
    ...overrides,
  };
}

/**
 * 批量创建题目
 * @param count - 数量
 * @param template - 基础模板（函数，接收 index）
 */
export function createQuestions(
  count: number,
  template?: (i: number) => Record<string, any>,
): Record<string, any>[] {
  return Array.from({ length: count }, (_, i) => {
    const base = {
      id: `q-${i + 1}`,
      type: 'single_choice',
      content: `题目 ${i + 1}`,
      options: ['A. a', 'B. b', 'C. c', 'D. d'],
      answer: 'A',
      analysis: `解析 ${i + 1}`,
      difficulty: (i % 3) + 1 as 1 | 2 | 3,
      subject: '数学',
      grade: '五年级',
      status: 'approved',
      isDeleted: false,
      createdAt: new Date('2026-06-01'),
      updatedAt: new Date('2026-06-01'),
    };
    return template ? { ...base, ...template(i) } : base;
  });
}

/** 创建测试 Paper 数据 */
export function createPaper(overrides: Record<string, any> = {}) {
  return {
    id: 'paper-1',
    userId: 'user-1',
    title: '五年级数学综合练习卷',
    conditions: { subject: '数学', grade: '五年级', difficulty: 'mixed', questionCount: 5 },
    questionIds: ['q-1', 'q-2', 'q-3', 'q-4', 'q-5'],
    totalScore: 25,
    generateMs: 15000,
    status: 'draft',
    exportDocxUrl: null,
    exportPdfUrl: null,
    exportedAt: null,
    createdAt: new Date('2026-06-04'),
    updatedAt: new Date('2026-06-04'),
    ...overrides,
  };
}

/** 创建测试 PaperQuestionSnapshot 数据 */
export function createSnapshot(overrides: Record<string, any> = {}) {
  return {
    id: 'snap-1',
    paperId: 'paper-1',
    sortOrder: 1,
    questionId: 'q-1',
    snapshot: {
      type: 'single_choice',
      content: '1 + 1 = ?',
      options: ['A. 1', 'B. 2', 'C. 3', 'D. 4'],
      answer: 'B',
      analysis: '加法运算',
      difficulty: 1,
      score: 5,
    },
    ...overrides,
  };
}

/**
 * 批量创建快照
 * @param paperId - 试卷ID
 * @param count - 数量
 */
export function createSnapshots(paperId: string, count: number): Record<string, any>[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `snap-${i + 1}`,
    paperId,
    sortOrder: i + 1,
    questionId: `q-${i + 1}`,
    snapshot: {
      type: 'single_choice',
      content: `题目 ${i + 1}`,
      options: ['A', 'B', 'C', 'D'],
      answer: 'A',
      analysis: `解析 ${i + 1}`,
      difficulty: (i % 3) + 1,
      score: 5,
    },
  }));
}

/** 创建测试 Order 数据 */
export function createOrder(overrides: Record<string, any> = {}) {
  return {
    id: 'order-1',
    userId: 'user-1',
    paperId: 'paper-1',
    orderNo: 'ORD20260604001',
    amount: 500, // 5 元 (分)
    status: 'pending',
    paidAt: null,
    expiredAt: new Date(Date.now() + 30 * 60 * 1000), // 30分钟后过期
    createdAt: new Date('2026-06-04'),
    updatedAt: new Date('2026-06-04'),
    ...overrides,
  };
}

/** 创建测试 Payment 数据 */
export function createPayment(overrides: Record<string, any> = {}) {
  return {
    id: 'pay-1',
    orderId: 'order-1',
    wxTransactionId: null,
    wxOutTradeNo: 'OUT20260604001',
    amount: 500,
    status: 'created',
    callbackRaw: null,
    paidAt: null,
    createdAt: new Date('2026-06-04'),
    ...overrides,
  };
}

/** 创建测试 KbFile 数据 */
export function createKbFile(overrides: Record<string, any> = {}) {
  return {
    id: 'file-1',
    uploaderId: 'admin-1',
    filename: '五年级数学题库.md',
    fileType: 'md',
    fileSize: 10240,
    subject: '数学',
    grade: '五年级',
    cosUrl: 'https://cos.example.com/uploads/test.md',
    status: 'processing',
    questionCount: 0,
    errorMsg: null,
    createdAt: new Date('2026-06-04'),
    updatedAt: new Date('2026-06-04'),
    ...overrides,
  };
}

/** 创建测试 KnowledgePoint 数据 */
export function createKnowledgePoint(overrides: Record<string, any> = {}) {
  return {
    id: 'kp-1',
    name: '加法运算',
    subject: '数学',
    grade: '五年级',
    embedding: new Array(1536).fill(0).map(() => Math.random()),
    questionCount: 3,
    description: null,
    createdAt: new Date('2026-06-01'),
    updatedAt: new Date('2026-06-01'),
    ...overrides,
  };
}

/** 创建测试 QuestionKnowledge 关联数据 */
export function createQuestionKnowledge(overrides: Record<string, any> = {}) {
  return {
    id: 'qk-1',
    questionId: 'q-1',
    knowledgePointId: 'kp-1',
    confidence: 1.0,
    ...overrides,
  };
}

/** 创建测试 OcrTask 数据 */
export function createOcrTask(overrides: Record<string, any> = {}) {
  return {
    id: 'ocr-1',
    fileId: 'file-1',
    status: 'pending',
    resultText: null,
    pageCount: null,
    durationMs: null,
    errorMsg: null,
    createdAt: new Date('2026-06-04'),
    updatedAt: new Date('2026-06-04'),
    ...overrides,
  };
}

/** 创建测试 AuditLog 数据 */
export function createAuditLog(overrides: Record<string, any> = {}) {
  return {
    id: 'log-1',
    userId: 'admin-1',
    action: 'review',
    resource: 'question',
    resourceId: 'q-1',
    detail: { action: 'approve' },
    ip: '127.0.0.1',
    createdAt: new Date('2026-06-04'),
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════
// Mock HTTP 工具 (用于 LLM / 微信 API 的 axios mock)
// ═══════════════════════════════════════════════════════════════

/**
 * 创建模拟的 LLM API 响应（匹配阿里百炼格式）
 */
export function mockLLMResponse(content: string) {
  return {
    data: {
      choices: [
        {
          message: { role: 'assistant', content },
          finish_reason: 'stop',
        },
      ],
      usage: { total_tokens: 500 },
    },
  };
}

/**
 * 模拟成功生成试卷的 LLM 响应
 */
export function mockPaperGenerationResponse(questionCount: number = 5) {
  const questions = Array.from({ length: questionCount }, (_, i) => ({
    index: i + 1,
    type: 'single_choice',
    content: `生成的题目 ${i + 1}`,
    options: ['A. 选项A', 'B. 选项B', 'C. 选项C', 'D. 选项D'],
    answer: 'A',
    analysis: `这是题目 ${i + 1} 的解析`,
    difficulty: (i % 3) + 1,
    score: 5,
  }));

  return {
    title: '五年级数学综合练习卷',
    questions,
  };
}

/**
 * 创建模拟的快递 Multer File 对象
 */
export function createMockFile(overrides: Record<string, any> = {}): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname: 'test.md',
    encoding: '7bit',
    mimetype: 'text/markdown',
    buffer: Buffer.from('# 题目1\n1+1=?'),
    size: 20,
    stream: null as any,
    destination: '',
    filename: 'test.md',
    path: '/tmp/test.md',
    ...overrides,
  };
}
