import { promises as fs } from 'node:fs'
import type { LLMProvider, LLMChatRequest, LLMChatResult, ImageInput } from '@shared/types'
import { absPath } from '../../files/fileStore'

const BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1'

// Qwen3-VL（阿里百炼 / DashScope OpenAI 兼容端点）。多模态：图片走 image_url content part。
export class QwenLLMProvider implements LLMProvider {
  readonly name = 'qwen'
  constructor(
    private apiKey: string,
    private model = 'qwen3-vl-plus'
  ) {}

  async chat(req: LLMChatRequest): Promise<LLMChatResult> {
    const messages: unknown[] = []
    if (req.system) messages.push({ role: 'system', content: req.system })
    for (const m of req.messages) {
      const content: unknown[] = []
      if (m.text) content.push({ type: 'text', text: m.text })
      for (const img of m.images ?? []) {
        content.push({ type: 'image_url', image_url: { url: await toDataUrl(img) } })
      }
      messages.push({ role: m.role, content: content.length === 1 && m.text ? m.text : content })
    }

    const streaming = !!(req.stream && req.onChunk)
    const body: Record<string, unknown> = {
      model: req.model || this.model,
      messages,
      temperature: req.temperature ?? 0.7,
      stream: streaming
    }
    if (streaming) body.stream_options = { include_usage: true }
    if (req.maxTokens) body.max_tokens = req.maxTokens
    if (req.json) body.response_format = { type: 'json_object' }

    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(body)
    })
    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      throw new Error(`Qwen 调用失败 ${res.status}: ${errText.slice(0, 500)}`)
    }

    let text = ''
    let usage: { in: number; out: number } | undefined
    if (streaming) {
      const r = await this.readStream(res, req.onChunk!)
      text = r.text
      usage = r.usage
    } else {
      const data = (await res.json()) as any
      text = data?.choices?.[0]?.message?.content ?? ''
      usage = data?.usage
        ? { in: data.usage.prompt_tokens ?? 0, out: data.usage.completion_tokens ?? 0 }
        : undefined
    }

    let json: unknown
    if (req.json) {
      try {
        json = JSON.parse(stripFence(text))
      } catch {
        json = undefined
      }
    }
    return { text, json, usage }
  }

  // 解析 SSE 流，累计 content，并通过 onChunk 回传累计全文
  private async readStream(
    res: Response,
    onChunk: (full: string) => void
  ): Promise<{ text: string; usage?: { in: number; out: number } }> {
    const reader = (res.body as any)?.getReader?.()
    if (!reader) {
      // 兜底：非流式读取
      const data = (await res.json()) as any
      const t = data?.choices?.[0]?.message?.content ?? ''
      onChunk(t)
      return { text: t }
    }
    const decoder = new TextDecoder('utf-8')
    let buffer = ''
    let full = ''
    let usage: { in: number; out: number } | undefined
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? '' // 末行可能不完整，留到下次
      for (const line of lines) {
        const s = line.trim()
        if (!s.startsWith('data:')) continue
        const payload = s.slice(5).trim()
        if (payload === '[DONE]') continue
        try {
          const j = JSON.parse(payload)
          const delta: string = j?.choices?.[0]?.delta?.content ?? ''
          if (delta) {
            full += delta
            onChunk(full)
          }
          if (j?.usage) usage = { in: j.usage.prompt_tokens ?? 0, out: j.usage.completion_tokens ?? 0 }
        } catch {
          /* 忽略心跳/非 JSON 行 */
        }
      }
    }
    return { text: full, usage }
  }
}

function stripFence(s: string): string {
  const m = s.match(/```(?:json)?\s*([\s\S]*?)```/)
  return (m ? m[1] : s).trim()
}

async function toDataUrl(img: ImageInput): Promise<string> {
  if (img.url) return img.url
  if (img.base64) return img.base64.startsWith('data:') ? img.base64 : `data:image/png;base64,${img.base64}`
  if (img.path) {
    const buf = await fs.readFile(absPath(img.path))
    const ext = img.path.split('.').pop()?.toLowerCase() || 'png'
    const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'webp' ? 'image/webp' : 'image/png'
    return `data:${mime};base64,${buf.toString('base64')}`
  }
  throw new Error('ImageInput 为空')
}
