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

// ===== RunningHub AI-App 公共客户端（gpt-image-2 文生图）=====
// 实测链路：run(拿 taskId) → status 轮询(RUNNING→SUCCESS) → outputs(取 fileUrl)。
// 风格封面生成 与 资源/分镜文生图 共用本模块。
const HOST = 'https://www.runninghub.cn'
// gpt-image-2 文生图工作流（封面与资源/分镜文生图共用）。node8=提示词, node6=RunningHub apiKey, node3=比例/分辨率
export const GPT_IMAGE_WORKFLOW = '2046583008232214530'
// gpt-image-2 图生图（Edit）工作流：带参考图，保证角色/场景一致性。
// 节点映射（见工作流 api.json）：node5=提示词(String.inStr)，node8~13=参考图1~6(LoadImage.image)，node6=画幅/分辨率
export const GPT_IMAGE_EDIT_WORKFLOW = '2047357564257574914'
const EDIT_IMAGE_NODE_IDS = ['8', '9', '10', '11', '12', '13'] as const

export interface RhNodeInfo {
  nodeId: string
  fieldName: string
  fieldValue: string
}

async function rhPost(path: string, apiKey: string, body: Record<string, unknown>): Promise<any> {
  const res = await fetch(`${HOST}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body)
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`RunningHub ${path} HTTP ${res.status}`)
  return data
}

/** 提交 AI-App 任务，返回 taskId */
export async function rhRun(
  apiKey: string,
  workflowId: string,
  nodeInfoList: RhNodeInfo[]
): Promise<string> {
  const data = await rhPost('/task/openapi/create', apiKey, { apiKey, workflowId, nodeInfoList })
  const taskId = data?.data?.taskId ?? data?.taskId
  if (data?.code !== 0 || !taskId) {
    throw new Error(`RunningHub 提交失败: ${data?.msg ?? JSON.stringify(data).slice(0, 200)}`)
  }
  return String(taskId)
}

/** 查询任务状态：SUCCESS / RUNNING / QUEUED / FAILED ... */
export async function rhStatus(apiKey: string, taskId: string): Promise<string> {
  const data = await rhPost('/task/openapi/status', apiKey, { taskId, apiKey })
  return String(data?.data ?? 'UNKNOWN')
}

/** 取任务产物 fileUrl 列表 */
export async function rhOutputs(apiKey: string, taskId: string): Promise<string[]> {
  const data = await rhPost('/task/openapi/outputs', apiKey, { taskId, apiKey })
  if (!Array.isArray(data?.data)) return []
  return data.data.map((o: any) => o.fileUrl ?? o.url).filter(Boolean)
}

/** 文生图节点映射（webapp 2047...）：8=提示词 3=比例/分辨率 6=inStr */
export function buildImageNodes(
  prompt: string,
  apiKey: string,
  aspectRatio = '9:16',
  resolution = '1k'
): RhNodeInfo[] {
  return [
    { nodeId: '8', fieldName: 'text', fieldValue: prompt },
    { nodeId: '6', fieldName: 'inStr', fieldValue: apiKey },
    { nodeId: '3', fieldName: 'aspectRatio', fieldValue: aspectRatio },
    { nodeId: '3', fieldName: 'resolution', fieldValue: resolution }
  ]
}

/** 图生图(Edit)节点映射：3=apiKey 5=提示词 6=比例/分辨率 8~13=参考图(已上传得到的文件名) */
export function buildEditImageNodes(
  prompt: string,
  apiKey: string,
  uploadedRefs: string[],
  aspectRatio = '9:16',
  resolution = '1k'
): RhNodeInfo[] {
  const nodes: RhNodeInfo[] = [
    // 节点3(String "apikey") → 喂给节点2 RHSettingsNode 的 apiKey；缺它会报
    // "Settings: both base_url and apiKey are required"
    { nodeId: '3', fieldName: 'inStr', fieldValue: apiKey },
    { nodeId: '5', fieldName: 'inStr', fieldValue: prompt },
    { nodeId: '6', fieldName: 'aspectRatio', fieldValue: aspectRatio },
    { nodeId: '6', fieldName: 'resolution', fieldValue: resolution }
  ]
  // 最多 6 张参考图，按 image1~image6 顺序填入对应 LoadImage 节点
  uploadedRefs.slice(0, EDIT_IMAGE_NODE_IDS.length).forEach((fileName, i) => {
    nodes.push({ nodeId: EDIT_IMAGE_NODE_IDS[i], fieldName: 'image', fieldValue: fileName })
  })
  return nodes
}

/** 上传一张参考图到 RunningHub，返回其文件名（供 LoadImage 节点引用） */
export async function rhUploadImage(apiKey: string, img: ImageInput): Promise<string> {
  let buf: Buffer
  let name = 'ref.png'
  if (img.path) {
    buf = await fs.readFile(absPath(img.path))
    name = basename(img.path)
  } else if (img.base64) {
    buf = Buffer.from(img.base64.replace(/^data:.*;base64,/, ''), 'base64')
  } else if (img.url) {
    const r = await fetch(img.url)
    buf = Buffer.from(await r.arrayBuffer())
  } else {
    throw new Error('参考图为空')
  }
  const form = new FormData()
  form.append('apiKey', apiKey)
  form.append('file', new Blob([new Uint8Array(buf)]), name)
  const res = await fetch(`${HOST}/task/openapi/upload`, { method: 'POST', body: form })
  const data = await res.json().catch(() => ({}))
  if (data?.code !== 0) throw new Error(`RunningHub 上传参考图失败: ${data?.msg ?? res.status}`)
  return data?.data?.fileName ?? data?.data?.fileId ?? data?.data
}

/** 一站式文生图：run → 轮询 → 返回图片 URL（供封面生成等非 TaskRunner 路径直接调用） */
export async function rhGenerateImage(
  apiKey: string,
  opts: { prompt: string; aspectRatio?: string; resolution?: string; webappId?: string; timeoutMs?: number }
): Promise<string[]> {
  const taskId = await rhRun(
    apiKey,
    opts.webappId ?? GPT_IMAGE_WORKFLOW,
    buildImageNodes(opts.prompt, apiKey, opts.aspectRatio ?? '9:16', opts.resolution ?? '1k')
  )
  const start = Date.now()
  const timeout = opts.timeoutMs ?? 5 * 60 * 1000
  let interval = 3000
  // 轮询 outputs：未完成返回空，完成返回 fileUrl[]（实测可靠，不依赖 status）
  for (;;) {
    await new Promise((r) => setTimeout(r, interval))
    const urls = await rhOutputs(apiKey, taskId)
    if (urls.length) return urls
    if (Date.now() - start > timeout) throw new Error('RunningHub 生成超时')
    interval = Math.min(Math.round(interval * 1.3), 10000)
  }
}

// ===== 接入 ImageProvider（资源/分镜文生图走 TaskRunner）=====
export class RunningHubAiAppProvider implements ImageProvider {
  readonly name = 'runninghub'
  constructor(
    private apiKey: string,
    private webappId = GPT_IMAGE_WORKFLOW,
    private editWorkflowId = GPT_IMAGE_EDIT_WORKFLOW
  ) {}

  async submit(req: ImageGenRequest): Promise<GenSubmitResult> {
    // 优先用请求里的画幅比例（项目设置）；缺省时再从 size 反推，最后回退 9:16
    let ar = req.aspectRatio
    if (!ar) {
      ar = '9:16'
      if (req.size && /^(\d+)x(\d+)$/.test(req.size)) {
        const [w, h] = req.size.split('x').map(Number)
        ar = w > h ? '16:9' : w === h ? '1:1' : '9:16'
      }
    }
    // 有参考图 → 走图生图(Edit)工作流，上传参考图保证角色/场景一致性；否则走纯文生图
    const refs = req.refImages ?? []
    if (refs.length) {
      const uploaded: string[] = []
      for (const ref of refs.slice(0, EDIT_IMAGE_NODE_IDS.length)) {
        try {
          uploaded.push(await rhUploadImage(this.apiKey, ref))
        } catch (e) {
          log.warn('RunningHub 参考图上传失败（忽略该张继续）', e)
        }
      }
      if (uploaded.length) {
        const taskId = await rhRun(
          this.apiKey,
          this.editWorkflowId,
          buildEditImageNodes(req.prompt, this.apiKey, uploaded, ar, '1k')
        )
        return { externalTaskId: taskId }
      }
      // 全部上传失败则降级为文生图，至少不阻断出图
      log.warn('RunningHub 参考图全部上传失败，降级为纯文生图')
    }
    const taskId = await rhRun(this.apiKey, this.webappId, buildImageNodes(req.prompt, this.apiKey, ar, '1k'))
    return { externalTaskId: taskId }
  }

  async poll(externalTaskId: string): Promise<GenPollResult> {
    try {
      const urls = await rhOutputs(this.apiKey, externalTaskId)
      if (urls.length) return { status: 'success' as GenStatus, outputUrls: urls }
      return { status: 'running' }
    } catch (e) {
      log.warn('RunningHub poll 异常', e)
      return { status: 'running' }
    }
  }
}
