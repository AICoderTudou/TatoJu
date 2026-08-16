<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from 'vue'
import type { FileScope } from '@shared/ipc'
import { toast } from '../composables/toast'

export interface PreviewItem {
  src: string
  type?: 'image' | 'video'
  title?: string
  sub?: string
  filePath?: string
  scope?: FileScope
}

const props = withDefaults(defineProps<{ open: boolean; items: PreviewItem[]; index?: number }>(), {
  index: 0
})
const emit = defineEmits<{ close: []; 'update:index': [number] }>()

const current = computed(() => props.items[props.index] ?? null)
const multiple = computed(() => props.items.length > 1)
const saving = ref(false)

function close(): void {
  emit('close')
}
function go(delta: number): void {
  const n = props.items.length
  if (!n) return
  emit('update:index', (props.index + delta + n) % n)
}
async function download(): Promise<void> {
  if (!current.value?.filePath || saving.value) return
  saving.value = true
  try {
    const typeName = current.value.type === 'video' ? '视频' : '图片'
    const result = await window.api.saveFile(
      current.value.filePath,
      current.value.title || `生成${typeName}`,
      current.value.scope
    )
    if (!result.canceled) toast.success(`已保存到：${result.filePath}`)
  } catch (err) {
    toast.error(`下载失败：${(err as Error).message}`)
  } finally {
    saving.value = false
  }
}
function onKey(e: KeyboardEvent): void {
  if (!props.open) return
  if (e.key === 'Escape') close()
  else if (e.key === 'ArrowLeft') go(-1)
  else if (e.key === 'ArrowRight') go(1)
}
watch(
  () => props.open,
  (o) => {
    if (o) window.addEventListener('keydown', onKey)
    else window.removeEventListener('keydown', onKey)
  }
)
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <transition name="zoom-fade">
      <div v-if="open && current" class="ip-mask" @click.self="close">
        <button class="ip-close" aria-label="关闭预览" @click="close">✕</button>
        <button
          v-if="current.filePath"
          class="ip-download"
          :disabled="saving"
          title="下载到本地"
          @click.stop="download"
        >
          ↓ 下载
        </button>

        <button v-if="multiple" class="ip-nav prev" aria-label="上一张" @click.stop="go(-1)">‹</button>

        <div class="ip-stage" @click.self="close">
          <video
            v-if="current.type === 'video'"
            :key="current.src"
            :src="current.src"
            class="ip-media"
            controls
            autoplay
            loop
          />
          <img v-else :key="current.src" :src="current.src" class="ip-media" :alt="current.title || ''" />
          <div v-if="current.title || current.sub || multiple" class="ip-bar">
            <div class="ip-info">
              <span v-if="current.title" class="ip-title">{{ current.title }}</span>
              <span v-if="current.sub" class="ip-sub">{{ current.sub }}</span>
            </div>
            <span v-if="multiple" class="ip-count mono">{{ index + 1 }} / {{ items.length }}</span>
          </div>
        </div>

        <button v-if="multiple" class="ip-nav next" aria-label="下一张" @click.stop="go(1)">›</button>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.ip-mask {
  position: fixed;
  inset: 0;
  z-index: 9500;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(2, 4, 6, 0.84);
  backdrop-filter: blur(6px);
  padding: 40px 72px;
}
.ip-stage {
  position: relative;
  max-width: 88vw;
  max-height: 86vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ip-media {
  max-width: 88vw;
  max-height: 86vh;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.6);
  background: #000;
}
.ip-bar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  padding: 28px 16px 12px;
  background: linear-gradient(180deg, transparent, rgba(0, 0, 0, 0.72));
  border-radius: 0 0 8px 8px;
  pointer-events: none;
}
.ip-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.ip-title {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
}
.ip-sub {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 2px;
}
.ip-count {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
}
.ip-close {
  position: absolute;
  top: 18px;
  right: 22px;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  font-size: 16px;
  cursor: pointer;
  transition: background 0.16s ease;
}
.ip-download {
  position: absolute;
  top: 18px;
  right: 72px;
  height: 38px;
  padding: 0 16px;
  border-radius: var(--r-sm);
  border: 1px solid rgba(52, 224, 139, 0.5);
  background: rgba(6, 18, 13, 0.88);
  color: var(--accent);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.16s ease, border-color 0.16s ease;
}
.ip-download:hover {
  background: rgba(52, 224, 139, 0.16);
  border-color: var(--accent);
}
.ip-download:disabled {
  opacity: 0.55;
  cursor: wait;
}
.ip-close:hover {
  background: rgba(255, 255, 255, 0.18);
}
.ip-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 46px;
  height: 46px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  font-size: 26px;
  line-height: 1;
  cursor: pointer;
  transition: background 0.16s ease;
}
.ip-nav:hover {
  background: rgba(255, 255, 255, 0.2);
}
.ip-nav.prev {
  left: 18px;
}
.ip-nav.next {
  right: 18px;
}

.zoom-fade-enter-active {
  transition: opacity 0.22s ease;
}
.zoom-fade-leave-active {
  transition: opacity 0.18s ease;
}
.zoom-fade-enter-from,
.zoom-fade-leave-to {
  opacity: 0;
}
.zoom-fade-enter-active .ip-stage {
  transition: transform 0.26s cubic-bezier(0.22, 1, 0.36, 1);
}
.zoom-fade-enter-from .ip-stage {
  transform: scale(0.92);
}
@media (prefers-reduced-motion: reduce) {
  .zoom-fade-enter-active,
  .zoom-fade-leave-active,
  .zoom-fade-enter-active .ip-stage {
    transition: none;
  }
}
</style>
