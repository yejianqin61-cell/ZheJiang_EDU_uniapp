import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Question } from '../../../database/entities/question.entity';
import { User } from '../../../database/entities/user.entity';
import { KnowledgePoint } from '../../../database/entities/knowledge-point.entity';
import { QuestionKnowledge } from '../../../database/entities/question-knowledge.entity';
import { EmbeddingService } from '../../knowledge-base/services/embedding.service';

const SAMPLE_QUESTIONS = [
  {
    type: 'single_choice', subject: '数学', grade: '五年级', difficulty: 1,
    content: '下列分数中最大的是（ ）',
    options: ['A. 1/2', 'B. 2/3', 'C. 3/4', 'D. 5/6'],
    answer: 'D', analysis: '通分后比较：1/2=6/12, 2/3=8/12, 3/4=9/12, 5/6=10/12，最大为5/6。',
  },
  {
    type: 'single_choice', subject: '数学', grade: '五年级', difficulty: 1,
    content: '0.25化为分数是（ ）',
    options: ['A. 1/2', 'B. 1/3', 'C. 1/4', 'D. 1/5'],
    answer: 'C', analysis: '0.25 = 25/100 = 1/4。',
  },
  {
    type: 'fill_blank', subject: '数学', grade: '五年级', difficulty: 2,
    content: '一个三角形的底是6cm，高是4cm，它的面积是（ ）平方厘米。',
    options: [],
    answer: '12', analysis: '三角形面积 = 底 × 高 ÷ 2 = 6 × 4 ÷ 2 = 12。',
  },
  {
    type: 'single_choice', subject: '数学', grade: '五年级', difficulty: 2,
    content: '一个数除以0.01，等于这个数（ ）',
    options: ['A. 乘100', 'B. 除以100', 'C. 乘10', 'D. 除以10'],
    answer: 'A', analysis: '除以0.01相当于乘100，因为0.01 = 1/100。',
  },
  {
    type: 'short_answer', subject: '数学', grade: '五年级', difficulty: 3,
    content: '甲、乙两车同时从A、B两地相对开出，甲车每小时行60千米，乙车每小时行50千米，4小时后两车相遇。A、B两地相距多少千米？',
    options: [],
    answer: '440', analysis: '相遇问题：路程 = (速度和) × 时间 = (60+50) × 4 = 440千米。',
  },
  {
    type: 'single_choice', subject: '数学', grade: '五年级', difficulty: 1,
    content: '3.14 × 100 =（ ）',
    options: ['A. 3.14', 'B. 31.4', 'C. 314', 'D. 3140'],
    answer: 'C', analysis: '小数点向右移动两位：3.14 × 100 = 314。',
  },
  {
    type: 'fill_blank', subject: '数学', grade: '五年级', difficulty: 2,
    content: '把3米长的绳子平均分成5段，每段长（ ）米，每段占全长的（ ）。',
    options: [],
    answer: '0.6 或 3/5；1/5', analysis: '每段长 = 3÷5 = 0.6米 = 3/5米；每段占全长 = 1/5。',
  },
  {
    type: 'single_choice', subject: '数学', grade: '五年级', difficulty: 2,
    content: '一个正方体的棱长扩大到原来的3倍，它的体积扩大到原来的（ ）倍。',
    options: ['A. 3', 'B. 6', 'C. 9', 'D. 27'],
    answer: 'D', analysis: '正方体体积 = 棱长³，棱长×3 → 体积×3³ = 27。',
  },
  {
    type: 'true_false', subject: '数学', grade: '五年级', difficulty: 1,
    content: '所有的质数都是奇数。（ ）',
    options: [],
    answer: '错误', analysis: '2是质数但不是奇数。',
  },
  {
    type: 'short_answer', subject: '数学', grade: '五年级', difficulty: 3,
    content: '一个长方体水箱，从里面量长8分米，宽5分米，高6分米。这个水箱最多能装水多少升？',
    options: [],
    answer: '240', analysis: '体积 = 8×5×6 = 240立方分米 = 240升。',
  },
  // ── 五年级语文 ──
  {
    type: 'single_choice', subject: '语文', grade: '五年级', difficulty: 1,
    content: '"白璧无瑕"中"瑕"的意思是（ ）',
    options: ['A. 缺点', 'B. 斑点', 'C. 玉上的斑点', 'D. 污点'],
    answer: 'C', analysis: '"瑕"本义指玉上的斑点，比喻缺点或不足。"白璧无瑕"意为洁白的玉上没有斑点，形容完美无缺。',
  },
  {
    type: 'single_choice', subject: '语文', grade: '五年级', difficulty: 1,
    content: '下列词语中书写完全正确的是（ ）',
    options: ['A. 金壁辉煌', 'B. 金碧辉煌', 'C. 金璧辉煌', 'D. 金毕辉煌'],
    answer: 'B', analysis: '"金碧辉煌"形容建筑物等华丽精致、光彩夺目。"碧"指青绿色。',
  },
  {
    type: 'fill_blank', subject: '语文', grade: '五年级', difficulty: 2,
    content: '补充诗句：随风潜入夜，（ ）。——杜甫《春夜喜雨》',
    options: [],
    answer: '润物细无声', analysis: '出自杜甫《春夜喜雨》，全句描写春雨悄无声息地滋润万物。',
  },
  {
    type: 'true_false', subject: '语文', grade: '五年级', difficulty: 1,
    content: '"亡羊补牢"这个成语告诉我们要及时改正错误，防止损失扩大。（ ）',
    options: [],
    answer: '正确', analysis: '"亡羊补牢"出自《战国策》，意为丢失羊后修补羊圈，比喻受到损失后及时补救。',
  },
  {
    type: 'short_answer', subject: '语文', grade: '五年级', difficulty: 2,
    content: '请写出三个含有"马"字的成语，并任选一个解释其意思。',
    options: [],
    answer: '马到成功、一马当先、万马奔腾（等）。解释略。',
    analysis: '成语积累是五年级语文学习的重要内容，需要学生掌握常用成语及其寓意。',
  },
  {
    type: 'single_choice', subject: '语文', grade: '五年级', difficulty: 2,
    content: '下列句子中，没有语病的是（ ）',
    options: ['A. 他经常回忆过去的往事', 'B. 同学们都积极参加了体育比赛', 'C. 大约过了十分钟左右', 'D. 我断定他可能不会来'],
    answer: 'B', analysis: 'A"过去的"和"往"重复；C"大约"和"左右"重复；D"断定"和"可能"矛盾。',
  },
  {
    type: 'fill_blank', subject: '语文', grade: '五年级', difficulty: 2,
    content: '"桂林山水甲天下"中"甲"的意思是（ ）。这句话是说桂林的山水（ ）。',
    options: [],
    answer: '第一/居首位；天下第一/最美',
    analysis: '"甲"在这里是"居第一位"的意思，这句话赞美桂林山水天下最美。',
  },
  {
    type: 'single_choice', subject: '语文', grade: '五年级', difficulty: 3,
    content: '对下面这句话理解最准确的是："书籍是人类进步的阶梯。"——高尔基',
    options: ['A. 书籍可以当梯子使用', 'B. 读书能让人往高处走', 'C. 阅读书籍能促进人类文明不断发展', 'D. 高尔基喜欢爬楼梯'],
    answer: 'C', analysis: '高尔基用"阶梯"作比喻，形象地说明了读书对人类进步的重要作用。',
  },
  {
    type: 'short_answer', subject: '语文', grade: '五年级', difficulty: 3,
    content: '阅读下面这段话，回答问题。\n"春天来了，小草从土里钻出来，嫩嫩的，绿绿的。园子里，田野里，一大片一大片满是的。"\n这段话运用了什么修辞手法？有什么表达效果？',
    options: [],
    answer: '运用了拟人和反复的修辞手法。"钻"把小草人格化，生动形象地写出了小草的旺盛生命力；"嫩嫩的，绿绿的"反复强调，突出了小草的鲜嫩可爱。',
    analysis: '考查学生对修辞手法的识别和赏析能力，是五年级阅读理解的重点。',
  },
  // ── 三年级数学 ──
  {
    type: 'single_choice', subject: '数学', grade: '三年级', difficulty: 1,
    content: '56 ÷ 8 =（ ）',
    options: ['A. 6', 'B. 7', 'C. 8', 'D. 9'],
    answer: 'B', analysis: '根据乘法口诀：七八五十六，所以56÷8=7。',
  },
  {
    type: 'fill_blank', subject: '数学', grade: '三年级', difficulty: 1,
    content: '一个长方形的长是8厘米，宽是5厘米，它的周长是（ ）厘米。',
    options: [],
    answer: '26', analysis: '长方形周长 = (长+宽) × 2 = (8+5) × 2 = 26厘米。',
  },
  {
    type: 'single_choice', subject: '数学', grade: '三年级', difficulty: 2,
    content: '3时 =（ ）分',
    options: ['A. 30', 'B. 60', 'C. 120', 'D. 180'],
    answer: 'D', analysis: '1时=60分，3时=3×60=180分。',
  },
  {
    type: 'true_false', subject: '数学', grade: '三年级', difficulty: 1,
    content: '0乘任何数都得0。（ ）',
    options: [],
    answer: '正确', analysis: '0乘以任何数都等于0，这是乘法的基本性质。',
  },
  {
    type: 'short_answer', subject: '数学', grade: '三年级', difficulty: 2,
    content: '小明有48张邮票，小红的邮票是小明的3倍。小红有多少张邮票？两人一共有多少张？',
    options: [],
    answer: '小红144张；一共192张',
    analysis: '小红：48×3=144张；一共：48+144=192张。',
  },
];

