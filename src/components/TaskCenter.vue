<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useTasksStore } from '../stores/tasks'

const tasks = useTasksStore()
const { generations } = storeToRefs(tasks)
defineEmits<{ close: [] }>()

const kindLabel: Record<string, string> = { image: '图', video: '视频', llm: '文本' }
const statusLabel: Record<string, string> = {
  queued: '排队中',
  running: '生成中',
  success: '成功',
  failed: '失败',
  canceled: '已取消'
}
const fmt = (t: number): string => new Date(t).toLocaleTimeString('zh-CN', { hour12: false })
function dur(g: { createdAt: number; updatedAt: number }): string {
  const s = Math.max(0, Math.round((g.updatedAt - g.createdAt) / 1000))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}
</script>

<template>
  <div class="mask" @click.self="$emit('close')">
    <aside class="drawer panel">
      <header class="dh">
        <div class="h-display">任务中心 · TASKS</div>
        <button class="btn ghost sm" @click="$emit('close')">✕</button>
      </header>
      <div class="dbody scroll">
        <div v-if="generations.length === 0" class="empty label">暂无生成任务</div>
        <table v-else class="t">
          <thead>
            <tr>
              <th>类型</th>
              <th>Provider</th>
              <th>状态</th>
              <th>耗时</th>
              <th>时间</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="g in generations" :key="g.id">
              <td><span class="tag">{{ kindLabel[g.kind] || g.kind }}</span></td>
              <td class="mono dim">{{ g.provider }}</td>
              <td>
                <span class="dot" :class="g.status" />
                <span class="st">{{ statusLabel[g.status] || g.status }}</span>
                <div v-if="g.error" class="err" :title="g.error">{{ g.error }}</div>
              </td>
              <td class="mono">{{ dur(g) }}</td>
              <td class="mono dim">{{ fmt(g.createdAt) }}</td>
              <td class="ops">
                <button
                  v-if="g.status === 'failed'"
                  class="btn sm"
                  @click="tasks.retry(g.id)"
                >
                  重试
                </button>
                <button
                  v-if="g.status === 'running' || g.status === 'queued'"
                  class="btn sm danger"
                  @click="tasks.cancel(g.id)"
                >
                  取消
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 300;
  display: flex;
  justify-content: flex-end;
}
.drawer {
  width: 560px;
  max-width: 90vw;
  height: 100%;
  border-radius: 0;
  border-right: none;
  border-top: none;
  border-bottom: none;
  display: flex;
  flex-direction: column;
}
.dh {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid var(--line);
}
.dbody {
  flex: 1;
  padding: 8px 12px;
}
.empty {
  padding: 40px;
  text-align: center;
}
.t {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.t th {
  text-align: left;
  color: var(--muted);
  font-weight: 400;
  font-family: var(--font-display);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-size: 10px;
  padding: 6px 8px;
  border-bottom: 1px solid var(--line);
}
.t td {
  padding: 8px;
  border-bottom: 1px solid var(--hair);
  vertical-align: top;
}
.st {
  margin-left: 6px;
}
.dim {
  color: var(--dim);
}
.err {
  color: var(--st-failed);
  font-size: 11px;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ops {
  text-align: right;
}
</style>
