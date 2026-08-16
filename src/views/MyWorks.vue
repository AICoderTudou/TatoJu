<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import type { Project } from '@shared/types'
import { useAppStore } from '../stores/app'
import WindowControls from '../components/WindowControls.vue'
import NewProjectDialog from '../components/NewProjectDialog.vue'
import logoUrl from '../asset/logo.png'

const router = useRouter()
const app = useAppStore()
const projects = ref<Project[]>([])
const showCreate = ref(false)
const loading = ref(true)

async function load(): Promise<void> {
  loading.value = true
  try {
    projects.value = await window.api.project.list()
  } finally {
    loading.value = false
  }
}
onMounted(load)

async function remove(p: Project, e: Event): Promise<void> {
  e.stopPropagation()
  if (!(await app.confirm(`删除项目「${p.name}」？此操作不可恢复，将清除其全部剧本/资源/分镜/视频。`))) return
  await window.api.project.remove(p.id)
  load()
}

function open(p: Project): void {
  router.push(`/p/${p.id}`)
}

const fmt = (t: number): string => new Date(t).toLocaleString('zh-CN', { hour12: false })

function cover(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360
  const h2 = (h + 48) % 360
  return `linear-gradient(135deg, hsl(${h} 55% 22%), hsl(${h2} 60% 12%))`
}
</script>

<template>
  <div class="works">
    <header class="top app-dragbar">
      <div class="brand clickable" @click="router.push('/')">
        <img class="logo-img" :src="logoUrl" alt="logo" />
        <span class="brand-name h-display">土豆AI短剧</span>
      </div>
      <nav class="topnav">
        <span class="nav-link clickable" @click="router.push('/')">首页</span>
        <span class="nav-link clickable active">我的作品</span>
      </nav>
      <button class="btn ghost" @click="router.push('/settings')">⚙ 全局设置</button>
      <WindowControls />
    </header>

    <main class="body scroll">
      <div class="bar">
        <div class="bar-title h-display">我的作品<span class="bar-count">{{ projects.length }}</span></div>
        <button class="btn primary" @click="showCreate = true">＋ 新建项目</button>
      </div>

      <div v-if="loading" class="grid">
        <div v-for="n in 8" :key="n" class="proj skel">
          <div class="proj-cover skeleton" />
          <div class="proj-body">
            <div class="skeleton sk-line" />
            <div class="skeleton sk-line short" />
          </div>
        </div>
      </div>

      <div v-else-if="projects.length === 0" class="empty">
        <div class="empty-title h-display">暂无作品</div>
        <div class="empty-sub">点「新建项目」创建第一个作品，从剧本开启你的创作管线。</div>
        <button class="btn primary" style="margin-top: 16px" @click="showCreate = true">＋ 新建项目</button>
      </div>

      <div v-else class="grid">
        <div v-for="p in projects" :key="p.id" class="proj" @click="open(p)">
          <div class="proj-cover" :style="{ background: cover(p.id) }">
            <span class="proj-badge">{{ p.genreDefault || '短剧' }}</span>
            <button class="proj-del" title="删除" @click="remove(p, $event)">✕</button>
            <span class="proj-initial h-display">{{ (p.name || '剧').slice(0, 1) }}</span>
          </div>
          <div class="proj-body">
            <div class="proj-name h-display">{{ p.name }}</div>
            <div class="proj-meta">
              <span class="tag mono">{{ p.aspectRatio }}</span>
              <span class="proj-time">{{ fmt(p.updatedAt) }}</span>
            </div>
          </div>
        </div>
      </div>
    </main>

    <NewProjectDialog :open="showCreate" @close="showCreate = false" />
  </div>
</template>

<style scoped>
.works {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.top {
  display: flex;
  align-items: center;
  gap: 28px;
  padding: 12px 12px 12px 28px;
  border-bottom: 1px solid var(--line);
  background: var(--surface);
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}
.logo-img {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  object-fit: cover;
}
.brand-name {
  font-size: 16px;
}
.topnav {
  display: flex;
  gap: 22px;
  flex: 1;
}
.nav-link {
  font-size: 14px;
  color: var(--dim);
  cursor: pointer;
  position: relative;
  padding: 4px 0;
}
.nav-link:hover {
  color: var(--text);
}
.nav-link.active {
  color: var(--text);
  font-weight: 600;
}
.nav-link.active::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: -2px;
  height: 2px;
  border-radius: 2px;
  background: var(--accent-grad);
}
.body {
  flex: 1;
  padding: 24px 28px;
}
.bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.bar-title {
  font-size: 18px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.bar-count {
  font-size: 12px;
  color: var(--accent);
  background: var(--accent-soft);
  border-radius: 999px;
  padding: 1px 9px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}
.proj {
  cursor: pointer;
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  overflow: hidden;
  background: var(--panel);
  transition: border-color 0.16s ease, transform 0.16s ease, box-shadow 0.16s ease;
}
.proj:hover {
  border-color: var(--accent);
  transform: translateY(-3px);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.45);
}
.proj.skel {
  cursor: default;
  pointer-events: none;
}
.proj.skel:hover {
  border-color: var(--line);
  transform: none;
  box-shadow: none;
}
.proj.skel .proj-cover {
  aspect-ratio: 16 / 10;
}
.sk-line {
  height: 12px;
  margin-bottom: 8px;
}
.sk-line.short {
  width: 50%;
}
.proj-cover {
  position: relative;
  aspect-ratio: 16 / 10;
  display: flex;
  align-items: center;
  justify-content: center;
}
.proj-initial {
  font-size: 46px;
  color: rgba(255, 255, 255, 0.16);
}
.proj-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  font-size: 11px;
  padding: 2px 9px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.45);
  color: var(--text);
  backdrop-filter: blur(4px);
}
.proj-del {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: none;
  background: rgba(0, 0, 0, 0.45);
  color: var(--dim);
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.14s ease, color 0.14s ease, background 0.14s ease;
}
.proj:hover .proj-del {
  opacity: 1;
}
.proj-del:hover {
  background: var(--st-failed);
  color: #fff;
}
.proj-body {
  padding: 12px 14px;
}
.proj-name {
  font-size: 15px;
  margin-bottom: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.proj-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.proj-time {
  font-size: 11px;
  color: var(--muted);
}
.empty {
  text-align: center;
  padding: 60px 0;
  border: 1px dashed var(--line);
  border-radius: var(--r-md);
}
.empty-title {
  font-size: 18px;
  margin-bottom: 8px;
}
.empty-sub {
  color: var(--dim);
}
</style>
