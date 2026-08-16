import type { Asset, AssetImage, AssetType } from '@shared/types'
import { getDb } from '../db/client'
import { toAsset, toAssetImage } from '../db/mappers'
import { id, now } from '../util/id'
import { getLLM } from '../providers/registry'
import { getSettings } from '../secrets/store'
import { trackLlm } from '../tasks/track'
import { scriptService } from './scriptService'
import { projectService } from './projectService'
import { ASSET_EXTRACT_SYSTEM_PROMPT } from '@shared/seedance'

interface ExtractedAsset {
  name?: string
  description?: string
  t2iPrompt?: string
}
interface ExtractResult {
  characters?: ExtractedAsset[]
  scenes?: ExtractedAsset[]
  props?: ExtractedAsset[]
}

function scriptToText(projectId: string): string {
  const tree = scriptService.getTree(projectId)
  if (!tree) throw new Error('请先生成或上传剧本')
  const lines: string[] = []
  if (tree.script.title) lines.push(`剧名：${tree.script.title}`)
  if (tree.script.outline) lines.push(`大纲：${tree.script.outline}`)
  for (const ep of tree.episodes) {
    lines.push(`【第${ep.idx}集】${ep.title ?? ''} ${ep.synopsis ?? ''}`)
    for (const sc of ep.scenes) {
      lines.push(`  场景${sc.idx} ${sc.slugline ?? ''} ${sc.location ?? ''} ${sc.timeOfDay ?? ''}`)
      if (sc.description) lines.push(`    ${sc.description}`)
    }
  }
  return lines.join('\n')
}

function insertAsset(projectId: string, type: AssetType, a: ExtractedAsset): Asset | null {
  const name = (a.name ?? '').trim()
  if (!name) return null
  const db = getDb()
  const exists = db
    .prepare('SELECT id FROM assets WHERE project_id=? AND type=? AND name=?')
    .get(projectId, type, name)
  if (exists) return null
  const aid = id('asset')
  db.prepare(
    'INSERT INTO assets (id,project_id,type,name,description,t2i_prompt,created_at) VALUES (?,?,?,?,?,?,?)'
  ).run(aid, projectId, type, name, a.description ?? null, a.t2iPrompt ?? null, now())
  return toAsset(db.prepare('SELECT * FROM assets WHERE id=?').get(aid))
}

