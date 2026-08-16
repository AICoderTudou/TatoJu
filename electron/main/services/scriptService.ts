import { promises as fs } from 'node:fs'
import { extname } from 'node:path'
import type { Scene, Episode, ScriptGenParams } from '@shared/types'
import type { ScriptTree } from '@shared/ipc'
import { getDb } from '../db/client'
import { toScript, toEpisode, toScene, toShot } from '../db/mappers'
import { id, now } from '../util/id'
import { getLLM } from '../providers/registry'
import { getSettings } from '../secrets/store'
import { trackLlm } from '../tasks/track'
import { projectService } from './projectService'
import {
  SCRIPT_GEN_SYSTEM_PROMPT,
  SCRIPT_FAITHFUL_PARSE_SYSTEM_PROMPT
} from '@shared/seedance'
import { log } from '../util/log'

interface ParsedScene {
  idx?: number
  slugline?: string
  location?: string
  timeOfDay?: string
  description?: string
  dialogues?: { character?: string; text?: string; note?: string }[]
}
interface ParsedEpisode {
  idx?: number
  title?: string
  synopsis?: string
  scenes?: ParsedScene[]
}
interface ParsedScript {
  title?: string
  outline?: unknown
  episodes?: ParsedEpisode[]
}

function persistTree(
  projectId: string,
  source: 'generated' | 'uploaded',
  rawText: string | null,
  parsed: ParsedScript
): ScriptTree {
  const db = getDb()
  const tx = db.transaction(() => {
    // 一项目一活动剧本：清掉旧剧本（级联清 episodes/scenes/shots）
    db.prepare('DELETE FROM scripts WHERE project_id=?').run(projectId)
    const sid = id('scr')
    const t = now()
    db.prepare(
      'INSERT INTO scripts (id,project_id,title,source,raw_text,outline,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)'
    ).run(
      sid,
      projectId,
      parsed.title ?? '未命名剧本',
      source,
      rawText,
      parsed.outline ? JSON.stringify(parsed.outline) : null,
      'ready',
      t,
      t
    )
    const episodes = parsed.episodes?.length ? parsed.episodes : [{ idx: 1, title: '第一集', scenes: [] }]
    episodes.forEach((ep, ei) => {
      const eid = id('ep')
      db.prepare('INSERT INTO episodes (id,script_id,idx,title,synopsis) VALUES (?,?,?,?,?)').run(
        eid,
        sid,
        ep.idx ?? ei + 1,
        ep.title ?? `第${ei + 1}集`,
        ep.synopsis ?? null
      )
      ;(ep.scenes ?? []).forEach((sc, si) => {
        const scid = id('scn')
        // 结构化对白：清洗为 {character,text,note?}，过滤空行
        const dlgs = (sc.dialogues ?? [])
          .map((d) => ({
            character: (d.character ?? '').trim(),
            text: (d.text ?? '').trim(),
            ...(d.note && d.note.trim() ? { note: d.note.trim() } : {})
          }))
          .filter((d) => d.text)
        db.prepare(
          'INSERT INTO scenes (id,episode_id,idx,slugline,location,time_of_day,description,dialogues) VALUES (?,?,?,?,?,?,?,?)'
        ).run(
          scid,
          eid,
          sc.idx ?? si + 1,
          sc.slugline ?? null,
          sc.location ?? null,
          sc.timeOfDay ?? null,
          sc.description ?? null,
          dlgs.length ? JSON.stringify(dlgs) : null
        )
      })
    })
    return sid
  })
  tx()
  projectService.touch(projectId)
  return getTreeByProject(projectId)!
}

function getTreeByProject(projectId: string): ScriptTree | null {
  const db = getDb()
  const sr = db
    .prepare('SELECT * FROM scripts WHERE project_id=? ORDER BY created_at DESC LIMIT 1')
    .get(projectId)
  if (!sr) return null
  const script = toScript(sr)
  const eps = db.prepare('SELECT * FROM episodes WHERE script_id=? ORDER BY idx').all(script.id).map(toEpisode)
  const episodes = eps.map((ep) => {
    const scs = db.prepare('SELECT * FROM scenes WHERE episode_id=? ORDER BY idx').all(ep.id).map(toScene)
    const scenes = scs.map((sc) => {
      const shots = db.prepare('SELECT * FROM shots WHERE scene_id=? ORDER BY idx').all(sc.id).map(toShot)
      return { ...sc, shots }
    })
    return { ...ep, scenes }
  })
  return { script, episodes }
}

function parseLLMScript(raw: unknown): ParsedScript {
  if (raw && typeof raw === 'object') return raw as ParsedScript
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw)
    } catch {
      /* ignore */
    }
  }
  throw new Error('剧本解析失败：模型未返回有效结构')
}

