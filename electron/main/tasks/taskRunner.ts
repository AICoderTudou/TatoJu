import type {
  GenKind,
  GenStatus,
  GenProgressEvent,
  ImageProvider,
  VideoProvider,
  ImageGenRequest,
  VideoGenRequest
} from '@shared/types'
import { getDb } from '../db/client'
import { saveFromUrl } from '../files/fileStore'
import { now } from '../util/id'
import { log } from '../util/log'

export interface GenJob {
  generationId: string
  projectId: string | null
  kind: Extract<GenKind, 'image' | 'video'>
  refKind?: string
  refId?: string
  provider: ImageProvider | VideoProvider
  request: ImageGenRequest | VideoGenRequest
  destDir: string
  baseName: string
  fallbackExt: string
  /** 成功后持久化：把落盘的相对路径写进对应明细表（同步） */
  persist: (relPaths: string[]) => void
}

type Emitter = (evt: GenProgressEvent) => void
let emit: Emitter = () => {}
export function setProgressEmitter(fn: Emitter): void {
  emit = fn
}
/** 供非 TaskRunner 路径（如 LLM 同步任务）推送进度 */
export function emitProgress(evt: GenProgressEvent): void {
  emit(evt)
}

const POLL_START = 2000
const POLL_MAX = 10000
const TOTAL_TIMEOUT = 8 * 60 * 1000

class TaskRunner {
  private maxConcurrency = 2
  private running = 0
  private queue: GenJob[] = []
  private canceled = new Set<string>()

  setConcurrency(n: number): void {
    this.maxConcurrency = Math.max(1, n || 1)
    this.pump()
  }

  enqueue(job: GenJob): void {
    this.queue.push(job)
    this.setGenStatus(job.generationId, 'queued')
    this.fire(job, 'queued')
    this.pump()
  }

  cancel(generationId: string): void {
    this.canceled.add(generationId)
    this.queue = this.queue.filter((j) => j.generationId !== generationId)
    this.setGenStatus(generationId, 'canceled')
    this.fireRaw({ generationId, status: 'canceled', kind: 'image' })
  }

  private pump(): void {
    while (this.running < this.maxConcurrency && this.queue.length > 0) {
      const job = this.queue.shift()!
      if (this.canceled.has(job.generationId)) continue
      this.running++
      this.run(job)
        .catch((e) => log.error('任务异常', e))
        .finally(() => {
          this.running--
          this.pump()
        })
    }
  }

  private async run(job: GenJob): Promise<void> {
    const { generationId } = job
    try {
      this.setGenStatus(generationId, 'running')
      this.fire(job, 'running')
      const { externalTaskId } = await job.provider.submit(job.request as any)
      this.setExternalId(generationId, externalTaskId)
      if (this.canceled.has(generationId)) return

      const result = await this.pollUntilDone(job, externalTaskId)
      if (this.canceled.has(generationId)) return

      if (result.status === 'success') {
        const urls = result.outputUrls ?? []
        const relPaths: string[] = []
        for (let i = 0; i < urls.length; i++) {
          const rel = await saveFromUrl(
            urls[i],
            job.destDir,
            `${job.baseName}_${i}`,
            job.fallbackExt
          )
          relPaths.push(rel)
        }
        this.setGenDone(generationId, relPaths)
        job.persist(relPaths)
        this.fire(job, 'success')
      } else {
        this.setGenFailed(generationId, result.error ?? '生成失败')
        this.fire(job, 'failed', result.error)
      }
    } catch (e) {
      const msg = (e as Error).message
      this.setGenFailed(generationId, msg)
      this.fire(job, 'failed', msg)
    }
  }

  private async pollUntilDone(
    job: GenJob,
    externalTaskId: string
  ): Promise<{ status: GenStatus; outputUrls?: string[]; error?: string }> {
    const start = Date.now()
    let interval = POLL_START
    // 立即查一次（mock 同步即成功）
    for (;;) {
      if (this.canceled.has(job.generationId)) return { status: 'canceled' }
      const r = await job.provider.poll(externalTaskId)
      if (r.status === 'success' || r.status === 'failed' || r.status === 'canceled') return r
      if (Date.now() - start > TOTAL_TIMEOUT) return { status: 'failed', error: '生成超时' }
      if (r.progress !== undefined) this.fireRaw({ ...this.evt(job, 'running'), progress: r.progress })
      await sleep(interval)
      interval = Math.min(Math.round(interval * 1.5), POLL_MAX)
    }
  }

  // ---- DB 写入（better-sqlite3 同步） ----
  private setGenStatus(id: string, status: GenStatus): void {
    getDb().prepare('UPDATE generations SET status=?, updated_at=? WHERE id=?').run(status, now(), id)
  }
  private setExternalId(id: string, ext: string): void {
    getDb()
      .prepare('UPDATE generations SET external_task_id=?, status=?, updated_at=? WHERE id=?')
      .run(ext, 'running', now(), id)
  }
  private setGenDone(id: string, relPaths: string[]): void {
    getDb()
      .prepare('UPDATE generations SET status=?, output_paths=?, updated_at=? WHERE id=?')
      .run('success', JSON.stringify(relPaths), now(), id)
  }
  private setGenFailed(id: string, error: string): void {
    getDb()
      .prepare('UPDATE generations SET status=?, error=?, updated_at=? WHERE id=?')
      .run('failed', error, now(), id)
  }

  // ---- 进度推送 ----
  private evt(job: GenJob, status: GenStatus): GenProgressEvent {
    return { generationId: job.generationId, status, kind: job.kind, refKind: job.refKind, refId: job.refId }
  }
  private fire(job: GenJob, status: GenStatus, error?: string): void {
    emit({ ...this.evt(job, status), error })
  }
  private fireRaw(evt: GenProgressEvent): void {
    emit(evt)
  }
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

export const taskRunner = new TaskRunner()
