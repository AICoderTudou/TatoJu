import { promises as fs } from 'node:fs'
import { basename } from 'node:path'
import type {
  ImageProvider,
  ImageGenRequest,
  GenSubmitResult,
  GenPollResult,
  GenStatus,
  ImageInput
} from '@shared/types'
import { absPath } from '../../files/fileStore'
import { log } from '../../util/log'

// RunningHub（云端 ComfyUI 工作流）。apiKey 走 JSON body；流程：upload → create → outputs 轮询。
// 节点映射依赖具体 workflow，调用方通过 nodeOverrides 注入 prompt / 参考图。
export class RunningHubProvider implements ImageProvider {
  readonly name = 'runninghub'
  constructor(
    private apiKey: string,
    private defaultWorkflowId: string,
    private host = 'https://www.runninghub.cn'
  ) {}

  private async post(path: string, body: Record<string, unknown>): Promise<any> {
    const res = await fetch(`${this.host}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: this.apiKey, ...body })
    })
    const data = await res.json().catch(() => ({}))
    return data
  }

  private async uploadImage(img: ImageInput): Promise<string> {
    let buf: Buffer
    let name = 'ref.png'
    if (img.path) {
      buf = await fs.readFile(absPath(img.path))
      name = basename(img.path)
    } else if (img.base64) {
      const b64 = img.base64.replace(/^data:.*;base64,/, '')
      buf = Buffer.from(b64, 'base64')
    } else if (img.url) {
      const r = await fetch(img.url)
      buf = Buffer.from(await r.arrayBuffer())
    } else {
      throw new Error('参考图为空')
    }
    const form = new FormData()
    form.append('apiKey', this.apiKey)
    form.append('file', new Blob([new Uint8Array(buf)]), name)
    const res = await fetch(`${this.host}/task/openapi/upload`, { method: 'POST', body: form })
    const data = await res.json().catch(() => ({}))
    if (data?.code !== 0) throw new Error(`RunningHub 上传失败: ${data?.msg ?? res.status}`)
    // 返回上传后的文件名/标识，供 nodeOverrides 引用
    return data?.data?.fileName ?? data?.data?.fileId ?? data?.data
  }

  async submit(req: ImageGenRequest): Promise<GenSubmitResult> {
    const workflowId = req.workflowId || this.defaultWorkflowId
    if (!workflowId) {
      throw new Error('未配置 RunningHub workflowId（请在设置中填写，或在请求中指定）')
    }
    // 上传参考图（如有），把上传标识塞进 nodeOverrides 由调用方约定的节点接收
    const uploaded: string[] = []
    for (const ref of req.refImages ?? []) {
      try {
        uploaded.push(await this.uploadImage(ref))
      } catch (e) {
        log.warn('RunningHub 参考图上传失败（忽略继续）', e)
      }
    }
    const nodeInfoList = (req.nodeOverrides ?? []).map((n) => ({
      nodeId: n.nodeId,
      fieldName: n.fieldName,
      fieldValue: n.fieldValue
    }))
    const data = await this.post('/task/openapi/create', {
      workflowId,
      nodeInfoList
    })
    if (data?.code !== 0 || !data?.data?.taskId) {
      throw new Error(`RunningHub 创建任务失败: ${data?.msg ?? JSON.stringify(data).slice(0, 200)}`)
    }
    return { externalTaskId: String(data.data.taskId) }
  }

  async poll(externalTaskId: string): Promise<GenPollResult> {
    const data = await this.post('/task/openapi/outputs', { taskId: externalTaskId })
    const msg: string = data?.msg ?? ''
    if (msg.includes('QUEUED')) return { status: 'queued' }
    if (msg.includes('RUNNING')) return { status: 'running' }
    if (data?.code === 0 && Array.isArray(data?.data)) {
      const urls = data.data.map((o: any) => o.fileUrl ?? o.url ?? o.fileName).filter(Boolean)
      return { status: 'success' as GenStatus, outputUrls: urls }
    }
    if (data?.code !== 0) return { status: 'failed', error: data?.msg ?? '未知错误' }
    return { status: 'running' }
  }
}