export const scriptService = {
  async generate(projectId: string, params: ScriptGenParams): Promise<ScriptTree> {
    const userText = [
      `题材：${params.genre}`,
      `集数：${params.episodes}`,
      `单集时长(秒)：${params.durationSecPerEp}`,
      params.logline ? `故事梗概：${params.logline}` : '',
      params.tone ? `基调：${params.tone}` : ''
    ]
      .filter(Boolean)
      .join('\n')
    return trackLlm(
      { projectId, label: '剧本生成', model: getSettings().scriptModel },
      async ({ onChunk }) => {
        const res = await getLLM().chat({
          system: SCRIPT_GEN_SYSTEM_PROMPT,
          messages: [{ role: 'user', text: userText }],
          json: true,
          task: 'script.generate',
          model: getSettings().scriptModel,
          stream: true,
          onChunk
        })
        const parsed = parseLLMScript(res.json ?? res.text)
        return persistTree(projectId, 'generated', null, parsed)
      }
    )
  },

  async parseUpload(projectId: string, input: { title?: string; text: string }): Promise<ScriptTree> {
    return trackLlm(
      { projectId, label: '剧本拆解(忠实保真)', model: getSettings().scriptModel },
      async ({ onChunk }) => {
        const res = await getLLM().chat({
          system: SCRIPT_FAITHFUL_PARSE_SYSTEM_PROMPT,
          messages: [{ role: 'user', text: input.text.slice(0, 30000) }],
          json: true,
          task: 'script.parse',
          model: getSettings().scriptModel,
          stream: true,
          onChunk
        })
        const parsed = parseLLMScript(res.json ?? res.text)
        if (input.title) parsed.title = input.title
        return persistTree(projectId, 'uploaded', input.text, parsed)
      }
    )
  },

  async importFile(projectId: string, filePath: string): Promise<ScriptTree> {
    const ext = extname(filePath).toLowerCase()
    let text = ''
    if (ext === '.txt' || ext === '.md' || ext === '.markdown') {
      text = await fs.readFile(filePath, 'utf8')
    } else if (ext === '.docx') {
      try {
        // 动态加载，未安装则给出友好提示
        const mammoth = require('mammoth')
        const out = await mammoth.extractRawText({ path: filePath })
        text = out.value
      } catch (e) {
        log.warn('docx 解析失败', e)
        throw new Error('当前未安装 docx 解析依赖（mammoth），请改用 txt/md 或粘贴文本。')
      }
    } else {
      throw new Error(`不支持的文件类型：${ext}`)
    }
    return this.parseUpload(projectId, { title: filePath.split(/[\\/]/).pop(), text })
  },

  getTree(projectId: string): ScriptTree | null {
    return getTreeByProject(projectId)
  },

  updateScene(sceneId: string, patch: Partial<Scene>): Scene {
    const db = getDb()
    const cur = db.prepare('SELECT * FROM scenes WHERE id=?').get(sceneId) as any
    if (!cur) throw new Error('场景不存在')
    const c = toScene(cur)
    // dialogues：传了就用新值（清洗后序列化），没传则保留原 JSON
    let dialoguesJson: string | null = cur.dialogues ?? null
    if (patch.dialogues !== undefined) {
      const dlgs = (patch.dialogues ?? [])
        .map((d) => ({
          character: (d.character ?? '').trim(),
          text: (d.text ?? '').trim(),
          ...(d.note && d.note.trim() ? { note: d.note.trim() } : {})
        }))
        .filter((d) => d.text)
      dialoguesJson = dlgs.length ? JSON.stringify(dlgs) : null
    }
    db.prepare(
      'UPDATE scenes SET slugline=?, location=?, time_of_day=?, description=?, dialogues=? WHERE id=?'
    ).run(
      patch.slugline ?? c.slugline,
      patch.location ?? c.location,
      patch.timeOfDay ?? c.timeOfDay,
      patch.description ?? c.description,
      dialoguesJson,
      sceneId
    )
    return toScene(db.prepare('SELECT * FROM scenes WHERE id=?').get(sceneId))
  },

  updateEpisode(episodeId: string, patch: Partial<Episode>): Episode {
    const db = getDb()
    const cur = db.prepare('SELECT * FROM episodes WHERE id=?').get(episodeId)
    if (!cur) throw new Error('分集不存在')
    const c = toEpisode(cur)
    db.prepare('UPDATE episodes SET title=?, synopsis=? WHERE id=?').run(
      patch.title ?? c.title,
      patch.synopsis ?? c.synopsis,
      episodeId
    )
    return toEpisode(db.prepare('SELECT * FROM episodes WHERE id=?').get(episodeId))
  }
}
