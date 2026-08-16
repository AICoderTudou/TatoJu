import { promises as fs } from 'node:fs'
import type {
  VideoProvider,
  VideoGenRequest,
  GenSubmitResult,
  GenPollResult,
  ImageInput
} from '@shared/types'
import { absPath } from '../../files/fileStore'

// Seedance 2.0（火山引擎 ARK）图生视频。异步任务：create → 轮询 get task。
// 端点已核实；role 字段(first_frame)为第三方指南所述，若官方以图序区分首/尾帧，按官方调整。
export class SeedanceProvider implements VideoProvider {
  readonly name = 'seedance'
  constructor(
    private apiKey: string,
    private model = 'doubao-seedance-2-0-260128',
    private baseUrl = 'https://ark.cn-beijing.volces.com/api/v3'
  ) {}

  async submit(req: VideoGenRequest): Promise<GenSubmitResult> {
    const content: unknown[] = [{ type: 'text', text: req.prompt }]
    content.push({
      type: 'image_url',
      image_url: { url: await toUrl(req.firstFrame) },
      role: 'first_frame'
    })
    for (const ref of req.refImages ?? []) {
      content.push({ type: 'image_url', image_url: { url: await toUrl(ref) }, role: 'reference_image' })
    }
    const res = await fetch(`${this.baseUrl}/contents/generations/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model: this.model,
        content,
        ratio: req.aspectRatio ?? '9:16',
        resolution: req.resolution ?? '720p',
        duration: req.durationSec ?? 5
      })
    })
    if (!res.ok) {
      const t = await res.text().catch(() => '')
      throw new Error(`Seedance 创建任务失败 ${res.status}: ${t.slice(0, 300)}`)
    }
    const data = (await res.json()) as any
    if (!data?.id) throw new Error(`Seedance 未返回任务 id: ${JSON.stringify(data).slice(0, 200)}`)
    return { externalTaskId: String(data.id) }
  }

  async poll(externalTaskId: string): Promise<GenPollResult> {
    const res = await fetch(`${this.baseUrl}/contents/generations/tasks/${externalTaskId}`, {
      headers: { Authorization: `Bearer ${this.apiKey}` }
    })
    if (!res.ok) {
      const t = await res.text().catch(() => '')
      return { status: 'failed', error: `Seedance 查询失败 ${res.status}: ${t.slice(0, 200)}` }
    }
    const data = (await res.json()) as any
    const st: string = data?.status ?? ''
    if (st === 'succeeded') {
      const url = data?.content?.video_url
      return url ? { status: 'success', outputUrls: [url] } : { status: 'failed', error: '无 video_url' }
    }
    if (st === 'failed' || st === 'expired') return { status: 'failed', error: data?.error?.message ?? st }
    if (st === 'cancelled') return { status: 'canceled' }
    if (st === 'queued') return { status: 'queued' }
    return { status: 'running' }
  }
}

async function toUrl(img: ImageInput): Promise<string> {
  if (img.url) return img.url
  if (img.base64) return img.base64.startsWith('data:') ? img.base64 : `data:image/png;base64,${img.base64}`
  if (img.path) {
    const buf = await fs.readFile(absPath(img.path))
    const ext = img.path.split('.').pop()?.toLowerCase() || 'png'
    const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'webp' ? 'image/webp' : 'image/png'
    return `data:${mime};base64,${buf.toString('base64')}`
  }
  throw new Error('首帧图为空')
}
