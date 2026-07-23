import MarkdownIt from 'markdown-it'

/** 更新日志使用的 Markdown 渲染器, 禁止原始 HTML 以避免内容注入. */
const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
})

/** 将 Markdown 文本渲染为 HTML 字符串. */
export function renderMarkdown (text: string): string {
  return md.render(text ?? '')
}
