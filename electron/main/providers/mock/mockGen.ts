import type {
  ImageProvider,
  VideoProvider,
  ImageGenRequest,
  VideoGenRequest,
  GenSubmitResult,
  GenPollResult
} from '@shared/types'
import { id } from '../../util/id'

function svgDataUrl(label: string, sub: string, color: string): string {
  const esc = (s: string): string =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').slice(0, 40)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="540" height="960" viewBox="0 0 540 960">
  <rect width="540" height="960" fill="#13110E"/>
  <rect x="20" y="20" width="500" height="920" fill="none" stroke="${color}" stroke-width="3"/>
  <text x="270" y="460" fill="${color}" font-size="40" text-anchor="middle" font-family="sans-serif">${esc(label)}</text>
  <text x="270" y="520" fill="#A39A88" font-size="22" text-anchor="middle" font-family="sans-serif">${esc(sub)}</text>
  <text x="270" y="900" fill="#6E665A" font-size="18" text-anchor="middle" font-family="monospace">MOCK PLACEHOLDER</text>
</svg>`
  return 'data:image/svg+xml;base64,' + Buffer.from(svg, 'utf8').toString('base64')
}

// Mock 图像 provider：不打 API，立即产出占位 SVG（走完整落盘链路）
export class MockImageProvider implements ImageProvider {
  readonly name = 'mock-image'
  private store = new Map<string, string>()

  async submit(req: ImageGenRequest): Promise<GenSubmitResult> {
    const taskId = id('mockimg')
    this.store.set(taskId, svgDataUrl('IMAGE', (req.prompt || '').slice(0, 20), '#F2873D'))
    return { externalTaskId: taskId }
  }
  async poll(externalTaskId: string): Promise<GenPollResult> {
    const url = this.store.get(externalTaskId)
    if (!url) return { status: 'failed', error: 'mock 任务不存在' }
    return { status: 'success', outputUrls: [url], progress: 100 }
  }
}

// Mock 视频 provider：产出占位 SVG（自测不消耗真实视频额度）
export class MockVideoProvider implements VideoProvider {
  readonly name = 'mock-video'
  private store = new Map<string, string>()

  async submit(req: VideoGenRequest): Promise<GenSubmitResult> {
    const taskId = id('mockvid')
    this.store.set(taskId, svgDataUrl('VIDEO', (req.prompt || '').slice(0, 20), '#37B6AB'))
    return { externalTaskId: taskId }
  }
  async poll(externalTaskId: string): Promise<GenPollResult> {
    const url = this.store.get(externalTaskId)
    if (!url) return { status: 'failed', error: 'mock 任务不存在' }
    return { status: 'success', outputUrls: [url], progress: 100 }
  }
}
