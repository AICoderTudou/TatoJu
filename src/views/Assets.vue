<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import type { Asset, AssetImage, AssetType } from '@shared/types'
import type { AssetWithCount } from '@shared/ipc'
import { useAppStore } from '../stores/app'
import { useTasksStore } from '../stores/tasks'
import { storeToRefs } from 'pinia'
import { mediaUrl } from '../api/media'
import ImagePreview, { type PreviewItem } from '../components/ImagePreview.vue'
import PopMenu, { type PopItem } from '../components/PopMenu.vue'

const route = useRoute()
const app = useAppStore()
const tasks = useTasksStore()
const { lastEvent, generations } = storeToRefs(tasks)
const projectId = computed(() => route.params.projectId as string)

const TABS: { key: AssetType; label: string }[] = [
  { key: 'character', label: '角色' },
  { key: 'scene', label: '场景' },
  { key: 'prop', label: '道具' }
]
const TYPE_LABEL: Record<AssetType, string> = { character: '角色', scene: '场景', prop: '道具' }
const tab = ref<AssetType>('character')
const assets = ref<AssetWithCount[]>([])
const extracting = ref(false)

const detail = ref<(Asset & { images: AssetImage[] }) | null>(null)

// 生成中状态：本地「提交中」+ 任务中心「排队/运行中」共同决定（可追溯、跨页面持久）
const submitting = ref<Record<string, boolean>>({})
function assetGenerating(id: string): boolean {
  return generations.value.some(
    (g) =>
      g.kind === 'image' &&
      g.refKind === 'asset' &&
      g.refId === id &&
      (g.status === 'queued' || g.status === 'running')
  )
}
function assetBusy(id: string): boolean {
  return !!submitting.value[id] || assetGenerating(id)
}

const loading = ref(true) // 仅首次加载显示骨架；后续刷新不闪烁
async function load(): Promise<void> {
  try {
    assets.value = await window.api.asset.listWithCounts(projectId.value)
  } finally {
    loading.value = false
  }
}
onMounted(load)

// 失败态：该资源最近一次生图失败（且当前未在重新生成）
function assetFailed(id: string): boolean {
  return !assetBusy(id) && tasks.latestGen('asset', id, 'image')?.status === 'failed'
}
async function retryAsset(a: Asset): Promise<void> {
  const g = tasks.latestGen('asset', a.id, 'image')
  if (g) await tasks.retry(g.id)
}

const filtered = computed(() => assets.value.filter((a) => a.type === tab.value))
const countOf = (t: AssetType): number => assets.value.filter((a) => a.type === t).length
const confirmedCount = computed(() => assets.value.filter((a) => a.confirmed === 1).length)

async function confirmAll(): Promise<void> {
  await window.api.asset.confirmAll(projectId.value)
  await load()
  app.notify('已全部确认资源设定')
}
async function toggleConfirm(a: Asset): Promise<void> {
  await window.api.asset.setConfirmed(a.id, a.confirmed !== 1)
  await load()
  if (detail.value?.id === a.id) detail.value = await window.api.asset.get(a.id)
}

