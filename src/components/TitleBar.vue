<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import logoUrl from '../asset/logo.png'

const maximized = ref(false)
let unsub: (() => void) | null = null

onMounted(async () => {
  maximized.value = await window.api.win.isMaximized()
  unsub = window.api.win.onMaximizeChange((m) => (maximized.value = m))
})
onUnmounted(() => unsub?.())

const minimize = (): Promise<void> => window.api.win.minimize()
const close = (): Promise<void> => window.api.win.close()
async function toggleMax(): Promise<void> {
  maximized.value = await window.api.win.toggleMaximize()
}
</script>

<template>
  <div class="titlebar">
    <div class="tb-left">
      <img class="logo-img" :src="logoUrl" alt="logo" />
      <span class="tb-title h-display">土豆AI短剧 <span class="tb-sub">POTATO AI</span></span>
    </div>

    <div class="tb-drag" />

    <div class="tb-controls">
      <button class="wc" aria-label="最小化" @click="minimize">
        <svg viewBox="0 0 12 12" width="12" height="12">
          <line x1="2" y1="6" x2="10" y2="6" stroke="currentColor" stroke-width="1.2" />
        </svg>
      </button>
      <button class="wc" :aria-label="maximized ? '还原' : '最大化'" @click="toggleMax">
        <svg v-if="!maximized" viewBox="0 0 12 12" width="12" height="12">
          <rect x="2.2" y="2.2" width="7.6" height="7.6" fill="none" stroke="currentColor" stroke-width="1.1" />
        </svg>
        <svg v-else viewBox="0 0 12 12" width="12" height="12">
          <rect x="2" y="3.4" width="6.2" height="6.2" fill="none" stroke="currentColor" stroke-width="1.1" />
          <path d="M4 3.4 V2 H10 V8 H8.4" fill="none" stroke="currentColor" stroke-width="1.1" />
        </svg>
      </button>
      <button class="wc close" aria-label="关闭" @click="close">
        <svg viewBox="0 0 12 12" width="12" height="12">
          <line x1="2.5" y1="2.5" x2="9.5" y2="9.5" stroke="currentColor" stroke-width="1.2" />
          <line x1="9.5" y1="2.5" x2="2.5" y2="9.5" stroke="currentColor" stroke-width="1.2" />
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.titlebar {
  height: 34px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  background: var(--bg);
  border-bottom: 1px solid var(--line);
  -webkit-app-region: drag;
  user-select: none;
}
.tb-left {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 0 12px;
  height: 100%;
}
.logo-img {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  object-fit: cover;
  display: block;
}
.tb-title {
  font-size: 12.5px;
  color: var(--text);
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}
.tb-sub {
  font-size: 10px;
  letter-spacing: 0.12em;
  color: var(--muted);
  font-weight: 400;
}
.tb-drag {
  flex: 1;
  height: 100%;
}
.tb-controls {
  display: flex;
  height: 100%;
  -webkit-app-region: no-drag;
}
.wc {
  width: 46px;
  height: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--dim);
  cursor: pointer;
  transition: background 0.14s ease, color 0.14s ease;
}
.wc:hover {
  background: var(--raised);
  color: var(--text);
}
.wc.close:hover {
  background: var(--st-failed);
  color: #fff;
}
.wc:focus-visible {
  outline: 1px solid var(--st-warning);
  outline-offset: -2px;
}
</style>
