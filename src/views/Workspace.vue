<script setup lang="ts">
import { onMounted, onUnmounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAppStore } from '../stores/app'
import { useTasksStore } from '../stores/tasks'
import { usePipelineStore } from '../stores/pipeline'
import TaskCenter from '../components/TaskCenter.vue'
import WindowControls from '../components/WindowControls.vue'
import logoUrl from '../asset/logo.png'

const route = useRoute()
const router = useRouter()
const app = useAppStore()
const tasks = useTasksStore()
const pipeline = usePipelineStore()
const { project } = storeToRefs(app)
const { runningCount, runningStages, drawerOpen, lastEvent } = storeToRefs(tasks)

const projectId = computed(() => route.params.projectId as string)

const NAV = [
  { name: 'overview', label: '概览', icon: '◳', step: '' },
  { name: 'script', label: '剧本', icon: '✎', step: '①' },
  { name: 'assets', label: '资源库', icon: '◈', step: '②' },
  { name: 'storyboard', label: '分镜板', icon: '▦', step: '③' },
  { name: 'clips', label: '视频碎片', icon: '►', step: '④' },
  { name: 'resources', label: '资源中心', icon: '❒', step: '' }
]

onMounted(async () => {
  await app.loadProject(projectId.value)
  await app.loadSettings()
  tasks.bind(projectId.value)
  pipeline.refresh(projectId.value)
})
onUnmounted(() => tasks.unbind())

// 任一生成完成后刷新管线就绪状态（自动解锁下一阶段）
watch(lastEvent, (e) => {
  if (e && e.status === 'success') pipeline.refresh(projectId.value)
})

function go(name: string): void {
  if (!pipeline.unlocked(name)) {
    app.notify(pipeline.lockReason(name), 'error')
    return
  }
  router.push({ name, params: { projectId: projectId.value } })
}
const isActive = (name: string): boolean => route.name === name
</script>

<template>
  <div class="ws">
    <aside class="side">
      <div class="side-top" @click="router.push('/')">
        <img class="logo-img" :src="logoUrl" alt="logo" />
        <div class="brand-min h-display">土豆AI短剧</div>
      </div>
      <nav class="nav">
        <button
          v-for="n in NAV"
          :key="n.name"
          class="nav-item"
          :class="{ active: isActive(n.name), locked: !pipeline.unlocked(n.name) }"
          :title="!pipeline.unlocked(n.name) ? pipeline.lockReason(n.name) : ''"
          @click="go(n.name)"
        >
          <span class="nav-icon">{{ n.icon }}</span>
          <span class="nav-label">{{ n.label }}</span>
          <span v-if="!pipeline.unlocked(n.name)" class="nav-lock" title="未解锁">⊘</span>
          <span v-else-if="runningStages.has(n.name)" class="nav-spin" title="生成中" />
          <span v-else-if="n.step" class="nav-step mono">{{ n.step }}</span>
        </button>
      </nav>
      <div class="side-foot">
        <button class="nav-item" @click="router.push('/settings')">
          <span class="nav-icon">⚙</span><span class="nav-label">全局设置</span>
        </button>
      </div>
    </aside>

    <div class="main">
      <header class="topbar app-dragbar">
        <div class="crumb">
          <span class="crumb-proj clickable" @click="router.push('/')">项目</span>
          <span class="sep">/</span>
          <span class="crumb-cur h-display">{{ project?.name || '…' }}</span>
        </div>
        <div class="top-actions">
          <button class="btn ghost" @click="drawerOpen = !drawerOpen">
            <span class="dot" :class="runningCount > 0 ? 'running' : 'queued'" />
            任务中心
            <span v-if="runningCount > 0" class="badge mono">{{ runningCount }}</span>
          </button>
          <WindowControls />
        </div>
      </header>

      <main class="content scroll">
        <router-view />
      </main>
    </div>

    <transition name="drawer-right">
      <TaskCenter v-if="drawerOpen" @close="drawerOpen = false" />
    </transition>
  </div>
</template>

<style scoped>
.ws {
  height: 100%;
  display: flex;
}
.side {
  width: 164px;
  background: var(--surface);
  border-right: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  position: relative;
}
.side-top {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 14px;
  cursor: pointer;
  border-bottom: 1px solid var(--line);
}
.logo-img {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  object-fit: cover;
  flex-shrink: 0;
}
.brand-min {
  font-size: 14px;
  line-height: 1.1;
}
.nav {
  flex: 1;
  padding: 8px 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  height: 38px;
  padding: 0 10px;
  background: transparent;
  border: 1px solid transparent;
  color: var(--dim);
  border-radius: var(--r-sm);
  cursor: pointer;
  font-size: 13px;
  text-align: left;
}
.nav-item:hover {
  background: var(--raised);
  color: var(--text);
}
.nav-item.active {
  background: var(--accent-soft);
  color: var(--accent);
  border-color: transparent;
  position: relative;
  font-weight: 600;
}
.nav-item.active::before {
  content: "";
  position: absolute;
  left: -1px;
  top: 7px;
  bottom: 7px;
  width: 3px;
  border-radius: 2px;
  background: var(--accent-grad);
}
.nav-item.active .nav-icon {
  opacity: 1;
}
.nav-icon {
  width: 16px;
  text-align: center;
  opacity: 0.85;
}
.nav-label {
  flex: 1;
}
.nav-step {
  font-size: 11px;
  color: var(--muted);
}
.nav-item.locked {
  opacity: 0.4;
  cursor: not-allowed;
}
.nav-item.locked:hover {
  background: transparent;
  color: var(--dim);
}
.nav-lock {
  font-size: 13px;
  color: var(--muted);
}
.nav-spin {
  width: 12px;
  height: 12px;
  border: 2px solid var(--line);
  border-top-color: var(--teal);
  border-radius: 50%;
  animation: navspin 0.7s linear infinite;
  flex-shrink: 0;
}
@keyframes navspin {
  to {
    transform: rotate(360deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .nav-spin {
    animation: none;
  }
}
.side-foot {
  padding: 8px;
  border-top: 1px solid var(--line);
}
.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.topbar {
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px 0 20px;
  border-bottom: 1px solid var(--line);
  background: var(--surface);
}
.top-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
.crumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}
.crumb-proj {
  color: var(--dim);
  cursor: pointer;
}
.sep {
  color: var(--muted);
}
.badge {
  background: var(--teal);
  color: var(--accent-on);
  border-radius: 10px;
  padding: 0 6px;
  font-size: 11px;
  font-weight: 600;
}
.content {
  flex: 1;
  min-height: 0;
}
</style>