// 从提示词自动提取十六进制色值，做可视化配色条
const swatches = computed(() => {
  const t = detail.value?.t2iPrompt ?? ''
  const m = t.match(/#[0-9a-fA-F]{6}\b/g) ?? []
  return [...new Set(m.map((s) => s.toUpperCase()))].slice(0, 24)
})

async function extract(): Promise<void> {
  extracting.value = true
  try {
    await window.api.asset.extract(projectId.value)
    await load()
    app.notify('资源已提取，请逐一确认角色/场景设定后再进入分镜')
  } catch (e) {
    app.notify('提取失败：' + (e as Error).message, 'error')
  } finally {
    extracting.value = false
  }
}

async function openDetail(a: Asset): Promise<void> {
  detail.value = await window.api.asset.get(a.id)
}
function closeDetail(): void {
  detail.value = null
}

async function saveDetail(): Promise<void> {
  if (!detail.value) return
  await window.api.asset.update(detail.value.id, {
    name: detail.value.name,
    description: detail.value.description ?? undefined,
    t2iPrompt: detail.value.t2iPrompt ?? undefined
  })
  await load()
  app.notify('已保存')
}

async function genImage(): Promise<void> {
  if (!detail.value) return
  const aid = detail.value.id
  if (assetBusy(aid)) return
  submitting.value = { ...submitting.value, [aid]: true }
  try {
    await window.api.gen.imageForAsset(aid)
    app.notify('已提交生图任务，见任务中心')
  } catch (e) {
    app.notify((e as Error).message, 'error')
  } finally {
    submitting.value = { ...submitting.value, [aid]: false }
  }
}

// 一键生成设定图（按类型批量，只为「还没设定图」的资源生成）
const genMenuOpen = ref(false)
const genMenuItems = computed<PopItem[]>(() =>
  (['character', 'scene', 'prop'] as AssetType[]).map((t) => {
    const total = assets.value.filter((a) => a.type === t).length
    const miss = assets.value.filter((a) => a.type === t && a.imageCount === 0).length
    return {
      key: t,
      label: TYPE_LABEL[t],
      sub: total ? `${miss} 个待生成 · 共 ${total}` : '暂无该类资源',
      disabled: miss === 0,
      hint: total ? '该类资源都已出图' : '暂无该类资源'
    }
  })
)
async function batchGenAssets(type: string): Promise<void> {
  genMenuOpen.value = false
  const t = type as AssetType
  const targets = assets.value.filter((a) => a.type === t && a.imageCount === 0)
  if (!targets.length) return
  for (const a of targets) {
    if (assetBusy(a.id)) continue
    submitting.value = { ...submitting.value, [a.id]: true }
    try {
      await window.api.gen.imageForAsset(a.id)
    } catch (e) {
      app.notify(`「${a.name}」提交失败：${(e as Error).message}`, 'error')
    } finally {
      submitting.value = { ...submitting.value, [a.id]: false }
    }
  }
  app.notify(`已为 ${targets.length} 个${TYPE_LABEL[t]}资源提交生图，见任务中心`, 'success')
}

// 设为/取消参考图（一致性锚点，喂给下游分镜/视频生成）
async function toggleRef(img: AssetImage): Promise<void> {
  await window.api.asset.setReference(img.id, img.isReference !== 1)
  if (detail.value) detail.value = await window.api.asset.get(detail.value.id)
  await load() // 刷新卡片封面/参考图数
}

async function removeAsset(a: Asset): Promise<void> {
  if (!(await app.confirm(`删除资源「${a.name}」？`))) return
  await window.api.asset.remove(a.id)
  if (detail.value?.id === a.id) closeDetail()
  load()
}

// 设定图预览
const preview = ref<{ open: boolean; items: PreviewItem[]; index: number }>({
  open: false,
  items: [],
  index: 0
})
function openImagePreview(i: number): void {
  if (!detail.value) return
  preview.value = {
    open: true,
    index: i,
    items: detail.value.images.map((img) => ({
      src: mediaUrl(img.filePath),
      filePath: img.filePath,
      type: 'image',
      title: detail.value!.name
    }))
  }
}

// 直接从资源库卡片预览该资源的设定图（无需先打开详情抽屉）
async function previewAsset(a: AssetWithCount): Promise<void> {
  if (a.imageCount === 0) return
  const full = await window.api.asset.get(a.id)
  if (!full || !full.images.length) return
  preview.value = {
    open: true,
    index: 0,
    items: full.images.map((img) => ({
      src: mediaUrl(img.filePath),
      filePath: img.filePath,
      type: 'image',
      title: full.name
    }))
  }
}

// 生成完成后刷新计数与打开的详情
watch(lastEvent, async (evt) => {
  if (!evt) return
  if (evt.refKind === 'asset' && evt.status === 'success') {
    await load()
    if (detail.value && evt.refId === detail.value.id) {
      detail.value = await window.api.asset.get(detail.value.id)
    }
  }
})
</script>

<template>
  <div class="assets">
    <div class="head">
      <h2 class="h-display page-title">② 资源库 · ASSETS</h2>
      <div class="actions">
        <button v-if="assets.length" class="btn" @click="confirmAll">
          ✓ 全部确认（{{ confirmedCount }}/{{ assets.length }}）
        </button>
        <div v-if="assets.length" class="pop-anchor">
          <button class="btn" @click="genMenuOpen = !genMenuOpen">⚡ 一键生成设定图 ▾</button>
          <PopMenu
            :open="genMenuOpen"
            :items="genMenuItems"
            title="选择要批量生成的资源类型"
            @close="genMenuOpen = false"
            @select="batchGenAssets"
          />
        </div>
        <button class="btn primary" :disabled="extracting" @click="extract">
          <span v-if="extracting" class="dot running" /> ◈ 从剧本提取资源
        </button>
      </div>
    </div>

    <div class="tabs">
      <button
        v-for="t in TABS"
        :key="t.key"
        class="tab"
        :class="{ active: tab === t.key }"
        @click="tab = t.key"
      >
        {{ t.label }}<span class="cnt mono">{{ countOf(t.key) }}</span>
      </button>
    </div>

    <div v-if="loading" class="grid">
      <div v-for="n in 8" :key="n" class="acard card skel">
        <div class="acard-cover skeleton" />
        <div class="acard-info">
          <div class="skeleton sk-line" />
          <div class="skeleton sk-line short" />
        </div>
      </div>
    </div>

    <div v-else-if="assets.length === 0" class="empty card">
      <div class="h-display" style="font-size: 16px; margin-bottom: 6px">资源库为空</div>
      <div class="dim">点击「从剧本提取资源」，AI 会拆出角色 / 场景 / 道具并生成文生图提示词。</div>
    </div>

    <div v-else class="grid">
      <div v-for="a in filtered" :key="a.id" class="acard card" :class="{ confirmed: a.confirmed === 1 }" @click="openDetail(a)">
        <div class="acard-cover">
          <img v-if="a.cover" :src="mediaUrl(a.cover)" :alt="a.name" />
          <div v-else class="acard-noimg">
            <span class="noimg-ico">{{ a.type === 'character' ? '👤' : a.type === 'scene' ? '🏙' : '🎒' }}</span>
            <span class="noimg-txt">待生成</span>
          </div>
          <span v-if="assetBusy(a.id)" class="cover-badge busy"><span class="dot running" /> 生成中</span>
          <span v-else-if="assetFailed(a.id)" class="cover-badge failed">✕ 生成失败</span>
          <span v-else-if="a.referenceCount > 0" class="cover-badge ref">★ 参考</span>
          <span v-else-if="a.imageCount > 0" class="cover-badge cnt">{{ a.imageCount }} 张</span>
          <button v-if="assetFailed(a.id)" class="card-retry" @click.stop="retryAsset(a)">重试</button>
          <button
            v-if="a.imageCount > 0"
            class="cover-zoom"
            title="预览设定图"
            @click.stop="previewAsset(a)"
          >
            ⤢
          </button>
        </div>
        <div class="acard-info">
          <div class="acard-name h-display">{{ a.name }}</div>
          <div class="acard-foot">
            <span class="tag">{{ TABS.find((t) => t.key === a.type)?.label }}</span>
            <span v-if="a.confirmed === 1" class="ok">✓ 已确认</span>
            <span v-else class="pending">待确认</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 详情抽屉 -->
    <transition name="drawer-right">
    <div v-if="detail" class="mask" @click.self="closeDetail">
      <aside class="drawer panel scroll">
        <header class="dh">
          <input v-model="detail.name" class="name-in h-display" />
          <button class="btn ghost sm" @click="closeDetail">✕</button>
        </header>

        <label class="label">描述</label>
        <textarea v-model="detail.description" rows="2" />

        <label class="label">文生图提示词（可编辑）</label>
        <textarea v-model="detail.t2iPrompt" rows="5" />

        <div v-if="swatches.length" class="swatch-box">
          <span class="label">配色（自动从提示词提取）</span>
          <div class="sw-row">
            <span v-for="c in swatches" :key="c" class="sw" :style="{ background: c }" :title="c" />
          </div>
        </div>

        <div class="d-actions">
          <button class="btn" :class="{ okbtn: detail.confirmed === 1 }" @click="toggleConfirm(detail)">
            {{ detail.confirmed === 1 ? '✓ 已确认（点取消）' : '确认设定' }}
          </button>
          <button class="btn" @click="saveDetail">保存</button>
          <button class="btn primary" :disabled="assetBusy(detail.id)" @click="genImage">
            <span v-if="assetBusy(detail.id)" class="dot running" />
            {{ assetBusy(detail.id) ? '生成中…' : '⚡ 生成设定图' }}
          </button>
          <button class="btn danger" @click="removeAsset(detail)">删除资源</button>
        </div>

        <label class="label" style="margin-top: 16px">设定图（{{ detail.images.length }}）</label>
        <div v-if="detail.images.length === 0" class="dim small">
          还没有图。点「生成设定图」用 RunningHub / gpt-image 出图（未配置 Key 时用占位图演示链路）。
        </div>
        <div class="ref-tip dim small">★ 参考图会作为一致性锚点，喂给下游分镜 / 视频生成（可锁定多张）。</div>
        <div class="imgs">
          <div v-for="(img, i) in detail.images" :key="img.id" class="imgwrap" :class="{ ref: img.isReference === 1 }">
            <img :src="mediaUrl(img.filePath)" title="点击预览" @click="openImagePreview(i)" />
            <span v-if="img.isReference === 1" class="ref-badge">★ 参考</span>
            <div class="img-ops">
              <button
                class="img-op"
                :class="{ on: img.isReference === 1 }"
                @click.stop="toggleRef(img)"
              >
                {{ img.isReference === 1 ? '★ 已锁定' : '设为参考' }}
              </button>
              <button class="img-op zoom-op" title="预览" @click.stop="openImagePreview(i)">⤢</button>
            </div>
          </div>
        </div>
      </aside>
    </div>
    </transition>

    <ImagePreview
      :open="preview.open"
      :items="preview.items"
      :index="preview.index"
      @close="preview.open = false"
      @update:index="preview.index = $event"
    />
  </div>
</template>

<style scoped>
.assets {
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
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}
.acard {
  cursor: pointer;
  padding: 0;
  overflow: hidden;
  transition: border-color 0.16s ease, transform 0.16s ease;
}
.acard:hover {
  border-color: var(--accent);
  transform: translateY(-2px);
}
.acard-cover {
  position: relative;
  aspect-ratio: 4 / 5;
  background: var(--bg);
  border-bottom: 1px solid var(--line);
}
.acard-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.acard-noimg {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: var(--muted);
}
.noimg-ico {
  font-size: 34px;
  opacity: 0.5;
}
.noimg-txt {
  font-size: 12px;
}
.cover-badge {
  position: absolute;
  top: 7px;
  left: 7px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  padding: 2px 7px;
  border-radius: 999px;
  backdrop-filter: blur(4px);
}
.cover-badge.ref {
  background: var(--accent);
  color: var(--accent-on);
  font-weight: 700;
}
.cover-badge.cnt {
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
}
.cover-badge.busy {
  background: rgba(0, 0, 0, 0.6);
  color: var(--text);
}
.cover-badge.failed {
  background: var(--st-failed);
  color: #fff;
  font-weight: 700;
}
.card-retry {
  position: absolute;
  bottom: 7px;
  right: 7px;
  font-size: 11px;
  padding: 3px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  cursor: pointer;
}
.card-retry:hover {
  background: var(--st-failed);
  border-color: var(--st-failed);
}
.cover-zoom {
  position: absolute;
  top: 7px;
  right: 7px;
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 7px;
  border: none;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.16s ease, background 0.16s ease;
  backdrop-filter: blur(4px);
}
.acard:hover .cover-zoom {
  opacity: 1;
}
.cover-zoom:hover {
  background: var(--accent);
  color: var(--accent-on);
}
.acard.skel {
  cursor: default;
  pointer-events: none;
}
.acard.skel:hover {
  border-color: var(--line);
  transform: none;
}
.sk-line {
  height: 12px;
  margin-bottom: 8px;
}
.sk-line.short {
  width: 50%;
}
.acard-info {
  padding: 10px 12px 12px;
}
.acard-name {
  font-size: 14px;
  margin-bottom: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.acard-foot {
  display: flex;
  align-items: center;
  gap: 8px;
}
.acard.confirmed {
  border-left: 2px solid var(--st-success);
}
.ok {
  font-size: 11px;
  color: var(--st-success);
}
.pending {
  font-size: 11px;
  color: var(--muted);
}
.actions {
  display: flex;
  gap: 8px;
  align-items: center;
}
.pop-anchor {
  position: relative;
}
.okbtn {
  border-color: #2e4a2c;
  color: var(--st-success);
}
.empty {
  padding: 36px;
  text-align: center;
  margin-bottom: 16px;
}
.dim {
  color: var(--dim);
}
.small {
  font-size: 12px;
}
.mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 300;
  display: flex;
  justify-content: flex-end;
}
.drawer {
  width: 480px;
  max-width: 92vw;
  height: 100%;
  border-radius: 0;
  border-top: none;
  border-bottom: none;
  border-right: none;
  padding: 16px 18px;
}
.dh {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}
.name-in {
  font-size: 18px;
  border: 1px solid transparent;
  background: transparent;
  padding: 4px 6px;
}
.name-in:hover {
  border-color: var(--line);
}
.label {
  display: block;
  margin: 12px 0 5px;
}
.d-actions {
  display: flex;
  gap: 8px;
  margin-top: 14px;
  flex-wrap: wrap;
}
.imgs {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 10px;
  margin-top: 8px;
}
.ref-tip {
  margin: 8px 0 6px;
  line-height: 1.5;
}
.imgs {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 10px;
  margin-top: 4px;
}
.imgwrap {
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  overflow: hidden;
  position: relative;
  transition: border-color 0.16s ease;
}
.imgwrap.ref {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent);
}
.imgwrap img {
  width: 100%;
  display: block;
  aspect-ratio: 9/16;
  object-fit: cover;
  background: var(--bg);
  cursor: pointer;
}
.ref-badge {
  position: absolute;
  top: 6px;
  left: 6px;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--accent);
  color: var(--accent-on);
  font-weight: 700;
}
.img-ops {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  gap: 4px;
  padding: 5px;
  background: linear-gradient(180deg, transparent, rgba(0, 0, 0, 0.72));
  opacity: 0;
  transition: opacity 0.16s ease;
}
.imgwrap:hover .img-ops,
.imgwrap.ref .img-ops {
  opacity: 1;
}
.img-op {
  flex: 1;
  border: 1px solid rgba(255, 255, 255, 0.25);
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  font-size: 11px;
  padding: 3px 6px;
  border-radius: 5px;
  cursor: pointer;
}
.img-op.on {
  background: var(--accent);
  color: var(--accent-on);
  border-color: var(--accent);
  font-weight: 700;
}
.zoom-op {
  flex: 0 0 30px;
}
</style>