// Knowledge points mapped to seed question indices (1-based)
const SEED_KP_MAP: Record<string, number[]> = {
  '分数比较': [1],        // Q1: 分数中最大的是
  '小数与分数': [2],      // Q2: 0.25化为分数
  '三角形面积': [3],      // Q3: 三角形面积
  '小数除法': [4],        // Q4: 除以0.01
  '相遇问题': [5],        // Q5: 两车相遇
  '小数乘法': [6],        // Q6: 3.14×100
  '分数除法': [7],        // Q7: 绳子平均分
  '正方体体积': [8],      // Q8: 正方体体积
  '质数与合数': [9],      // Q9: 质数都是奇数
  '体积与容积': [10],     // Q10: 长方体水箱
  // 五年级语文
  '字义辨析': [11],        // Q11: 白璧无瑕
  '字形书写': [12],        // Q12: 金碧辉煌
  '古诗积累': [13],        // Q13: 随风潜入夜
  '成语理解': [14],        // Q14: 亡羊补牢
  '成语积累': [15],        // Q15: 含"马"成语
  '病句辨析': [16],        // Q16: 没有语病的句子
  '词语理解': [17],        // Q17: 桂林山水甲天下
  '名言理解': [18],        // Q18: 书籍是人类进步的阶梯
  '修辞手法': [19],        // Q19: 春天来了
  // 三年级数学
  '表内除法': [20],        // Q20: 56÷8
  '长方形周长': [21],      // Q21: 周长计算
  '时间换算': [22],        // Q22: 3时=多少分
  '乘法性质': [23],        // Q23: 0乘任何数
  '倍数应用': [24],        // Q24: 邮票问题
};

