import type { Shot, ShotImage, ShotVideo, Asset, Beat, SceneElement, ImageInput } from '@shared/types'
import type { ContinuityWarning } from '@shared/ipc'
import { getDb } from '../db/client'
import { toShot, toShotImage, toShotVideo, toAsset, toScene, toBeat, toSceneElement } from '../db/mappers'
import { id, now } from '../util/id'
import { getLLM } from '../providers/registry'
import { getSettings } from '../secrets/store'
import { trackLlm } from '../tasks/track'
import { assetService } from './assetService'
import { projectService } from './projectService'
import {
  SCENE_BREAKDOWN_SHEET_SYSTEM_PROMPT,
  SHOT_BREAKDOWN_SYSTEM_PROMPT,
  STORYBOARD_SYSTEM_PROMPT,
  SEEDANCE_SYSTEM_PROMPT,
  assembleSeedancePrompt
} from '@shared/seedance'

interface ParsedShot {
  idx?: number
  beatIdx?: number
  shotSize?: string
  cameraAngle?: string
  cameraMove?: string
  lens?: string
  subjectInFrame?: string
  screenDirection?: string
  eyeline?: string
  axisSide?: string
  durationSec?: number
  soundType?: string
  audioCue?: string
  dialogue?: string
  dialogueRefs?: number[]
  action?: string
  continuityNotes?: string
}
interface ParsedSheet {
  sceneGoal?: string
  valueShift?: string
  elements?: { category?: string; name?: string; note?: string }[]
  beats?: { idx?: number; summary?: string; beatType?: string; valueShift?: string; dialogueRefs?: number[] }[]
}

// includeDialogue：拆分镜/视频提示词需要对白；但【分镜图(静帧)不需要对白】，
// 否则对白会被生图模型当字幕画进画面。
function sceneContext(
  sceneId: string,
  opts: { includeDialogue?: boolean } = {}
): { sceneText: string; projectId: string } {
  const { includeDialogue = true } = opts
  const db = getDb()
  const scRow = db.prepare('SELECT * FROM scenes WHERE id=?').get(sceneId)
  if (!scRow) throw new Error('场景不存在')
  const sc = toScene(scRow)
  const ep: any = db.prepare('SELECT * FROM episodes WHERE id=?').get(sc.episodeId)
  const scr: any = db.prepare('SELECT * FROM scripts WHERE id=?').get(ep.script_id)
  // 结构化对白：原样喂给拆分镜，要求逐句分配到镜头、不得改写/新增/遗漏
  const dialogueText =
    includeDialogue && sc.dialogues && sc.dialogues.length
      ? '本场对白（逐句、按顺序，必须原样分配到各镜头的 dialogue，禁止改写/缩写/新增/遗漏）：\n' +
        sc.dialogues
          .map((d, i) => `${i + 1}. ${d.character}：${d.text}${d.note ? `（${d.note}）` : ''}`)
          .join('\n')
      : ''
  const sceneText = [
    `场景：${sc.slugline ?? ''} | 地点：${sc.location ?? ''} | 时间：${sc.timeOfDay ?? ''}`,
    `场景描述（动作/旁白）：${sc.description ?? ''}`,
    dialogueText,
    ep?.synopsis ? `本集梗概：${ep.synopsis}` : ''
  ]
    .filter(Boolean)
    .join('\n')
  return { sceneText, projectId: scr.project_id }
}

/** 把镜头的电影级字段(焦段/主体/朝向/视线)拼成一行，注入分镜图/视频提示词增强运动驱动 */
function shotCinemaLine(shot: Shot): string {
  const parts: string[] = []
  if (shot.lens) parts.push(`焦段=${shot.lens}`)
  if (shot.subjectInFrame) parts.push(`主体=${shot.subjectInFrame}`)
  if (shot.screenDirection) parts.push(`朝向=${shot.screenDirection}`)
  if (shot.eyeline) parts.push(`视线=${shot.eyeline}`)
  return parts.length ? `镜头细节：${parts.join('  ')}` : ''
}

