import { Injectable } from '@nestjs/common'
import type { ExtractedImage } from './pdf-image.service'

export interface ImageMatchResult {
  /** 题目中包含的图片 */
  matched: { url: string; caption: string; pageNum: number; autoMatched: boolean }[]
  /** 该题所在页的未匹配图片（可供管理员手动分配） */
  unmatched: { url: string; name: string; pageNum: number }[]
}

@Injectable()
export class ImageMatcherService {
  /**
   * 将提取的图片匹配到切分好的题目中
   *
   * @param questions   AI 切题结果 [{ content, pageNum, yStart?, yEnd? }]
   * @param images      提取到的图片 [{ pageNum, yRatio, cosUrl }]
   * @param contentHint 题目内容中是否提到"如图"
   */
  matchImagesToQuestion(
    question: { content: string; pageNum?: number; yStart?: number; yEnd?: number },
    allImages: (ExtractedImage & { cosUrl: string })[],
  ): ImageMatchResult {
    const pageNum = question.pageNum ?? 1
    const hasFigureRef = /如图|如图所示|如下图|见下图|示意图/.test(question.content)

    // 同页图片
    const pageImages = allImages.filter((img) => img.pageNum === pageNum)

    const matched: ImageMatchResult['matched'] = []
    const unmatched: ImageMatchResult['unmatched'] = []

    for (const img of pageImages) {
      // 同页题目+图片，默认匹配
      // 精确坐标匹配需要 AI 切题返回 y 坐标（splitter 暂未返回）
      const figureHint = hasFigureRef && pageImages.length === 1

      if (figureHint || pageImages.length === 1) {
        matched.push({
          url: img.cosUrl,
          caption: '',
          pageNum: img.pageNum,
          autoMatched: true,
        })
      } else {
        unmatched.push({
          url: img.cosUrl,
          name: img.cosUrl,
          pageNum: img.pageNum,
        })
      }
    }

    return { matched, unmatched }
  }
}
