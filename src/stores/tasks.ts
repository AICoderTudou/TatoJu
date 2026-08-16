import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Generation, GenProgressEvent } from '@shared/types'

export interface StreamState {
  label: string
  chars: number
  preview: string
  startedAt: number
  done: boolean
}

export const useTasksStore = defineStore('tasks', () => {
  const generations = ref<Generation[]>([])
  const lastEvent = ref<GenProgressEvent | null>(null)
  const drawerOpen = ref(false)
  // 正在进行的 LLM 流式过程：generationId -> 实时状态
  const streams = ref<Record<string, StreamState>>({})
  let unsubs: (() => void)[] = []
  let currentProject = ''

  const runningCount = computed(
    () => generations.value.filter((g) => g.status === 'running' || g.status === 'queued').length
  )

  // 把一条生成记录映射到对应的管线阶段（与路由 name 一致），用于侧栏阶段指示灯
  function stageOf(g: Generation): string | null {
    if (g.kind === 'video') return 'clips'
    if (g.kind === 'image') return g.refKind === 'asset' ? 'assets' : 'storyboard'
    if (g.kind === 'llm') {
      let label = ''
      try {
        label = (JSON.parse(g.params || '{}').label as string) || ''
      } catch {
        /* ignore */
      }
      if (label.includes('剧本')) return 'script'
      if (label.includes('资源')) return 'assets'
      if (label.includes('分镜')) return 'storyboard'
      if (label.includes('视频')) return 'clips'
    }
    return null
  }

  // 当前正在运行/排队的阶段集合
  const runningStages = computed(() => {
    const s = new Set<string>()
    for (const g of generations.value) {
      if (g.status === 'running' || g.status === 'queued') {
        const st = stageOf(g)
        if (st) s.add(st)
      }
    }
    return s
  })

  async function refresh(projectId: string): Promise<void> {
    currentProject = projectId
    generations.value = await window.api.gen.list(projectId)
  }

  // 取某对象最近一条生成记录（generations 已按 created_at DESC）；用于派生失败/生成中态与重试
  function latestGen(refKind: string, refId: string, kind?: Generation['kind']): Generation | null {
    return (
      generations.value.find(
        (g) => g.refKind === refKind && g.refId === refId && (!kind || g.kind === kind)
      ) ?? null
    )
  }

  function removeStream(id: string): void {
    const m = { ...streams.value }
    delete m[id]
    streams.value = m
  }

  function bind(projectId: string): void {
    currentProject = projectId
    refresh(projectId)
    if (unsubs.length) return
    unsubs.push(
      window.api.gen.onProgress((evt) => {
        lastEvent.value = evt
        // 任务终态时清掉对应的流式过程
        if (evt.status === 'success' || evt.status === 'failed' || evt.status === 'canceled') {
          setTimeout(() => removeStream(evt.generationId), 800)
        }
        if (currentProject) refresh(currentProject)
      })
    )
    unsubs.push(
      window.api.gen.onStream((evt) => {
        const cur: StreamState = streams.value[evt.generationId] ?? {
          label: evt.label,
          chars: 0,
          preview: '',
          startedAt: Date.now(),
          done: false
        }
        cur.label = evt.label
        cur.chars = evt.chars
        if (evt.preview) cur.preview = evt.preview
        cur.done = !!evt.done
        streams.value = { ...streams.value, [evt.generationId]: cur }
        if (evt.done) setTimeout(() => removeStream(evt.generationId), 1200)
      })
    )
  }

  function unbind(): void {
    unsubs.forEach((u) => u())
    unsubs = []
  }

  async function retry(id: string): Promise<void> {
    await window.api.gen.retry(id)
    if (currentProject) refresh(currentProject)
  }
  async function cancel(id: string): Promise<void> {
    await window.api.gen.cancel(id)
    if (currentProject) refresh(currentProject)
  }

  return {
    generations,
    lastEvent,
    drawerOpen,
    streams,
    runningCount,
    runningStages,
    refresh,
    latestGen,
    bind,
    unbind,
    retry,
    cancel
  }
})
