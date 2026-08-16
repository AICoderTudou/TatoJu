<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

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
  <div class="wc-group">
    <button class="wc" aria-label="最小化" @click="minimize">
      <svg viewBox="0 0 12 12" width="11" height="11">
        <line x1="2" y1="6" x2="10" y2="6" stroke="currentColor" stroke-width="1.3" />
      </svg>
    </button>
    <button class="wc" :aria-label="maximized ? '还原' : '最大化'" @click="toggleMax">
      <svg v-if="!maximized" viewBox="0 0 12 12" width="11" height="11">
        <rect x="2.3" y="2.3" width="7.4" height="7.4" fill="none" stroke="currentColor" stroke-width="1.2" />
      </svg>
      <svg v-else viewBox="0 0 12 12" width="11" height="11">
        <rect x="2" y="3.4" width="6.2" height="6.2" fill="none" stroke="currentColor" stroke-width="1.2" />
        <path d="M4 3.4 V2 H10 V8 H8.4" fill="none" stroke="currentColor" stroke-width="1.2" />
      </svg>
    </button>
    <button class="wc close" aria-label="关闭" @click="close">
      <svg viewBox="0 0 12 12" width="11" height="11">
        <line x1="2.5" y1="2.5" x2="9.5" y2="9.5" stroke="currentColor" stroke-width="1.3" />
        <line x1="9.5" y1="2.5" x2="2.5" y2="9.5" stroke="currentColor" stroke-width="1.3" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.wc-group {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-left: 6px;
}
.wc {
  width: 34px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--dim);
  cursor: pointer;
  border-radius: 7px;
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
  outline: 1px solid var(--accent);
  outline-offset: -2px;
}
</style>
