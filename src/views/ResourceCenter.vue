<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import type { ProjectMediaItem, MediaKind } from '@shared/ipc'
import { useTasksStore } from '../stores/tasks'
import { mediaUrl } from '../api/media'
import ImagePreview, { type PreviewItem } from '../components/ImagePreview.vue'

const route = useRoute()
const tasks = useTasksStore()
const { lastEvent } = storeToRefs(tasks)
const projectId = computed(() => route.params.projectId as string)

const items = ref<ProjectMediaItem[]>([])
const filter = ref<'all' | MediaKind>('all')

const TABS: { key: 'all' | MediaKind; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'assetImage', label: '设定图' },
  { key: 'shotImage', label: '分镜图' },
  { key: 'video', label: '视频碎片' }
]

async function load(): Promise<void> {
  items.value = await window.api.resource.media(projectId.value)
}
onMounted(load)

const filtered = computed(() =>
  filter.value === 'all' ? items.value : items.value.filter((i) => i.kind === filter.value)
)
const countOf = (k: 'all' | MediaKind): number =>
  k === 'all' ? items.value.length : items.value.filter((i) => i.kind === k).length

// 预览：把当前筛选结果做成可左右切换的画廊
const previewItems = computed<PreviewItem[]>(() =>
  filtered.value.map((m) => ({
    src: mediaUrl(m.filePath),
    filePath: m.filePath,
    type: m.kind === 'video' ? 'video' : 'image',
    title: m.label,
    sub: m.sub
  }))
)
const preview = ref<{ open: boolean; index: number }>({ open: false, index: 0 })
function openItem(i: number): void {
  preview.value = { open: true, index: i }
}

// 任一生成完成后自动刷新资源中心
watch(lastEvent, (e) => {
  if (e && e.status === 'success') load()
})
</script>

<template>
  <div class="rc">
    <div class="head">
      <h2 class="h-display page-title">资源中心 · LIBRARY</h2>
      <button class="btn ghost" @click="load">⟳ 刷新</button>
    </div>

    <div class="tabs">
      <button
        v-for="t in TABS"
        :key="t.key"
        class="tab"
        :class="{ active: filter === t.key }"
        @click="filter = t.key"
      >
        {{ t.label }}<span class="cnt mono">{{ countOf(t.key) }}</span>
      </button>
    </div>

    <div v-if="filtered.length === 0" class="empty card dim">
      还没有生成的媒体。去各阶段生成设定图 / 分镜图 / 视频后，这里会汇总，关掉再开也都在。
    </div>

    <transition-group v-else name="pop" tag="div" class="grid">
      <div v-for="(m, i) in filtered" :key="m.id" class="item card">
        <div class="media" @click="openItem(i)">
          <video v-if="m.kind === 'video'" :src="mediaUrl(m.filePath)" controls loop muted @click.stop />
          <img v-else :src="mediaUrl(m.filePath)" />
          <span v-if="m.isReference" class="badge ref">★ 参考</span>
          <span v-else-if="m.isSelected" class="badge sel">采用</span>
          <span class="zoom" title="放大预览" @click.stop="openItem(i)">⤢</span>
        </div>
        <div class="meta">
          <div class="m-label">{{ m.label }}</div>
          <div class="m-sub label">{{ m.sub }}</div>
        </div>
      </div>
    </transition-group>

    <ImagePreview
      :open="preview.open"
      :items="previewItems"
      :index="preview.index"
      @close="preview.open = false"
      @update:index="preview.index = $event"
    />
  </div>
</template>

<style scoped>
.rc {
  padding: 22px 26px;
}
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.page-title {
  font-size: 16px;
  letter-spacing: 0.08em;
  margin: 0;
}
.tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
  border-bottom: 1px solid var(--line);
}
.tab {
  background: transparent;
  border: none;
  color: var(--dim);
  padding: 8px 14px;
  cursor: pointer;
  font-size: 13px;
  border-bottom: 2px solid transparent;
}
.tab.active {
  color: var(--text);
  border-bottom-color: var(--accent);
}
.cnt {
  margin-left: 6px;
  font-size: 11px;
  color: var(--muted);
}
.empty {
  padding: 40px;
  text-align: center;
}
.dim {
  color: var(--dim);
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
}
.item {
  padding: 8px;
}
.media {
  position: relative;
  border-radius: var(--r-sm);
  overflow: hidden;
  background: var(--bg);
  aspect-ratio: 9/16;
  border: 1px solid var(--line);
  cursor: pointer;
}
.zoom {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 13px;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.16s ease;
}
.media:hover .zoom {
  opacity: 1;
}
.media img,
.media video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.badge {
  position: absolute;
  top: 5px;
  left: 5px;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 2px;
}
.badge.ref {
  background: var(--accent);
  color: var(--accent-on);
}
.badge.sel {
  background: var(--teal);
  color: var(--accent-on);
}
.meta {
  margin-top: 8px;
}
.m-label {
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.m-sub {
  margin-top: 2px;
}
.pop-enter-active {
  transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}
.pop-enter-from {
  opacity: 0;
  transform: translateY(10px) scale(0.97);
}
.pop-move {
  transition: transform 0.3s ease;
}
@media (prefers-reduced-motion: reduce) {
  .pop-enter-active,
  .pop-move {
    transition: none;
  }
}
</style>
