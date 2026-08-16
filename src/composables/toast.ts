import { reactive } from 'vue'

export type ToastKind = 'info' | 'success' | 'error' | 'warning' | 'loading'

/** 可选的行动按钮（如「去配置」），点击后执行并自动关闭该 toast */
export interface ToastAction {
  label: string
  run: () => void
}

export interface ToastItem {
  id: number
  kind: ToastKind
  msg: string
  dismissible: boolean
  action?: ToastAction
}

const DURATION: Record<ToastKind, number> = {
  info: 3500,
  success: 3000,
  warning: 4500,
  error: 6500,
  loading: 0 // 不自动消失，需手动 update / dismiss
}

const state = reactive<{ items: ToastItem[] }>({ items: [] })
const timers = new Map<number, ReturnType<typeof setTimeout>>()
let seq = 0

function clearTimer(id: number): void {
  const t = timers.get(id)
  if (t) {
    clearTimeout(t)
    timers.delete(id)
  }
}

function arm(id: number, kind: ToastKind, duration?: number): void {
  clearTimer(id)
  const d = duration ?? DURATION[kind]
  if (d > 0) timers.set(id, setTimeout(() => dismiss(id), d))
}

function show(
  kind: ToastKind,
  msg: string,
  opts?: { dismissible?: boolean; action?: ToastAction; duration?: number }
): number {
  const id = ++seq
  state.items.push({
    id,
    kind,
    msg,
    dismissible: opts?.dismissible ?? kind !== 'loading',
    action: opts?.action
  })
  arm(id, kind, opts?.duration)
  // 最多保留 5 条
  if (state.items.length > 5) {
    const removed = state.items.shift()
    if (removed) clearTimer(removed.id)
  }
  return id
}

function update(id: number, patch: { kind?: ToastKind; msg?: string }): void {
  const item = state.items.find((t) => t.id === id)
  if (!item) return
  if (patch.kind) item.kind = patch.kind
  if (patch.msg !== undefined) item.msg = patch.msg
  if (patch.kind) {
    item.dismissible = patch.kind !== 'loading'
    arm(id, patch.kind)
  }
}

function dismiss(id: number): void {
  clearTimer(id)
  const i = state.items.findIndex((t) => t.id === id)
  if (i >= 0) state.items.splice(i, 1)
}

export const toast = {
  state,
  show,
  update,
  dismiss,
  info: (msg: string) => show('info', msg),
  success: (msg: string) => show('success', msg),
  warning: (msg: string) => show('warning', msg),
  error: (msg: string) => show('error', msg),
  loading: (msg: string) => show('loading', msg)
}
