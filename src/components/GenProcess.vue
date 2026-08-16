<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useTasksStore } from '../stores/tasks'

const tasks = useTasksStore()
const { streams } = storeToRefs(tasks)
const collapsed = ref(false)

// 计时用：每 500ms tick 一次
const nowTick = ref(Date.now())
let timer: ReturnType<typeof setInterval> | null = null
onMounted(() => (timer = setInterval(() => (nowTick.value = Date.now()), 500)))
onUnmounted(() => timer && clearInterval(timer))

const list = computed(() =>
  Object.entries(streams.value).map(([id, s]) => ({ id, ...s }))
)

function elapsed(startedAt: number): string {
  const sec = Math.max(0, Math.floor((nowTick.value - startedAt) / 1000))
  return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`
}
</script>

<template>
  <div v-if="list.length" class="gp">
    <div class="gp-head" @click="collapsed = !collapsed">
      <span class="dot running" />
      <span class="gp-title h-display">生成过程</span>
      <span class="gp-count mono">{{ list.length }}</span>
      <span class="gp-toggle">{{ collapsed ? '▴' : '▾' }}</span>
    </div>
    <transition-group v-if="!collapsed" name="gp-item" tag="div" class="gp-body">
      <div v-for="s in list" :key="s.id" class="gp-card">
        <div class="gp-meta">
          <span class="gp-label">{{ s.label }}</span>
          <span class="spacer" />
          <span class="mono gp-stat">{{ s.done ? '完成 ✓' : elapsed(s.startedAt) }}</span>
          <span class="mono gp-stat">{{ s.chars }} 字</span>
        </div>
        <div class="gp-preview mono">
          <pre>{{ s.preview || '思考中…' }}</pre>
          <span v-if="!s.done" class="caret">▋</span>
        </div>
      </div>
    </transition-group>
  </div>
</template>

<style scoped>
.gp {
  position: fixed;
  left: 16px;
  bottom: 16px;
  width: 360px;
  max-width: 40vw;
  z-index: 11000;
  background: var(--panel);
  border: 1px solid var(--line);
  border-left: 3px solid var(--teal);
  border-radius: var(--r-md);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.55);
  overflow: hidden;
}
.gp-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  cursor: pointer;
  border-bottom: 1px solid var(--hair);
  user-select: none;
}
.gp-title {
  font-size: 12px;
  letter-spacing: 0.08em;
}
.gp-count {
  background: var(--teal);
  color: var(--accent-on);
  border-radius: 9px;
  padding: 0 6px;
  font-size: 11px;
}
.gp-toggle {
  margin-left: auto;
  color: var(--dim);
}
.gp-body {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 46vh;
  overflow: auto;
}
.gp-card {
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  padding: 8px 9px;
}
.gp-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.gp-label {
  font-size: 12px;
  color: var(--accent);
}
.spacer {
  flex: 1;
}
.gp-stat {
  font-size: 11px;
  color: var(--dim);
}
.gp-preview {
  position: relative;
  height: 116px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  overflow: hidden;
  background: #07090b;
  border-radius: 2px;
  padding: 6px 8px;
}
.gp-preview pre {
  margin: 0;
  font-size: 11px;
  line-height: 1.5;
  color: var(--dim);
  white-space: pre-wrap;
  word-break: break-all;
}
.caret {
  position: absolute;
  right: 8px;
  bottom: 6px;
  color: var(--teal);
  animation: blink 1s steps(2, start) infinite;
}
@keyframes blink {
  to {
    opacity: 0;
  }
}
.gp-item-enter-active {
  transition: opacity 0.25s ease, transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}
.gp-item-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.gp-item-enter-from,
.gp-item-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
@media (prefers-reduced-motion: reduce) {
  .caret,
  .gp-item-enter-active,
  .gp-item-leave-active {
    animation: none;
    transition: none;
  }
}
</style>
