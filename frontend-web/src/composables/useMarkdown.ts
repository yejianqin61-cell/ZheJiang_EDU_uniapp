import MarkdownIt from 'markdown-it'

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
})

/** 渲染 Markdown 文本为 HTML，支持 ![图片](url) */
export function renderMarkdown(text: string | null | undefined): string {
  if (!text) return ''
  return md.render(text)
}
