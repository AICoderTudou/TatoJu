<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import type { Project, StyleBible } from '@shared/types'
import { STYLE_TEMPLATES, type StyleTemplate, type StyleCategory } from '@shared/styleTemplates'
import { useAppStore } from '../stores/app'
import Modal from './Modal.vue'
import ImagePreview, { type PreviewItem } from './ImagePreview.vue'

const props = defineProps<{ open: boolean; projectId: string }>()
const emit = defineEmits<{ close: []; saved: [Project] }>()
const app = useAppStore()

// 顶部两个视图：风格库 / 自定义
const view = ref<'library' | 'custom'>('library')

const styleRef = ref('')
const genBusy = ref(false)
const styleForm = reactive<StyleBible>({})
const FIELDS: { key: keyof StyleBible; label: string }[] = [
  { key: 'visualStyle', label: '视觉风格' },
  { key: 'colorGrading', label: '调色（含色值）' },
  { key: 'lighting', label: '灯光' },
  { key: 'cameraLanguage', label: '镜头语言' },
  { key: 'postTexture', label: '后期质感' },
  { key: 'rhythmEditing', label: '节奏剪辑' }
]

// 风格库分类
type CatKey = 'all' | StyleCategory
const CATS: { key: CatKey; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'real', label: '真人' },
  { key: '2d', label: '2D' },
  { key: '3d', label: '3D' }
]
const cat = ref<CatKey>('all')
const catTemplates = computed(() =>
  cat.value === 'all' ? STYLE_TEMPLATES : STYLE_TEMPLATES.filter((t) => t.category === cat.value)
)
const CAT_LABEL: Record<StyleCategory, string> = { real: '真人', '2d': '2D', '3d': '3D' }

function tplCover(t: StyleTemplate): string {
  let h = 0
  for (let i = 0; i < t.id.length; i++) h = (h * 31 + t.id.charCodeAt(i)) % 360
  return `linear-gradient(135deg, hsl(${h} 52% 28%), hsl(${(h + 40) % 360} 58% 12%))`
}

function apply(p: Project | null): void {
  styleRef.value = p?.styleRef ?? ''
  let b: StyleBible = {}
  try {
    b = p?.styleBible ? JSON.parse(p.styleBible) : {}
  } catch {
    b = {}
  }
  for (const f of FIELDS) styleForm[f.key] = b[f.key] ?? ''
}
async function load(): Promise<void> {
  apply(await window.api.project.get(props.projectId))
}
// 封面是内置素材：相对路径加载（dev /styles，prod ./styles，随打包分发）
function coverUrl(id: string): string {
  return (import.meta.env.DEV ? '/' : './') + `styles/${id}.webp`
}
// 放大预览：点封面右上角放大按钮，全屏查看大图
const preview = ref<{ open: boolean; items: PreviewItem[]; index: number }>({
  open: false,
  items: [],
  index: 0
})
function openPreview(t: StyleTemplate, e: Event): void {
  e.stopPropagation()
  const visible = catTemplates.value
  const index = Math.max(0, visible.findIndex((item) => item.id === t.id))
  preview.value = {
    open: true,
    index,
    items: visible.map((item) => ({
      src: coverUrl(item.id),
      filePath: `styles/${item.id}.webp`,
      scope: 'app',
      type: 'image',
      title: item.name,
      sub: CAT_LABEL[item.category]
    }))
  }
}
watch(
  () => props.open,
  (o) => {
    if (o) load()
  }
)

// 点风格卡：选中并套用（保存按钮提交）
async function pick(t: StyleTemplate): Promise<void> {
  // 选用模板：直接保存整套风格圣经；不灌入下方「自定义」编辑区
  styleRef.value = t.name
  const p = await window.api.project.saveStyleBible(props.projectId, { ...t.bible }, t.name)
  app.notify(`已应用风格「${t.name}」`, 'success')
  emit('saved', p)
}

async function gen(): Promise<void> {
  genBusy.value = true
  try {
    const p = await window.api.project.genStyleBible(props.projectId, styleRef.value)
    apply(p)
    app.notify('风格圣经已生成', 'success')
    emit('saved', p)
  } catch (e) {
    app.notify('生成失败：' + (e as Error).message, 'error')
  } finally {
    genBusy.value = false
  }
}
async function saveCustom(): Promise<void> {
  const p = await window.api.project.saveStyleBible(props.projectId, { ...styleForm }, styleRef.value)
  app.notify('风格圣经已保存', 'success')
  emit('saved', p)
  emit('close')
}
</script>

