import type { GenProgressEvent, GenStreamEvent } from '@shared/types'
import { getDb } from '../db/client'
import { id, now } from '../util/id'
import { emitProgress } from './taskRunner'

let streamEmit: (evt: GenStreamEvent) => void = () => {}
export function setLlmStreamEmitter(fn: (evt: GenStreamEvent) => void): void {
  streamEmit = fn
}

export interface LlmTaskCtx {
  generationId: string
  /** 流式增量回调：传入"累计全文" */
  onChunk: (fullText: string) => void
}

// 把一次"耗时 LLM 操作"登记成 generations 行（kind='llm'），让任务中心能看到 进行中/成功/失败，
// 且持久化（关掉再开仍在）。同时把流式增量通过 gen:stream 推给渲染进程，做"实时生成过程"浮层。
export async function trackLlm<T>(
  opts: {
    projectId: string | null
    label: string
    provider?: string
    model?: string
    refKind?: string
    refId?: string
  },
  fn: (ctx: LlmTaskCtx) => Promise<T>
): Promise<T> {
  const gid = id('gen')
  const t = now()
  getDb()
    .prepare(
      'INSERT INTO generations (id,project_id,kind,provider,model,params,seed,external_task_id,status,inputs,output_paths,error,cost,ref_kind,ref_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
    )
    .run(
      gid,
      opts.projectId,
      'llm',
      opts.provider ?? 'qwen',
      opts.model ?? null,
      JSON.stringify({ label: opts.label }),
      null,
      null,
      'running',
      null,
      null,
      null,
      null,
      opts.refKind ?? null,
      opts.refId ?? null,
      t,
      t
    )
  const base: GenProgressEvent = {
    generationId: gid,
    status: 'running',
    kind: 'llm',
    refKind: opts.refKind,
    refId: opts.refId
  }
  emitProgress(base)

  // 流式增量节流推送（避免 IPC 洪泛）
  let lastEmit = 0
  let lastChars = 0
  const onChunk = (full: string): void => {
    lastChars = full.length
    const ts = Date.now()
    if (ts - lastEmit < 120) return
    lastEmit = ts
    streamEmit({ generationId: gid, label: opts.label, chars: full.length, preview: full.slice(-500) })
  }

  try {
    const r = await fn({ generationId: gid, onChunk })
    streamEmit({ generationId: gid, label: opts.label, chars: lastChars, preview: '', done: true })
    getDb().prepare('UPDATE generations SET status=?, updated_at=? WHERE id=?').run('success', now(), gid)
    emitProgress({ ...base, status: 'success' })
    return r
  } catch (e) {
    const msg = (e as Error).message
    streamEmit({ generationId: gid, label: opts.label, chars: lastChars, preview: '', done: true })
    getDb()
      .prepare('UPDATE generations SET status=?, error=?, updated_at=? WHERE id=?')
      .run('failed', msg, now(), gid)
    emitProgress({ ...base, status: 'failed', error: msg })
    throw e
  }
}