export const shotService = {
  /** 一键拆分镜 = 工序A(拆解表+节拍) → 工序B(排镜)，向后兼容旧入口 */
  async breakdown(sceneId: string): Promise<Shot[]> {
    await this.breakdownSheet(sceneId)
    return this.shotList(sceneId)
  },

  /** 工序A · 场景拆解表(元素清单 + 节拍 Beat)，并把元素回链到已有资源 */
  async breakdownSheet(sceneId: string): Promise<{ elements: SceneElement[]; beats: Beat[] }> {
    const { sceneText, projectId } = sceneContext(sceneId)
    return trackLlm(
      { projectId, label: '场景拆解表', model: getSettings().llmModel, refKind: 'scene', refId: sceneId },
      async ({ onChunk }) => {
        const res = await getLLM().chat({
          system: SCENE_BREAKDOWN_SHEET_SYSTEM_PROMPT,
          messages: [{ role: 'user', text: sceneText }],
          json: true,
          task: 'scene.breakdownSheet',
          stream: true,
          onChunk
        })
        const parsed = (res.json ?? {}) as ParsedSheet
        const assets = assetService.list(projectId)
        const matchAssetId = (name: string): string | null =>
          assets.find((a) => a.name && a.name === name)?.id ?? null
        const db = getDb()
        const tx = db.transaction(() => {
          db.prepare('DELETE FROM beats WHERE scene_id=?').run(sceneId)
          db.prepare('DELETE FROM scene_elements WHERE scene_id=?').run(sceneId)
          db.prepare('UPDATE scenes SET scene_goal=?, value_shift=? WHERE id=?').run(
            parsed.sceneGoal ?? null,
            parsed.valueShift ?? null,
            sceneId
          )
          ;(parsed.elements ?? []).forEach((e, i) => {
            const nm = (e.name ?? '').trim()
            if (!nm) return
            db.prepare(
              'INSERT INTO scene_elements (id,scene_id,idx,category,name,asset_id,note) VALUES (?,?,?,?,?,?,?)'
            ).run(id('selem'), sceneId, i + 1, e.category ?? 'note', nm, matchAssetId(nm), e.note ?? null)
          })
          ;(parsed.beats ?? []).forEach((b, i) => {
            db.prepare(
              'INSERT INTO beats (id,scene_id,idx,summary,beat_type,value_shift,dialogue_refs) VALUES (?,?,?,?,?,?,?)'
            ).run(
              id('beat'),
              sceneId,
              b.idx ?? i + 1,
              b.summary ?? null,
              b.beatType ?? null,
              b.valueShift ?? null,
              b.dialogueRefs && b.dialogueRefs.length ? JSON.stringify(b.dialogueRefs) : null
            )
          })
        })
        tx()
        return { elements: this.sceneElements(sceneId), beats: this.beats(sceneId) }
      }
    )
  },

  /** 工序B · 以节拍为骨排镜，输出电影级字段；无节拍时先自动拆解表 */
  async shotList(sceneId: string): Promise<Shot[]> {
    if (!this.beats(sceneId).length) await this.breakdownSheet(sceneId)
    const { sceneText, projectId } = sceneContext(sceneId)
    const beats = this.beats(sceneId)
    const elements = this.sceneElements(sceneId)
    const beatsText = beats.length
      ? '本场节拍表(每个镜头必须用 beatIdx 归属下面某一拍的 idx)：\n' +
        beats.map((b) => `${b.idx}. [${b.beatType ?? ''}] ${b.summary ?? ''}（${b.valueShift ?? ''}）`).join('\n')
      : ''
    const elemText = elements.length ? '本场拆解表元素：' + elements.map((e) => e.name).join('、') : ''
    const userText = [sceneText, beatsText, elemText].filter(Boolean).join('\n\n')
    return trackLlm(
      { projectId, label: '排镜(镜头表)', model: getSettings().llmModel, refKind: 'scene', refId: sceneId },
      async ({ onChunk }) => {
        const res = await getLLM().chat({
          system: SHOT_BREAKDOWN_SYSTEM_PROMPT,
          messages: [{ role: 'user', text: userText }],
          json: true,
          task: 'shot.shotList',
          stream: true,
          onChunk
        })
        const parsed = (res.json ?? {}) as { shots?: ParsedShot[] }
        const shots = parsed.shots ?? []
        const beatIdxToId = new Map(beats.map((b) => [b.idx, b.id]))
        const db = getDb()
        const tx = db.transaction(() => {
          db.prepare('DELETE FROM shots WHERE scene_id=?').run(sceneId)
          shots.forEach((s, i) => {
            db.prepare(
              `INSERT INTO shots (id,scene_id,idx,shot_size,camera_angle,camera_move,duration_sec,dialogue,action,
                 storyboard_prompt,video_prompt,beat_id,lens,subject_in_frame,screen_direction,eyeline,axis_side,
                 sound_type,audio_cue,continuity_notes,dialogue_refs)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
            ).run(
              id('shot'),
              sceneId,
              s.idx ?? i + 1,
              s.shotSize ?? null,
              s.cameraAngle ?? null,
              s.cameraMove ?? null,
              s.durationSec ?? null,
              s.dialogue ?? null,
              s.action ?? null,
              null,
              null,
              s.beatIdx != null ? beatIdxToId.get(s.beatIdx) ?? null : null,
              s.lens ?? null,
              s.subjectInFrame ?? null,
              s.screenDirection ?? null,
              s.eyeline ?? null,
              s.axisSide ?? null,
              s.soundType ?? null,
              s.audioCue ?? null,
              s.continuityNotes ?? null,
              s.dialogueRefs && s.dialogueRefs.length ? JSON.stringify(s.dialogueRefs) : null
            )
          })
        })
        tx()
        this.linkShotAssets(sceneId, projectId)
        return this.listByScene(sceneId)
      }
    )
  },

  beats(sceneId: string): Beat[] {
    return getDb().prepare('SELECT * FROM beats WHERE scene_id=? ORDER BY idx').all(sceneId).map(toBeat)
  },

  sceneElements(sceneId: string): SceneElement[] {
    return getDb()
      .prepare('SELECT * FROM scene_elements WHERE scene_id=? ORDER BY idx')
      .all(sceneId)
      .map(toSceneElement)
  },

  /** 用拆解表里已回链 assetId 的元素，关联到镜头：角色/场景默认全场出现，道具按本镜文本是否提及 */
  linkShotAssets(sceneId: string, projectId: string): void {
    const elements = this.sceneElements(sceneId).filter((e) => e.assetId)
    if (!elements.length) return
    const typeById = new Map(assetService.list(projectId).map((a) => [a.id, a.type]))
    for (const sh of this.listByScene(sceneId)) {
      const hay = `${sh.action ?? ''} ${sh.dialogue ?? ''} ${sh.subjectInFrame ?? ''}`
      for (const e of elements) {
        const t = typeById.get(e.assetId as string)
        const present = t === 'character' || t === 'scene' || hay.includes(e.name)
        if (present) this.addAssetRef(sh.id, e.assetId as string)
      }
    }
  },

  // 建议引用：场景/动作里提及、但尚未引用的资源
  suggestAssets(shotId: string): Asset[] {
    const shot = this.get(shotId)
    const { sceneText, projectId } = sceneContext(shot.sceneId)
    const refIds = new Set(this.assetRefs(shotId).map((a) => a.id))
    const hay = `${shot.action ?? ''} ${shot.dialogue ?? ''} ${sceneText}`
    return assetService
      .list(projectId)
      .filter((a) => !refIds.has(a.id) && !!a.name && hay.includes(a.name))
  },

  listByScene(sceneId: string): Shot[] {
    return getDb().prepare('SELECT * FROM shots WHERE scene_id=? ORDER BY idx').all(sceneId).map(toShot)
  },

  get(shotId: string): Shot {
    const r = getDb().prepare('SELECT * FROM shots WHERE id=?').get(shotId)
    if (!r) throw new Error('分镜不存在')
    return toShot(r)
  },

  update(shotId: string, patch: Partial<Shot>): Shot {
    const c = this.get(shotId)
    const refs = patch.dialogueRefs !== undefined ? patch.dialogueRefs : c.dialogueRefs
    getDb()
      .prepare(
        `UPDATE shots SET shot_size=?, camera_angle=?, camera_move=?, duration_sec=?, dialogue=?, action=?,
           storyboard_prompt=?, video_prompt=?, beat_id=?, lens=?, subject_in_frame=?, screen_direction=?,
           eyeline=?, axis_side=?, sound_type=?, audio_cue=?, continuity_notes=?, dialogue_refs=? WHERE id=?`
      )
      .run(
        patch.shotSize ?? c.shotSize,
        patch.cameraAngle ?? c.cameraAngle,
        patch.cameraMove ?? c.cameraMove,
        patch.durationSec ?? c.durationSec,
        patch.dialogue ?? c.dialogue,
        patch.action ?? c.action,
        patch.storyboardPrompt ?? c.storyboardPrompt,
        patch.videoPrompt ?? c.videoPrompt,
        patch.beatId ?? c.beatId ?? null,
        patch.lens ?? c.lens ?? null,
        patch.subjectInFrame ?? c.subjectInFrame ?? null,
        patch.screenDirection ?? c.screenDirection ?? null,
        patch.eyeline ?? c.eyeline ?? null,
        patch.axisSide ?? c.axisSide ?? null,
        patch.soundType ?? c.soundType ?? null,
        patch.audioCue ?? c.audioCue ?? null,
        patch.continuityNotes ?? c.continuityNotes ?? null,
        refs && refs.length ? JSON.stringify(refs) : null,
        shotId
      )
    return this.get(shotId)
  },

  remove(shotId: string): { ok: true } {
    getDb().prepare('DELETE FROM shots WHERE id=?').run(shotId)
    return { ok: true }
  },

  images(shotId: string): ShotImage[] {
    return getDb()
      .prepare('SELECT * FROM shot_images WHERE shot_id=? ORDER BY created_at DESC')
      .all(shotId)
      .map(toShotImage)
  },

  videos(shotId: string): ShotVideo[] {
    return getDb()
      .prepare('SELECT * FROM shot_videos WHERE shot_id=? ORDER BY created_at DESC')
      .all(shotId)
      .map(toShotVideo)
  },

  selectImage(shotId: string, imageId: string): { ok: true } {
    const db = getDb()
    db.prepare('UPDATE shot_images SET is_selected=0 WHERE shot_id=?').run(shotId)
    db.prepare('UPDATE shot_images SET is_selected=1 WHERE id=? AND shot_id=?').run(imageId, shotId)
    return { ok: true }
  },

  selectVideo(shotId: string, videoId: string): { ok: true } {
    const db = getDb()
    db.prepare('UPDATE shot_videos SET is_selected=0 WHERE shot_id=?').run(shotId)
    db.prepare('UPDATE shot_videos SET is_selected=1 WHERE id=? AND shot_id=?').run(videoId, shotId)
    return { ok: true }
  },

  assetRefs(shotId: string): Asset[] {
    return getDb()
      .prepare(
        'SELECT a.* FROM assets a JOIN shot_asset_refs r ON a.id=r.asset_id WHERE r.shot_id=? ORDER BY a.type'
      )
      .all(shotId)
      .map(toAsset)
  },

  /** 引用资源 + 封面图/是否有图（供分镜板显示缩略图、预览、以及"必须有图才能生成"的流程校验） */
  assetRefsDetailed(shotId: string): (Asset & { cover: string | null; hasImage: boolean })[] {
    return this.assetRefs(shotId).map((a) => {
      const imgs = assetService.referenceImages(a.id)
      return { ...a, cover: imgs[0]?.filePath ?? null, hasImage: imgs.length > 0 }
    })
  },

  addAssetRef(shotId: string, assetId: string): { ok: true } {
    getDb()
      .prepare('INSERT OR IGNORE INTO shot_asset_refs (shot_id,asset_id) VALUES (?,?)')
      .run(shotId, assetId)
    return { ok: true }
  },

  removeAssetRef(shotId: string, assetId: string): { ok: true } {
    getDb().prepare('DELETE FROM shot_asset_refs WHERE shot_id=? AND asset_id=?').run(shotId, assetId)
    return { ok: true }
  },

  /** 连续性校验（纯代码，不烧 LLM 额度）：跳轴 / 时长 / 对白漏词 / 节拍覆盖 */
  continuityCheck(sceneId: string): ContinuityWarning[] {
    const shots = this.listByScene(sceneId)
    const beats = this.beats(sceneId)
    const scRow = getDb().prepare('SELECT * FROM scenes WHERE id=?').get(sceneId)
    const sc = scRow ? toScene(scRow) : null
    const warns: ContinuityWarning[] = []

    // 1. 180° 跳轴：相邻 L/R 镜翻转且中间无 N 中性镜
    const flips: { idx: number; from: string; to: string }[] = []
    let lastSide: string | null = null
    let neutralSince = false
    for (const s of shots) {
      const a = s.axisSide
      if (a === 'N') {
        neutralSince = true
        continue
      }
      if (a === 'L' || a === 'R') {
        if (lastSide && a !== lastSide && !neutralSince) {
          flips.push({ idx: s.idx, from: lastSide, to: a })
        }
        lastSide = a
        neutralSince = false
      }
    }
    // 连续 ≥3 次 L/R 翻转 = 典型「正反打」对话覆盖（相机其实仍在同侧，常被排镜模型把
    // axisSide 误标成主体所在侧而逐镜翻转）。把这种成片误报合并为一条「提示级」告警，
    // 而不是逐镜抛出多条「严重」错误，避免吓到用户。真正孤立的一次跳轴仍按严重处理。
    if (flips.length >= 3) {
      warns.push({
        level: 'warn',
        code: 'axis',
        message:
          `镜 ${flips[0].idx}–${flips[flips.length - 1].idx} 轴线在 L/R 间反复交替（${flips.length} 次），` +
          `通常是「正反打」对话覆盖被误标为跳轴。请确认相机始终在轴线同一侧（一人恒在画左、一人恒在画右）：` +
          `若确实如此可忽略本条；若真要换到另一侧，需在换侧处插入一个「过轴/中性」镜（轴线设为 N）。`,
        shotIdx: flips[0].idx
      })
    } else {
      for (const f of flips) {
        warns.push({
          level: 'high',
          code: 'axis',
          message: `镜 ${f.idx} 轴线由 ${f.from} 跳到 ${f.to}，中间无过轴/中性镜，疑似跳轴`,
          shotIdx: f.idx
        })
      }
    }

    // 2. 时长：单镜 >6s；总时长偏离目标
    let sum = 0
    for (const s of shots) {
      const d = s.durationSec ?? 0
      sum += d
      if (d > 6) {
        warns.push({ level: 'warn', code: 'duration', message: `镜 ${s.idx} 时长 ${d}s 超过单镜 6s 上限`, shotIdx: s.idx })
      }
    }
    if (sc?.targetDurationSec && sc.targetDurationSec > 0) {
      const dev = Math.abs(sum - sc.targetDurationSec) / sc.targetDurationSec
      if (dev > 0.3) {
        warns.push({ level: 'high', code: 'totalDuration', message: `本场总时长 ${sum.toFixed(1)}s 偏离目标 ${sc.targetDurationSec}s 超过 30%` })
      } else if (dev > 0.15) {
        warns.push({ level: 'warn', code: 'totalDuration', message: `本场总时长 ${sum.toFixed(1)}s 偏离目标 ${sc.targetDurationSec}s（超出 ±15%）` })
      }
    }

    // 3. 对白漏词：场景结构化对白未被任何镜头 dialogueRefs 覆盖
    if (sc?.dialogues && sc.dialogues.length) {
      const covered = new Set<number>()
      for (const s of shots) (s.dialogueRefs ?? []).forEach((n) => covered.add(n))
      const missing: number[] = []
      sc.dialogues.forEach((_, i) => {
        if (!covered.has(i + 1) && !covered.has(i)) missing.push(i + 1)
      })
      if (missing.length) {
        warns.push({ level: 'high', code: 'dialogueCoverage', message: `有 ${missing.length} 句对白未被任何镜头覆盖（第 ${missing.join('、')} 句）` })
      }
    }

    // 4. 节拍覆盖：有节拍没镜头 / 有镜头没归属节拍
    if (beats.length) {
      const usedBeats = new Set(shots.map((s) => s.beatId).filter(Boolean))
      const emptyBeats = beats.filter((b) => !usedBeats.has(b.id))
      if (emptyBeats.length) {
        warns.push({ level: 'warn', code: 'beatCoverage', message: `有 ${emptyBeats.length} 个节拍没有镜头：${emptyBeats.map((b) => b.summary || `#${b.idx}`).join('；')}` })
      }
      const noBeat = shots.filter((s) => !s.beatId)
      if (noBeat.length) {
        warns.push({ level: 'warn', code: 'beatCoverage', message: `有 ${noBeat.length} 个镜头未归属任何节拍` })
      }
    }

    return warns
  },

  /** 引用资源的设定描述 + 参考图（供分镜/视频提示词智能体多模态输入） */
  refContext(shotId: string): { text: string; images: ImageInput[] } {
    const refs = this.assetRefs(shotId)
    const lines: string[] = []
    const images: ImageInput[] = []
    for (const a of refs) {
      lines.push(`[${a.type}] ${a.name}：${a.description ?? ''}｜提示词：${a.t2iPrompt ?? ''}`)
      for (const img of assetService.referenceImages(a.id)) {
        images.push({ path: img.filePath })
      }
    }
    return { text: lines.join('\n'), images }
  },

  async genStoryboardPrompt(shotId: string): Promise<Shot> {
    const shot = this.get(shotId)
    // 分镜图是静帧，不喂对白（含场景级对白），避免被生图模型当字幕画进画面
    const { sceneText, projectId } = sceneContext(shot.sceneId, { includeDialogue: false })
    const aspectRatio = projectService.get(projectId)?.aspectRatio || '9:16'
    const ref = this.refContext(shotId)
    const userText = [
      projectService.styleBibleText(projectId),
      sceneText,
      `镜头：景别=${shot.shotSize ?? ''} 机位=${shot.cameraAngle ?? ''} 运镜=${shot.cameraMove ?? ''}`,
      shotCinemaLine(shot),
      `画面比例：${aspectRatio}（务必按此比例构图）`,
      shot.action ? `动作：${shot.action}` : '',
      // 注意：分镜图不传对白。对白只用于排镜分配台词 / 图生视频驱动表演。
      ref.text ? `引用资源：\n${ref.text}` : ''
    ]
      .filter(Boolean)
      .join('\n')
    return trackLlm(
      { projectId, label: '分镜提示词', model: getSettings().llmModel, refKind: 'shot', refId: shotId },
      async ({ onChunk }) => {
        const res = await getLLM().chat({
          system: STORYBOARD_SYSTEM_PROMPT,
          messages: [{ role: 'user', text: userText, images: ref.images }],
          task: 'shot.storyboardPrompt',
          stream: true,
          onChunk
        })
        const prompt =
          (res.json && typeof res.json === 'object' && (res.json as any).prompt) || res.text.trim()
        return this.update(shotId, { storyboardPrompt: prompt })
      }
    )
  },

  async genVideoPrompt(shotId: string): Promise<Shot> {
    const shot = this.get(shotId)
    const { sceneText, projectId } = sceneContext(shot.sceneId)
    const aspectRatio = projectService.get(projectId)?.aspectRatio || '9:16'
    const ref = this.refContext(shotId)
    // 首帧：优先选定的分镜图
    const selectedImg = getDb()
      .prepare(
        'SELECT * FROM shot_images WHERE shot_id=? ORDER BY is_selected DESC, created_at DESC LIMIT 1'
      )
      .get(shotId) as any
    const images: ImageInput[] = []
    if (selectedImg) images.push({ path: selectedImg.file_path })
    images.push(...ref.images)

    const userText = [
      projectService.styleBibleText(projectId),
      sceneText,
      `镜头：景别=${shot.shotSize ?? ''} 机位=${shot.cameraAngle ?? ''} 运镜=${shot.cameraMove ?? ''} 时长=${shot.durationSec ?? 5}秒`,
      shotCinemaLine(shot),
      `画面比例：${aspectRatio}`,
      shot.action ? `动作：${shot.action}` : '',
      shot.dialogue ? `本镜对白（请在「声音说明」区块逐句标注配音语言/语气，与画面音画对齐）：${shot.dialogue}` : '',
      selectedImg ? '已提供分镜图作为首帧（@图片1）。' : '（暂无分镜图，请基于文字描述生成运动提示词）',
      ref.text ? `引用资源：\n${ref.text}` : ''
    ]
      .filter(Boolean)
      .join('\n')

    return trackLlm(
      { projectId, label: '视频提示词', model: getSettings().llmModel, refKind: 'shot', refId: shotId },
      async ({ onChunk }) => {
        const res = await getLLM().chat({
          system: SEEDANCE_SYSTEM_PROMPT,
          messages: [{ role: 'user', text: userText, images }],
          json: true,
          task: 'shot.videoPrompt',
          stream: true,
          onChunk
        })
        let prompt = ''
        if (res.json && typeof res.json === 'object') {
          const j = res.json as any
          prompt =
            j.prompt ||
            (j.fields
              ? assembleSeedancePrompt({
                  ...j.fields,
                  durationSec: shot.durationSec ?? 5,
                  aspectRatio
                })
              : '')
        }
        if (!prompt) prompt = res.text.trim()
        return this.update(shotId, { videoPrompt: prompt })
      }
    )
  }
}