<template>
  <Modal :open="open" title="风格库 · STYLE BIBLE" :width="820" @close="emit('close')">
    <!-- 视图切换：风格库 / 自定义 -->
    <div class="view-tabs">
      <button class="vtab" :class="{ on: view === 'library' }" @click="view = 'library'">风格库模板</button>
      <button class="vtab" :class="{ on: view === 'custom' }" @click="view = 'custom'">自定义 / AI 生成</button>
      <span v-if="styleRef" class="cur">当前：{{ styleRef }}</span>
    </div>

    <!-- 风格库：分类 + 封面卡片网格 -->
    <div v-show="view === 'library'">
      <div class="cats">
        <button
          v-for="c in CATS"
          :key="c.key"
          class="cat"
          :class="{ on: cat === c.key }"
          @click="cat = c.key"
        >
          {{ c.label }}
        </button>
      </div>
      <div class="grid scroll">
        <button
          v-for="t in catTemplates"
          :key="t.id"
          class="card"
          :class="{ active: styleRef === t.name }"
          @click="pick(t)"
        >
          <div class="cover" :style="{ background: tplCover(t) }">
            <img
              class="cover-img"
              :src="coverUrl(t.id)"
              alt=""
              @load="($event.target as HTMLImageElement).style.opacity = '1'"
              @error="($event.target as HTMLImageElement).style.opacity = '0'"
            />
            <span class="cat-tag">{{ CAT_LABEL[t.category] }}</span>
            <span v-if="styleRef === t.name" class="check">✓</span>
            <button class="zoom-cover" title="放大预览封面" @click="openPreview(t, $event)">⤢</button>
            <div class="cap">{{ t.name }}</div>
          </div>
        </button>
      </div>
      <p class="hint dim">点封面即应用该风格；之后所有资源图 / 分镜图 / 视频提示词都会统一遵循它的调色、灯光、镜头与质感。</p>
    </div>

    <!-- 自定义 / AI 生成 -->
    <div v-show="view === 'custom'">
      <p class="tip dim">填一部参考影片或视觉关键词，AI 生成全片影像标准；也可手动微调下面 6 项后保存。</p>
      <label class="label blk">参考影片 / 视觉关键词</label>
      <div class="row">
        <input v-model="styleRef" placeholder="如：《教父》暖褐低调布光 / 《降临》冷蓝调 + 罗杰·迪金斯" />
        <button class="btn primary" :disabled="genBusy" @click="gen">
          <span v-if="genBusy" class="dot running" />✦ AI 生成
        </button>
      </div>
      <div class="six">
        <div v-for="f in FIELDS" :key="f.key">
          <label class="label blk">{{ f.label }}</label>
          <textarea v-model="styleForm[f.key]" rows="2" />
        </div>
      </div>
    </div>

    <template #footer>
      <button class="btn ghost" @click="emit('close')">关闭</button>
      <button v-if="view === 'custom'" class="btn primary" @click="saveCustom">保存</button>
    </template>
  </Modal>

  <ImagePreview
    :open="preview.open"
    :items="preview.items"
    :index="preview.index"
    @close="preview.open = false"
    @update:index="preview.index = $event"
  />
</template>

<style scoped>
.view-tabs {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
  border-bottom: 1px solid var(--line);
  padding-bottom: 10px;
}
.vtab {
  background: transparent;
  border: none;
  color: var(--dim);
  font-size: 13px;
  padding: 6px 4px;
  cursor: pointer;
  position: relative;
}
.vtab.on {
  color: var(--text);
  font-weight: 600;
}
.vtab.on::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: -11px;
  height: 2px;
  border-radius: 2px;
  background: var(--accent-grad);
}
.cur {
  margin-left: auto;
  font-size: 12px;
  color: var(--accent);
}

/* 分类 pill */
.cats {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
.cat {
  background: var(--raised);
  border: 1px solid var(--line);
  color: var(--dim);
  border-radius: 999px;
  padding: 5px 18px;
  font-size: 13px;
  cursor: pointer;
}
.cat.on {
  background: var(--accent-grad);
  border-color: transparent;
  color: var(--accent-on);
  font-weight: 600;
}

/* 封面卡片网格 */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
  max-height: 52vh;
  padding: 2px;
}
.card {
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 10px;
}
.cover {
  position: relative;
  aspect-ratio: 16 / 10;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: transform 0.14s ease, box-shadow 0.14s ease;
}
.cover-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 0.2s ease;
}
.card:hover .cover {
  transform: translateY(-2px);
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.45);
}
.card.active .cover {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px var(--accent);
}
.cat-tag {
  position: absolute;
  top: 6px;
  left: 6px;
  font-size: 10px;
  padding: 1px 7px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  backdrop-filter: blur(3px);
}
.check {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--accent);
  color: var(--accent-on);
  font-size: 12px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
}
.zoom-cover {
  position: absolute;
  right: 6px;
  bottom: 30px;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: none;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  opacity: 0;
  backdrop-filter: blur(3px);
  transition: opacity 0.14s ease, background 0.14s ease;
  z-index: 2;
}
.card:hover .zoom-cover {
  opacity: 1;
}
.zoom-cover:hover {
  background: var(--accent);
  color: var(--accent-on);
}
.cap {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 16px 8px 8px;
  font-size: 12px;
  color: #fff;
  text-align: left;
  background: linear-gradient(180deg, transparent, rgba(0, 0, 0, 0.82));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.hint,
.tip {
  font-size: 12px;
  line-height: 1.6;
  margin: 12px 0 0;
}
.dim {
  color: var(--dim);
}

/* 自定义 */
.label.blk {
  display: block;
  margin: 0 0 5px;
}
.row {
  display: flex;
  gap: 8px;
}
.row input {
  flex: 1;
}
.row .btn {
  white-space: nowrap;
}
.six {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 14px;
  margin-top: 14px;
}
.six .label.blk {
  margin-top: 6px;
}

</style>
