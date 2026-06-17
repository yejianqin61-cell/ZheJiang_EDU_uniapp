import { Controller, Post, UseInterceptors, UploadedFile, UseGuards, BadRequestException } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { JwtAuthGuard } from '../../../common/guards/jwt.guard'
import { RolesGuard } from '../../../common/guards/roles.guard'
import { Roles } from '../../../common/decorators/roles.decorator'
import { v4 as uuid } from 'uuid'
import { extname, join } from 'path'
import { writeFileSync, existsSync, mkdirSync } from 'fs'

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const UPLOAD_DIR = join(process.cwd(), 'uploads', 'images')

@Controller('upload')
export class ImageUploadController {
  @Post('image')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException({ code: 60010, message: '请选择文件' })
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      throw new BadRequestException({ code: 60011, message: '仅支持 PNG / JPG / GIF / WebP 格式' })
    }
    if (file.size > MAX_SIZE) {
      throw new BadRequestException({ code: 60012, message: '图片大小不能超过 5MB' })
    }

    // Dev: 本地存储 → 生产: COS上传
    const cosUrl = process.env.COS_SECRET_ID
      ? await this.uploadToCos(file)
      : this.saveLocal(file)

    return { url: cosUrl }
  }

  private saveLocal(file: Express.Multer.File): string {
    if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true })
    const filename = `${uuid()}${extname(file.originalname)}`
    const filepath = join(UPLOAD_DIR, filename)
    writeFileSync(filepath, file.buffer)
    return `/uploads/images/${filename}`
  }

  private async uploadToCos(file: Express.Multer.File): Promise<string> {
    // TODO: 实际 COS SDK 上传
    return `/uploads/images/${uuid()}${extname(file.originalname)}`
  }
}
