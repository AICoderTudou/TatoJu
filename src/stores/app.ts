import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Project, AppSettings } from '@shared/types'
import { toast, type ToastKind } from '../composables/toast'

interface ConfirmState {
  msg: string
  resolve: (ok: boolean) => void
}

export const useAppStore = defineStore('app', () => {
  const project = ref<Project | null>(null)
  const settings = ref<AppSettings | null>(null)
  const confirmState = ref<ConfirmState | null>(null)

  // 自前端确认框，替代原生 window.confirm —— 原生 confirm 会让 Electron 窗口
  // 丢失键盘焦点，导致随后的输入框（如新建项目名）无法输入。
  function confirm(msg: string): Promise<boolean> {
    return new Promise((resolve) => {
      confirmState.value = {
        msg,
        resolve: (ok) => {
          confirmState.value = null
          resolve(ok)
        }
      }
    })
  }

  async function loadProject(id: string): Promise<void> {
    project.value = await window.api.project.get(id)
  }
  async function loadSettings(): Promise<void> {
    settings.value = await window.api.settings.get()
  }
  function notify(msg: string, kind: ToastKind = 'info'): number {
    return toast.show(kind, msg)
  }
  const updateToast = (id: number, patch: { kind?: ToastKind; msg?: string }): void =>
    toast.update(id, patch)
  const dismissToast = (id: number): void => toast.dismiss(id)

  return {
    project,
    settings,
    confirmState,
    confirm,
    loadProject,
    loadSettings,
    notify,
    updateToast,
    dismissToast
  }
})
