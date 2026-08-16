import { promises as fs } from 'node:fs'
import { basename } from 'node:path'
import type {
  ImageProvider,
  ImageGenRequest,
  GenSubmitResult,
  GenPollResult,
  ImageInput
} from '@shared/types'
import { absPath } from '../../files/fileStore'
import { id } from '../../util/id'

// gpt-image-2（OpenAI）。同步返回 base64（无 URL、无外部 task），故 submit 直接调用、poll 立即返回缓存结果。
// 有参考图走 /v1/images/edits（image[] 最多 16 张）；否则 /v1/images/generations。
export class GptImageProvider implements ImageProvider {
  readonly name = 'gptimage'
  private store = new Map<string, { urls?: string[]; error?: string }>()
  constructor(
    private apiKey: string,
    private model = 'gpt-image-2',
    private baseUrl = 'https://api.openai.com/v1'
  ) {}

  async submit(req: ImageGenRequest): Promise<GenSubmitResult> {
    const taskId = id('gptimg')
    try {
      const urls = (req.refImages?.length ?? 0) > 0 ? await this.edits(req) : await this.generations(req)
      this.store.set(taskId, { urls })
    } catch (e) {
      this.store.set(taskId, { error: (e as Error).message })
    }
    return { externalTaskId: taskId }
  }

  async poll(externalTaskId: string): Promise<GenPollResult> {
    const r = this.store.get(externalTaskId)
    if (!r) return { status: 'failed', error: 'gpt-image 任务不存在' }
    if (r.error) return { status: 'failed', error: r.error }
    return { status: 'success', outputUrls: r.urls, progress: 100 }
  }

  private async generations(req: ImageGenRequest): Promise<string[]> {
    const res = await fetch(`${this.baseUrl}/images/generations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model: this.model,
        prompt: req.prompt,
        size: req.size ?? '1024x1536',
        n: req.n ?? 1
      })
    })
    return this.parse(res)
  }

  private async edits(req: ImageGenRequest): Promise<string[]> {
    const form = new FormData()
    form.append('model', this.model)
    form.append('prompt', req.prompt)
    form.append('size', req.size ?? '1024x1536')
    form.append('n', String(req.n ?? 1))
    for (const ref of req.refImages ?? []) {
      const { buf, name } = await toBuffer(ref)
      form.append('image[]', new Blob([new Uint8Array(buf)]), name)
    }
    const res = await fetch(`${this.baseUrl}/images/edits`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}` },
      body: form
    })
    return this.parse(res)
  }

  private async parse(res: Response): Promise<string[]> {
    if (!res.ok) {
      const t = await res.text().catch(() => '')
      throw new Error(`gpt-image 调用失败 ${res.status}: ${t.slice(0, 300)}`)
    }
    const data = (await res.json()) as any
    return (data?.data ?? [])
      .map((d: any) => (d.b64_json ? `data:image/png;base64,${d.b64_json}` : d.url))
      .filter(Boolean)
  }
}

async function toBuffer(img: ImageInput): Promise<{ buf: Buffer; name: string }> {
  if (img.path) return { buf: await fs.readFile(absPath(img.path)), name: basename(img.path) }
  if (img.base64) {
    const b64 = img.base64.replace(/^data:.*;base64,/, '')
    return { buf: Buffer.from(b64, 'base64'), name: 'ref.png' }
  }
  if (img.url) {
    const r = await fetch(img.url)
    return { buf: Buffer.from(await r.arrayBuffer()), name: 'ref.png' }
  }
  throw new Error('参考图为空')
}
