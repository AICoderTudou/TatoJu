import type { Project, StyleBible } from '@shared/types'
import { getDb } from '../db/client'
import { toProject } from '../db/mappers'
import { id, now } from '../util/id'
import { removeProjectDir } from '../files/fileStore'
import { getLLM } from '../providers/registry'
import { getSettings } from '../secrets/store'
import { trackLlm } from '../tasks/track'
import { STYLE_BIBLE_SYSTEM_PROMPT } from '@shared/seedance'

// 把任意值拍平成可读字符串（模型可能把字段返回成嵌套对象/数组）
function toStr(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'string') return v
  if (Array.isArray(v)) return v.map(toStr).filter(Boolean).join('，')
  if (typeof v === 'object') {
    return Object.entries(v as Record<string, unknown>)
      .map(([k, val]) => `${k}：${toStr(val)}`)
      .filter(Boolean)
      .join('；')
  }
  return String(v)
}

export const projectService = {
  create(input: { name: string; genreDefault?: string; aspectRatio?: string }): Project {
    const pid = id('proj')
    const t = now()
    getDb()
      .prepare(
        'INSERT INTO projects (id,name,genre_default,aspect_ratio,created_at,updated_at) VALUES (?,?,?,?,?,?)'
      )
      .run(pid, input.name, input.genreDefault ?? null, input.aspectRatio ?? '9:16', t, t)
    return this.get(pid)!
  },

  list(): Project[] {
    return getDb()
      .prepare('SELECT * FROM projects ORDER BY updated_at DESC')
      .all()
      .map(toProject)
  },

  get(pid: string): Project | null {
    const r = getDb().prepare('SELECT * FROM projects WHERE id=?').get(pid)
    return r ? toProject(r) : null
  },

  update(pid: string, patch: Partial<Pick<Project, 'name' | 'genreDefault' | 'aspectRatio'>>): Project {
    const cur = this.get(pid)
    if (!cur) throw new Error('项目不存在')
    getDb()
      .prepare('UPDATE projects SET name=?, genre_default=?, aspect_ratio=?, updated_at=? WHERE id=?')
      .run(
        patch.name ?? cur.name,
        patch.genreDefault ?? cur.genreDefault,
        patch.aspectRatio ?? cur.aspectRatio,
        now(),
        pid
      )
    return this.get(pid)!
  },

  async remove(pid: string): Promise<{ ok: true }> {
    getDb().prepare('DELETE FROM projects WHERE id=?').run(pid)
    await removeProjectDir(pid)
    return { ok: true }
  },

  touch(pid: string): void {
    getDb().prepare('UPDATE projects SET updated_at=? WHERE id=?').run(now(), pid)
  },

  // 生成风格圣经（参考影片/关键词 → 6 区块影像标准），存项目并返回
  async genStyleBible(pid: string, ref: string): Promise<Project> {
    const proj = this.get(pid)
    if (!proj) throw new Error('项目不存在')
    const userText = [
      `短剧题材：${proj.genreDefault ?? '未指定'}`,
      `参考影片 / 视觉关键词：${ref || '（未指定，请据题材合理定调）'}`
    ].join('\n')
    return trackLlm(
      { projectId: pid, label: '风格圣经', model: getSettings().llmModel },
      async ({ onChunk }) => {
        const res = await getLLM().chat({
          system: STYLE_BIBLE_SYSTEM_PROMPT,
          messages: [{ role: 'user', text: userText }],
          json: true,
          task: 'style.bible',
          stream: true,
          onChunk
        })
        const raw = (res.json && typeof res.json === 'object' ? res.json : {}) as Record<string, unknown>
        const bible: StyleBible = {
          reference: toStr(raw.reference) || ref,
          visualStyle: toStr(raw.visualStyle),
          colorGrading: toStr(raw.colorGrading),
          lighting: toStr(raw.lighting),
          cameraLanguage: toStr(raw.cameraLanguage),
          postTexture: toStr(raw.postTexture),
          rhythmEditing: toStr(raw.rhythmEditing)
        }
        getDb()
          .prepare('UPDATE projects SET style_ref=?, style_bible=?, updated_at=? WHERE id=?')
          .run(ref, JSON.stringify(bible), now(), pid)
        return this.get(pid)!
      }
    )
  },

  // 手动编辑保存风格圣经
  saveStyleBible(pid: string, bible: StyleBible, ref?: string): Project {
    const cur = this.get(pid)
    if (!cur) throw new Error('项目不存在')
    getDb()
      .prepare('UPDATE projects SET style_ref=?, style_bible=?, updated_at=? WHERE id=?')
      .run(ref ?? cur.styleRef, JSON.stringify(bible), now(), pid)
    return this.get(pid)!
  },

  // 注入下游生图/视频提示词的风格圣经文本（无则空串）
  styleBibleText(pid: string): string {
    const proj = this.get(pid)
    if (!proj?.styleBible) return ''
    let b: StyleBible
    try {
      b = JSON.parse(proj.styleBible)
    } catch {
      return ''
    }
    const lines = [
      b.visualStyle && `视觉风格：${b.visualStyle}`,
      b.colorGrading && `调色：${b.colorGrading}`,
      b.lighting && `灯光：${b.lighting}`,
      b.cameraLanguage && `镜头语言：${b.cameraLanguage}`,
      b.postTexture && `后期质感：${b.postTexture}`,
      b.rhythmEditing && `节奏剪辑：${b.rhythmEditing}`
    ].filter(Boolean)
    if (!lines.length) return ''
    return `【全片风格圣经（所有画面/视频须严格遵循其影调、光色、镜头、质感）】\n${lines.join('\n')}`
  }
}
