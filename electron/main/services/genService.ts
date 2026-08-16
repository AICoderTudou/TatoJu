import type { Generation, GenKind, ImageGenRequest, VideoGenRequest, ImageInput } from '@shared/types'
import { getDb } from '../db/client'
import { toGeneration } from '../db/mappers'
import { id, now } from '../util/id'
import { paths } from '../files/fileStore'
import { getImageProvider, getVideoProvider } from '../providers/registry'
import { getSettings } from '../secrets/store'
import { taskRunner, type GenJob } from '../tasks/taskRunner'
import { assetService } from './assetService'
import { shotService } from './shotService'
import { projectService } from './projectService'

/** 项目画幅（生成的唯一来源）；无则回退 9:16 */
function projectAspect(projectId: string | null): string {
  if (!projectId) return '9:16'
  return projectService.get(projectId)?.aspectRatio || '9:16'
}

/** 画幅比例 → 生图像素尺寸（gpt-image 等按 size 出图的 provider 用） */
function sizeForAspect(aspect: string): string {
  const m = /^\s*(\d+)\s*:\s*(\d+)\s*$/.exec(aspect)
  if (!m) return '1024x1536'
  const w = Number(m[1])
  const h = Number(m[2])
  if (w > h) return '1536x1024' // 横屏
  if (w === h) return '1024x1024' // 方形
  return '1024x1536' // 竖屏
}

// 分镜图“单格”兜底：给文生图提示词补上禁多宫格/分屏的英文负面约束（已含则不重复）。
// 仅用于分镜图——资源设定图（角色多视图 / 场景 2×2 宫格）是故意要宫格的，不要套用。
const SINGLE_FRAME_NEG =
  'single cinematic frame, one continuous shot; no grid, no split screen, no collage, no multi-panel, no multi-view, no character sheet, no contact sheet, no storyboard panels'
function ensureSingleFrame(prompt: string): string {
  if (/no grid|single cinematic frame|no multi-panel|no split screen/i.test(prompt)) return prompt
  return `${prompt.trim()}\n${SINGLE_FRAME_NEG}`
}

function projectIdOfShot(shotId: string): string {
  const row: any = getDb()
    .prepare(
      `SELECT sc.project_id AS pid FROM shots sh
       JOIN scenes s ON sh.scene_id=s.id
       JOIN episodes e ON s.episode_id=e.id
       JOIN scripts sc ON e.script_id=sc.id
       WHERE sh.id=?`
    )
    .get(shotId)
  if (!row?.pid) throw new Error('无法定位分镜所属项目')
  return row.pid
}

function createGenRow(opts: {
  projectId: string | null
  kind: GenKind
  provider: string
  model: string | null
  params: unknown
  refKind: string
  refId: string
}): Generation {
  const gid = id('gen')
  const t = now()
  getDb()
    .prepare(
      'INSERT INTO generations (id,project_id,kind,provider,model,params,seed,external_task_id,status,inputs,output_paths,error,cost,ref_kind,ref_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
    )
    .run(
      gid,
      opts.projectId,
      opts.kind,
      opts.provider,
      opts.model,
      JSON.stringify(opts.params ?? {}),
      null,
      null,
      'queued',
      null,
      null,
      null,
      null,
      opts.refKind,
      opts.refId,
      t,
      t
    )
  return toGeneration(getDb().prepare('SELECT * FROM generations WHERE id=?').get(gid))
}