export const assetService = {
  async extract(projectId: string): Promise<Asset[]> {
    const text = scriptToText(projectId)
    const styleText = projectService.styleBibleText(projectId)
    const userText = [styleText, text].filter(Boolean).join('\n\n')
    return trackLlm(
      { projectId, label: '资源提取', model: getSettings().llmModel },
      async ({ onChunk }) => {
        const res = await getLLM().chat({
          system: ASSET_EXTRACT_SYSTEM_PROMPT,
          messages: [{ role: 'user', text: userText }],
          json: true,
          task: 'asset.extract',
          stream: true,
          onChunk
        })
        const parsed = (res.json ?? {}) as ExtractResult
        for (const c of parsed.characters ?? []) insertAsset(projectId, 'character', c)
        for (const s of parsed.scenes ?? []) insertAsset(projectId, 'scene', s)
        for (const p of parsed.props ?? []) insertAsset(projectId, 'prop', p)
        return this.list(projectId)
      }
    )
  },

  list(projectId: string): Asset[] {
    return getDb()
      .prepare('SELECT * FROM assets WHERE project_id=? ORDER BY type, created_at')
      .all(projectId)
      .map(toAsset)
  },

  /** 资源列表附带「已有设定图数量 + 封面 + 参考图数」，供 UI 卡片缩略图与体检 */
  listWithImageCount(projectId: string): (Asset & { imageCount: number; referenceCount: number; cover: string | null })[] {
    return getDb()
      .prepare(
        `SELECT a.*,
           (SELECT COUNT(*) FROM asset_images ai WHERE ai.asset_id = a.id) AS image_count,
           (SELECT COUNT(*) FROM asset_images ai WHERE ai.asset_id = a.id AND ai.is_reference = 1) AS ref_count,
           (SELECT ai.file_path FROM asset_images ai WHERE ai.asset_id = a.id
              ORDER BY ai.is_reference DESC, ai.created_at LIMIT 1) AS cover
         FROM assets a WHERE a.project_id = ? ORDER BY a.type, a.created_at`
      )
      .all(projectId)
      .map((r: any) => ({
        ...toAsset(r),
        imageCount: Number(r.image_count) || 0,
        referenceCount: Number(r.ref_count) || 0,
        cover: r.cover ?? null
      }))
  },

  /** 资源封面图相对路径（优先参考图，其次首张）；无图返回 null */
  cover(assetId: string): string | null {
    return this.referenceImages(assetId)[0]?.filePath ?? null
  },

  get(assetId: string): (Asset & { images: AssetImage[] }) | null {
    const db = getDb()
    const r = db.prepare('SELECT * FROM assets WHERE id=?').get(assetId)
    if (!r) return null
    const images = db
      .prepare('SELECT * FROM asset_images WHERE asset_id=? ORDER BY created_at DESC')
      .all(assetId)
      .map(toAssetImage)
    return { ...toAsset(r), images }
  },

  create(input: {
    projectId: string
    type: AssetType
    name: string
    description?: string
    t2iPrompt?: string
  }): Asset {
    const db = getDb()
    const aid = id('asset')
    db.prepare(
      'INSERT INTO assets (id,project_id,type,name,description,t2i_prompt,created_at) VALUES (?,?,?,?,?,?,?)'
    ).run(aid, input.projectId, input.type, input.name, input.description ?? null, input.t2iPrompt ?? null, now())
    return toAsset(db.prepare('SELECT * FROM assets WHERE id=?').get(aid))
  },

  update(assetId: string, patch: Partial<Pick<Asset, 'name' | 'description' | 't2iPrompt'>>): Asset {
    const db = getDb()
    const cur = db.prepare('SELECT * FROM assets WHERE id=?').get(assetId)
    if (!cur) throw new Error('资源不存在')
    const c = toAsset(cur)
    db.prepare('UPDATE assets SET name=?, description=?, t2i_prompt=? WHERE id=?').run(
      patch.name ?? c.name,
      patch.description ?? c.description,
      patch.t2iPrompt ?? c.t2iPrompt,
      assetId
    )
    return toAsset(db.prepare('SELECT * FROM assets WHERE id=?').get(assetId))
  },

  remove(assetId: string): { ok: true } {
    getDb().prepare('DELETE FROM assets WHERE id=?').run(assetId)
    return { ok: true }
  },

  setConfirmed(assetId: string, confirmed: boolean): { ok: true } {
    getDb().prepare('UPDATE assets SET confirmed=? WHERE id=?').run(confirmed ? 1 : 0, assetId)
    return { ok: true }
  },

  confirmAll(projectId: string): { ok: true } {
    getDb().prepare('UPDATE assets SET confirmed=1 WHERE project_id=?').run(projectId)
    return { ok: true }
  },

  setReference(imageId: string, isReference: boolean): { ok: true } {
    getDb()
      .prepare('UPDATE asset_images SET is_reference=? WHERE id=?')
      .run(isReference ? 1 : 0, imageId)
    return { ok: true }
  },

  /** 取某资源的参考图（优先 is_reference），供下游分镜/视频引用 */
  referenceImages(assetId: string): AssetImage[] {
    const db = getDb()
    const refs = db
      .prepare('SELECT * FROM asset_images WHERE asset_id=? AND is_reference=1 ORDER BY created_at')
      .all(assetId)
      .map(toAssetImage)
    if (refs.length) return refs
    const any = db
      .prepare('SELECT * FROM asset_images WHERE asset_id=? ORDER BY created_at LIMIT 1')
      .all(assetId)
      .map(toAssetImage)
    return any
  }
}
