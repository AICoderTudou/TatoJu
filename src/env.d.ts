/// <reference types="vite/client" />
import type { Api } from '@shared/ipc'

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare global {
  interface Window {
    api: Api
  }
}

export {}