@Injectable()
export class SeedService {
  constructor(
    @InjectRepository(Question)
    private readonly questionRepo: Repository<Question>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(KnowledgePoint)
    private readonly kpRepo: Repository<KnowledgePoint>,
    @InjectRepository(QuestionKnowledge)
    private readonly qkRepo: Repository<QuestionKnowledge>,
    private readonly embeddingService: EmbeddingService,
  ) {}

  async seed(): Promise<{ inserted: number; knowledgePoints: number }> {
    // Check if data already exists
    const count = await this.questionRepo.count({ where: { status: 'approved', isDeleted: false } });
    if (count >= 10) {
      return { inserted: 0, knowledgePoints: 0 };
    }

    // Step 1: Create questions
    const savedQuestions: Question[] = [];
    for (const q of SAMPLE_QUESTIONS) {
      let embedding: number[] | null = null;
      try {
        embedding = await this.embeddingService.embed(q.content);
      } catch { /* embedding API unavailable, use null */ }
      const saved = await this.questionRepo.save(
        this.questionRepo.create({
          ...q,
          answer: '',    // production: no answers in question bank
          analysis: '',  // production: no analysis in question bank
          embedding: embedding as any,
          status: 'approved',
          isDeleted: false,
        }),
      );
      savedQuestions.push(saved);
    }

    // Step 2: Create knowledge points + associations
    let kpCount = 0;
    for (const [kpName, questionIndices] of Object.entries(SEED_KP_MAP)) {
      let kp = await this.kpRepo.findOne({ where: { name: kpName, subject: '数学', grade: '五年级' } });
      if (!kp) {
        let kpEmbedding: number[] | null = null;
        try { kpEmbedding = await this.embeddingService.embed(kpName); } catch {}
        kp = await this.kpRepo.save(
          this.kpRepo.create({
            name: kpName,
            subject: '数学',
            grade: '五年级',
            embedding: kpEmbedding as any,
            questionCount: questionIndices.length,
          }),
        );
      }

      for (const idx of questionIndices) {
        const question = savedQuestions[idx - 1]; // 1-based to 0-based
        if (question) {
          await this.qkRepo.save(
            this.qkRepo.create({
              questionId: question.id,
              knowledgePointId: kp.id,
              confidence: 0.9,
            }),
          );
        }
      }
      kpCount++;
    }

    return {
      inserted: savedQuestions.length,
      knowledgePoints: kpCount,
    };
  }

  async setUserRole(userId: string, role: string): Promise<{ userId: string; role: string }> {
    if (!['admin', 'teacher'].includes(role)) {
      throw new BadRequestException({ code: 70001, message: '无效的角色，仅支持 admin 或 teacher' });
    }

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException({ code: 70002, message: '用户不存在' });
    }

    await this.userRepo.update(userId, { role: role as 'admin' | 'teacher' });
    return { userId, role };
  }
}
