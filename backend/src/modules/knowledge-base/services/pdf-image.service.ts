import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import FormData from 'form-data'
import axios from 'axios'

export interface ExtractedImage {
  pageNum: number; x: number; y: number; width: number; height: number
  ext: string; cosUrl: string
}

@Injectable()
export class PdfImageService {
  private exportUrl: string

  constructor(private config: ConfigService) {
    this.exportUrl = config.get<string>('EXPORT_SERVICE_URL') || 'http://localhost:5000'
  }

  async extractImages(fileBuffer: Buffer, filename = 'upload.pdf'): Promise<ExtractedImage[]> {
    try {
      const form = new FormData()
      form.append('file', fileBuffer, { filename })
      const res = await axios.post(`${this.exportUrl}/extract-images`, form, {
        headers: form.getHeaders(),
        timeout: 30000,
      })
      return res.data?.images ?? []
    } catch (err) {
      console.warn('[PdfImageService] 图片提取失败:', (err as Error).message)
      return []
    }
  }
}
