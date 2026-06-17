import { Injectable } from '@nestjs/common'

export interface ExtractedImage {
  pageNum: number; name: string; data: Buffer; width: number; height: number; yRatio: number
}

@Injectable()
export class ImageExtractorService {
  /**
   * 从 PDF Buffer 中提取嵌入图片
   * pdfjs-dist 是 ESM 模块，使用动态 import 避免 CJS 兼容问题
   */
  async extractImages(fileBuffer: Buffer): Promise<ExtractedImage[]> {
    const images: ExtractedImage[] = []
    try {
      // 动态 import ESM 模块（仅在实际调用时加载）
      const pdfjsLib = await Function('return import("pdfjs-dist")')() as any
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(fileBuffer) })
      const pdf = await loadingTask.promise

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum)
        const opList = await page.getOperatorList()
        for (let i = 0; i < opList.fnArray.length; i++) {
          const fn = opList.fnArray[i]
          if (fn === pdfjsLib.OPS.paintImageXObject || fn === pdfjsLib.OPS.paintInlineImageXObject || fn === pdfjsLib.OPS.paintImageMaskXObject) {
            const imgName = opList.argsArray[i]?.[0]
            if (typeof imgName === 'string') {
              try {
                const imgData = await page.objs.get(imgName)
                if (imgData?.data) {
                  images.push({ pageNum, name: imgName, data: Buffer.from(imgData.data), width: imgData.width || 0, height: imgData.height || 0, yRatio: 0.5 })
                }
              } catch { /* 跳过无法提取的内嵌图片 */ }
            }
          }
        }
      }
    } catch (err) {
      console.warn('[ImageExtractor] 图片提取失败（PDF无图片或不支持）:', (err as Error).message)
    }
    return images
  }
}
