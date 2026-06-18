import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ExerciseCategory } from '../../database/entities/exercise-category.entity'
import { ExerciseLesson } from '../../database/entities/exercise-lesson.entity'
import { ExercisePaper } from '../../database/entities/exercise-paper.entity'
import { ExerciseDrawRecord } from '../../database/entities/exercise-draw-record.entity'

@Injectable()
export class ExerciseService {
  constructor(
    @InjectRepository(ExerciseCategory) private catRepo: Repository<ExerciseCategory>,
    @InjectRepository(ExerciseLesson) private lessonRepo: Repository<ExerciseLesson>,
    @InjectRepository(ExercisePaper) private paperRepo: Repository<ExercisePaper>,
    @InjectRepository(ExerciseDrawRecord) private drawRepo: Repository<ExerciseDrawRecord>,
  ) {}

  // ==================== Category CRUD ====================

  async listCategories(type?: string, grade?: string, subject?: string) {
    const where: any = {}
    if (type) where.type = type
    if (grade) where.grade = grade
    if (subject) where.subject = subject
    return this.catRepo.find({ where, order: { sortOrder: 'ASC', createdAt: 'ASC' } })
  }

  async createCategory(dto: { type: string; grade: string; subject: string; name: string; term?: string; examType?: string; createdBy?: string }) {
    return this.catRepo.save(this.catRepo.create(dto))
  }

  async updateCategory(id: string, dto: Partial<{ name: string; term: string; examType: string; sortOrder: number }>) {
    const cat = await this.catRepo.findOne({ where: { id } })
    if (!cat) throw new NotFoundException('类目不存在')
    Object.assign(cat, dto)
    return this.catRepo.save(cat)
  }

  async deleteCategory(id: string) {
    const cat = await this.catRepo.findOne({ where: { id } })
    if (!cat) throw new NotFoundException('类目不存在')
    // 级联删除：课时 + 试卷（CASCADE 已设置）
    await this.catRepo.delete(id)
  }

  // ==================== Lesson CRUD ====================

  async listLessons(unitId: string) {
    return this.lessonRepo.find({ where: { unitId }, order: { sortOrder: 'ASC', createdAt: 'ASC' } })
  }

  async createLesson(dto: { unitId: string; name: string; createdBy?: string }) {
    // 校验 unitId 必须存在且 type='unit'
    const unit = await this.catRepo.findOne({ where: { id: dto.unitId, type: 'unit' } })
    if (!unit) throw new BadRequestException('课时必须归属于已有单元')
    return this.lessonRepo.save(this.lessonRepo.create(dto))
  }

  async updateLesson(id: string, dto: Partial<{ name: string; sortOrder: number }>) {
    const lesson = await this.lessonRepo.findOne({ where: { id } })
    if (!lesson) throw new NotFoundException('课时不存在')
    Object.assign(lesson, dto)
    return this.lessonRepo.save(lesson)
  }

  async deleteLesson(id: string) {
    const lesson = await this.lessonRepo.findOne({ where: { id } })
    if (!lesson) throw new NotFoundException('课时不存在')
    await this.lessonRepo.delete(id)
  }

  // ==================== Paper CRUD ====================

  async createPaper(dto: { categoryId?: string; lessonId?: string; title: string; fileUrl: string; fileType: string; fileSize?: number; thumbnailUrl?: string; createdBy?: string }) {
    return this.paperRepo.save(this.paperRepo.create(dto))
  }

  async updatePaperThumbnail(id: string, thumbnailUrl: string) {
    await this.paperRepo.update(id, { thumbnailUrl });
  }

  async deletePaper(id: string) {
    const paper = await this.paperRepo.findOne({ where: { id } })
    if (!paper) throw new NotFoundException('试卷不存在')
    await this.paperRepo.delete(id)
  }

  async listPapers(categoryId?: string, lessonId?: string) {
    const where: any = {}
    if (categoryId) where.categoryId = categoryId
    if (lessonId) where.lessonId = lessonId
    return this.paperRepo.find({ where, order: { createdAt: 'DESC' } })
  }

  async getPaper(id: string) {
    const paper = await this.paperRepo.findOne({ where: { id } })
    if (!paper) throw new NotFoundException('试卷不存在')
    return paper
  }

  // ==================== Draw (Random Pick) ====================

  async draw(userId: string, nodeType: 'category' | 'lesson', nodeId: string) {
    // 检查是否已抽取过
    const existing = await this.drawRepo.findOne({ where: { userId, nodeType, nodeId } })
    if (existing) {
      return this.getPaper(existing.paperId)
    }

    // 随机抽取
    const where = nodeType === 'lesson' ? { lessonId: nodeId } : { categoryId: nodeId }
    const papers = await this.paperRepo.find({ where, select: ['id'] })
    if (papers.length === 0) throw new NotFoundException('该类目下暂无试卷')

    const paper = papers[Math.floor(Math.random() * papers.length)]

    // 记录抽取
    await this.drawRepo.save(this.drawRepo.create({ userId, nodeType, nodeId, paperId: paper.id }))

    return this.getPaper(paper.id)
  }
}