export const genService = {
  imageForAsset(assetId: string): Generation {
    const asset = assetService.get(assetId)
    if (!asset) throw new Error('资源不存在')
    if (!asset.t2iPrompt) throw new Error('该资源还没有文生图提示词，请先生成或填写')
    const provider = getImageProvider()
    const settings = getSettings()
    // 已有参考图作为一致性参考
    const refImages: ImageInput[] = assetService
      .referenceImages(assetId)
      .map((im) => ({ path: im.filePath }))
    const aspectRatio = projectAspect(asset.projectId)
    const req: ImageGenRequest = {
      prompt: asset.t2iPrompt,
      refImages,
      aspectRatio,
      size: sizeForAspect(aspectRatio),
      workflowId: settings.runninghubWorkflowId || undefined
    }
    const gen = createGenRow({
      projectId: asset.projectId,
      kind: 'image',
      provider: provider.name,
      model: null,
      params: req,
      refKind: 'asset',
      refId: assetId
    })
    const job: GenJob = {
      generationId: gen.id,
      projectId: asset.projectId,
      kind: 'image',
      refKind: 'asset',
      refId: assetId,
      provider,
      request: req,
      destDir: paths.assetDir(asset.projectId, asset.type, assetId),
      baseName: gen.id,
      fallbackExt: 'png',
      persist: (relPaths) => {
        for (const rel of relPaths) {
          getDb()
            .prepare(
              'INSERT INTO asset_images (id,asset_id,generation_id,file_path,is_reference,view,created_at) VALUES (?,?,?,?,?,?,?)'
            )
            .run(id('aimg'), assetId, gen.id, rel, 0, null, now())
        }
      }
    }
    taskRunner.enqueue(job)
    return gen
  },

  imageForShot(shotId: string): Generation {
    const shot = shotService.get(shotId)
    if (!shot.storyboardPrompt) throw new Error('该分镜还没有文生图提示词，请先生成')
    const projectId = projectIdOfShot(shotId)
    const provider = getImageProvider()
    const settings = getSettings()
    const refImages = shotService.refContext(shotId).images
    const aspectRatio = projectAspect(projectId)
    const req: ImageGenRequest = {
      // 分镜图必须是单格电影画面。图生图会把参考图（角色 turnaround / 场景 2×2 宫格设定图）
      // 的网格排版复刻进来，导致多宫格——兜底给提示词追加“单格/禁宫格”负面，旧提示词无需重生成也生效。
      prompt: ensureSingleFrame(shot.storyboardPrompt),
      refImages,
      aspectRatio,
      size: sizeForAspect(aspectRatio),
      workflowId: settings.runninghubWorkflowId || undefined
    }
    const gen = createGenRow({
      projectId,
      kind: 'image',
      provider: provider.name,
      model: null,
      params: req,
      refKind: 'shot',
      refId: shotId
    })
    const job: GenJob = {
      generationId: gen.id,
      projectId,
      kind: 'image',
      refKind: 'shot',
      refId: shotId,
      provider,
      request: req,
      destDir: paths.shotImageDir(projectId, shotId),
      baseName: gen.id,
      fallbackExt: 'png',
      persist: (relPaths) => {
        const hasSelected = (getDb()
          .prepare('SELECT COUNT(*) c FROM shot_images WHERE shot_id=? AND is_selected=1')
          .get(shotId) as any).c
        relPaths.forEach((rel, i) => {
          getDb()
            .prepare(
              'INSERT INTO shot_images (id,shot_id,generation_id,file_path,is_selected,created_at) VALUES (?,?,?,?,?,?)'
            )
            .run(id('simg'), shotId, gen.id, rel, !hasSelected && i === 0 ? 1 : 0, now())
        })
      }
    }
    taskRunner.enqueue(job)
    return gen
  },

  videoForShot(shotId: string): Generation {
    const shot = shotService.get(shotId)
    if (!shot.videoPrompt) throw new Error('该分镜还没有视频提示词，请先生成')
    const firstImg = getDb()
      .prepare('SELECT * FROM shot_images WHERE shot_id=? ORDER BY is_selected DESC, created_at DESC LIMIT 1')
      .get(shotId) as any
    if (!firstImg) throw new Error('图生视频需要首帧分镜图，请先生成分镜图')
    const projectId = projectIdOfShot(shotId)
    const provider = getVideoProvider()
    const req: VideoGenRequest = {
      firstFrame: { path: firstImg.file_path },
      prompt: shot.videoPrompt,
      refImages: shotService.refContext(shotId).images,
      durationSec: shot.durationSec ?? 5,
      aspectRatio: projectAspect(projectId)
    }
    const gen = createGenRow({
      projectId,
      kind: 'video',
      provider: provider.name,
      model: null,
      params: req,
      refKind: 'shot',
      refId: shotId
    })
    const job: GenJob = {
      generationId: gen.id,
      projectId,
      kind: 'video',
      refKind: 'shot',
      refId: shotId,
      provider,
      request: req,
      destDir: paths.shotVideoDir(projectId, shotId),
      baseName: gen.id,
      fallbackExt: 'mp4',
      persist: (relPaths) => {
        const hasSelected = (getDb()
          .prepare('SELECT COUNT(*) c FROM shot_videos WHERE shot_id=? AND is_selected=1')
          .get(shotId) as any).c
        relPaths.forEach((rel, i) => {
          getDb()
            .prepare(
              'INSERT INTO shot_videos (id,shot_id,generation_id,file_path,is_selected,created_at) VALUES (?,?,?,?,?,?)'
            )
            .run(id('svid'), shotId, gen.id, rel, !hasSelected && i === 0 ? 1 : 0, now())
        })
      }
    }
    taskRunner.enqueue(job)
    return gen
  },

  list(projectId: string): Generation[] {
    return getDb()
      .prepare('SELECT * FROM generations WHERE project_id=? ORDER BY created_at DESC LIMIT 200')
      .all(projectId)
      .map(toGeneration)
  },

  retry(generationId: string): Generation {
    const row = getDb().prepare('SELECT * FROM generations WHERE id=?').get(generationId) as any
    if (!row) throw new Error('生成记录不存在')
    const g = toGeneration(row)
    if (g.kind === 'image' && g.refKind === 'asset' && g.refId) return this.imageForAsset(g.refId)
    if (g.kind === 'image' && g.refKind === 'shot' && g.refId) return this.imageForShot(g.refId)
    if (g.kind === 'video' && g.refKind === 'shot' && g.refId) return this.videoForShot(g.refId)
    throw new Error('该任务类型不支持重试')
  },

  cancel(generationId: string): { ok: true } {
    taskRunner.cancel(generationId)
    return { ok: true }
  }
}
