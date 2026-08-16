<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import type { ScriptTree, ShotRefAsset, ContinuityWarning } from '@shared/ipc'
import type { Shot, ShotImage, Beat, SceneElement } from '@shared/types'
import {
  SHOT_SIZES,
  CAMERA_ANGLES,
  CAMERA_MOVES,
  CAMERA_MOVE_LABELS,
  LENS_OPTIONS,
  AXIS_SIDES,
  SOUND_TYPES,
  SOUND_TYPE_LABELS,
  BEAT_TYPE_LABELS,
  SCENE_ELEMENT_LABELS
} from '@shared/types'
import { useAppStore } from '../stores/app'
import { useTasksStore } from '../stores/tasks'
import { mediaUrl } from '../api/media'
import ImagePreview, { type PreviewItem } from '../components/ImagePreview.vue'
import PopMenu, { type PopItem } from '../components/PopMenu.vue'

const route = useRoute()
const app = useAppStore()
const tasks = useTasksStore()
const { lastEvent } = storeToRefs(tasks)
const projectId = computed(() => route.params.projectId as string)

const tree = ref<ScriptTree | null>(null)
const assets = ref<{ id: string; name: string; type: string }[]>([])
const selectedSceneId = ref('')
const shots = ref<Shot[]>([])
const breaking = ref(false)

const expanded = ref<string>('')
const refsOf = ref<Record<string, ShotRefAsset[]>>({})
const suggestOf = ref<Record<string, { id: string; name: string; type: string }[]>>({})
const imgsOf = ref<Record<string, ShotImage[]>>({})

const sizes = SHOT_SIZES
const angles = CAMERA_ANGLES
const moves = CAMERA_MOVES
const lenses = LENS_OPTIONS
const axisSides = AXIS_SIDES
const soundTypes = SOUND_TYPES

// 院线级拆解：拆解表元素 / 节拍 / 连续性告警
const beats = ref<Beat[]>([])
const elements = ref<SceneElement[]>([])
const warnings = ref<ContinuityWarning[]>([])
const showSheet = ref(true)
const showWarns = ref(true)
const showWarnHelp = ref(false)
const breakdownMenuOpen = ref(false)
const breakdownItems: PopItem[] = [
  { key: 'full', label: '一键拆分镜', sub: '拆解表+节拍 → 排镜（推荐）' },
  { key: 'sheet', label: '① 生成拆解表 + 节拍', sub: '元素清单 + 戏剧节拍' },
  { key: 'shots', label: '② 排镜（出镜头表）', sub: '以节拍为骨，含电影级字段' }
]
const highWarnings = computed(() => warnings.value.filter((w) => w.level === 'high'))
function beatOf(beatId: string | null | undefined): Beat | undefined {
  return beatId ? beats.value.find((b) => b.id === beatId) : undefined
}
const elementsByCat = computed(() => {
  const m: Record<string, SceneElement[]> = {}
  for (const e of elements.value) (m[e.category] ??= []).push(e)
  return m
})

const TYPE_ZH = (t: string): string => (t === 'character' ? '角色' : t === 'scene' ? '场景' : '道具')

async function load(): Promise<void> {
  tree.value = await window.api.script.getTree(projectId.value)
  assets.value = await window.api.asset.list(projectId.value)
  if (tree.value && !selectedSceneId.value) {
    selectedSceneId.value = tree.value.episodes[0]?.scenes[0]?.id ?? ''
  }
  if (selectedSceneId.value) await loadShots()
}
onMounted(load)

async function loadShots(): Promise<void> {
  shots.value = await window.api.shot.listByScene(selectedSceneId.value)
  // 并发加载每镜的引用/建议/图，避免逐镜串行 IPC 卡顿
  await Promise.all(
    shots.value.map(async (s) => {
      const [refs, sug, imgs] = await Promise.all([
        window.api.shot.assetRefsDetailed(s.id),
        window.api.shot.suggestAssets(s.id),
        window.api.shot.images(s.id)
      ])
      refsOf.value[s.id] = refs
      suggestOf.value[s.id] = sug
      imgsOf.value[s.id] = imgs
    })
  )
  await refreshSceneMeta()
}
async function refreshSceneMeta(): Promise<void> {
  if (!selectedSceneId.value) return
  beats.value = await window.api.shot.beats(selectedSceneId.value)
  elements.value = await window.api.shot.sceneElements(selectedSceneId.value)
  warnings.value = await window.api.shot.continuityCheck(selectedSceneId.value)
}
async function refreshRefs(shotId: string): Promise<void> {
  refsOf.value[shotId] = await window.api.shot.assetRefsDetailed(shotId)
  suggestOf.value[shotId] = await window.api.shot.suggestAssets(shotId)
}
watch(selectedSceneId, loadShots)

const scenes = computed(() => {
  const list: { id: string; label: string }[] = []
  if (!tree.value) return list
  for (const ep of tree.value.episodes) {
    for (const sc of ep.scenes) {
      list.push({ id: sc.id, label: `${ep.idx}-${sc.idx} ${sc.location || sc.slugline || '场景'}` })
    }
  }
  return list
})

// 分步拆解：full=一键(拆解表+排镜) / sheet=仅拆解表+节拍 / shots=仅排镜
async function runBreakdown(kind: string): Promise<void> {
  breakdownMenuOpen.value = false
  if (!selectedSceneId.value) return
  // 已有内容时二次确认：再次拆解会清空并覆盖本场已有的拆解表 / 节拍 / 镜头
  const hasSheet = elements.value.length > 0 || beats.value.length > 0
  const hasShots = shots.value.length > 0
  const willOverwrite =
    kind === 'sheet' ? hasSheet : kind === 'shots' ? hasShots : hasSheet || hasShots
  if (willOverwrite) {
    const what =
      kind === 'sheet'
        ? '本场已有「拆解表 / 节拍」'
        : kind === 'shots'
          ? `本场已有 ${shots.value.length} 个镜头`
          : '本场已有拆解内容（拆解表 / 节拍 / 镜头）'
    const ok = await app.confirm(
      `${what}。再次拆解会清空并用新结果【覆盖】上次内容，已手动调整的镜头字段、引用资源、已生成的提示词/分镜图归属也会一并丢失。确定要重新拆解吗？`
    )
    if (!ok) return
  }
  breaking.value = true
  try {
    if (kind === 'sheet') {
      await window.api.shot.breakdownSheet(selectedSceneId.value)
      await refreshSceneMeta()
      app.notify('已生成拆解表 + 节拍')
    } else if (kind === 'shots') {
      shots.value = await window.api.shot.shotList(selectedSceneId.value)
      await loadShots()
      app.notify('已排镜（生成镜头表）')
    } else {
      shots.value = await window.api.shot.breakdown(selectedSceneId.value)
      await loadShots()
      app.notify('已拆分镜头')
    }
  } catch (e) {
    app.notify('拆镜失败：' + (e as Error).message, 'error')
  } finally {
    breaking.value = false
  }
}

async function saveShot(s: Shot): Promise<void> {
  await window.api.shot.update(s.id, s)
  app.notify('分镜已保存')
}

async function addRef(shotId: string, assetId: string): Promise<void> {
  if (!assetId) return
  await window.api.shot.addAssetRef(shotId, assetId)
  await refreshRefs(shotId)
}
async function removeRef(shotId: string, assetId: string): Promise<void> {
  await window.api.shot.removeAssetRef(shotId, assetId)
  await refreshRefs(shotId)
}

// 流程规则：引用资源若「只有文本、没有设定图」，禁止生成提示词/分镜图
function refsMissingImage(shotId: string): ShotRefAsset[] {
  return (refsOf.value[shotId] || []).filter((a) => !a.hasImage)
}
function canGenerate(shotId: string): boolean {
  return refsMissingImage(shotId).length === 0
}

// 单镜「生成中」状态：避免重复点击「生成提示词 / 生成分镜图」
// 提示词是 await 完成型，用本地提交态即可；分镜图是异步任务，本地提交态 + 任务中心排队/运行中。
const promptBusy = ref<Record<string, boolean>>({})
const imgSubmitting = ref<Record<string, boolean>>({})
function imgGenerating(shotId: string): boolean {
  return tasks.generations.some(
    (g) =>
      g.kind === 'image' &&
      g.refKind === 'shot' &&
      g.refId === shotId &&
      (g.status === 'queued' || g.status === 'running')
  )
}
function imgBusy(shotId: string): boolean {
  return !!imgSubmitting.value[shotId] || imgGenerating(shotId)
}

async function genPrompt(s: Shot): Promise<void> {
  if (!canGenerate(s.id)) {
    app.notify('引用资源缺少设定图，请先在「资源库」为其生成设定图', 'error')
    return
  }
  if (promptBusy.value[s.id]) return
  promptBusy.value = { ...promptBusy.value, [s.id]: true }
  try {
    const updated = await window.api.shot.genStoryboardPrompt(s.id)
    const i = shots.value.findIndex((x) => x.id === s.id)
    if (i >= 0) shots.value[i] = updated
    app.notify('已生成分镜提示词')
  } catch (e) {
    app.notify((e as Error).message, 'error')
  } finally {
    promptBusy.value = { ...promptBusy.value, [s.id]: false }
  }
}

async function genImage(s: Shot): Promise<void> {
  if (!canGenerate(s.id)) {
    app.notify('引用资源缺少设定图，请先在「资源库」为其生成设定图', 'error')
    return
  }
  if (imgBusy(s.id)) return
  const refs = refsOf.value[s.id] || []
  const unconfirmed = refs.filter((a) => a.confirmed !== 1)
  if (unconfirmed.length) {
    const ok = await app.confirm(
      `引用的资源「${unconfirmed.map((a) => a.name).join('、')}」设定尚未确认。未确认的设定可能导致后续画面不一致，建议先到「资源库」确认。仍要继续生成分镜图吗？`
    )
    if (!ok) return
  }
  imgSubmitting.value = { ...imgSubmitting.value, [s.id]: true }
  try {
    await window.api.gen.imageForShot(s.id)
    app.notify('已提交分镜生图，见任务中心')
  } catch (e) {
    app.notify((e as Error).message, 'error')
  } finally {
    imgSubmitting.value = { ...imgSubmitting.value, [s.id]: false }
  }
}

// 一键分镜：批量生成提示词 / 分镜图（分镜图需全部分镜已有提示词）
const batchMenuOpen = ref(false)
const batching = ref(false)
const allHavePrompt = computed(
  () => shots.value.length > 0 && shots.value.every((s) => !!s.storyboardPrompt && s.storyboardPrompt.trim().length > 0)
)
// 是否已有提示词（用于「再次批量会覆盖」提醒）
const anyHavePrompt = computed(() =>
  shots.value.some((s) => !!s.storyboardPrompt && s.storyboardPrompt.trim().length > 0)
)
// 是否每个镜头都已出分镜图：批量分镜图只允许做一次，全部出图后禁用批量，改为单镜抽卡
const allHaveImage = computed(
  () => shots.value.length > 0 && shots.value.every((s) => (imgsOf.value[s.id] || []).length > 0)
)
const batchItems = computed<PopItem[]>(() => [
  {
    key: 'prompt',
    label: '批量生成分镜提示词',
    sub: anyHavePrompt.value ? '已生成 · 再次运行会覆盖全部文案' : '当前场景全部分镜'
  },
  {
    key: 'image',
    label: '批量生成分镜图',
    sub: allHaveImage.value ? '已批量生成 · 重抽请在单个镜头中进行' : '当前场景全部分镜',
    disabled: !allHavePrompt.value || allHaveImage.value,
    hint: !allHavePrompt.value
      ? '需所有分镜先有提示词'
      : allHaveImage.value
        ? '已批量生成；重抽请展开单个镜头点「生成分镜图」抽卡'
        : ''
  }
])
async function batchStoryboard(kind: string): Promise<void> {
  batchMenuOpen.value = false
  if (!shots.value.length) return
  // 提示词：已生成过则二次确认，避免覆盖手动改过的文案
  if (kind === 'prompt') {
    const has = shots.value.filter((s) => !!s.storyboardPrompt && s.storyboardPrompt.trim().length > 0).length
    if (has) {
      const ok = await app.confirm(
        `当前场景已有 ${has} 个镜头生成过分镜提示词。再次批量生成会用新文案【覆盖】这些镜头的原提示词（手动改过的也会被覆盖）。确定继续吗？`
      )
      if (!ok) return
    }
  }
  // 分镜图：每镜都已出图时不再允许批量（按钮已禁用，这里双保险），重抽改为单镜抽卡
  if (kind === 'image' && allHaveImage.value) {
    app.notify('本场分镜图已批量生成。如需重抽，请展开单个镜头点「生成分镜图」', 'info')
    return
  }
  batching.value = true
  try {
    let ok = 0
    let skip = 0
    if (kind === 'prompt') {
      for (const s of shots.value) {
        if (!canGenerate(s.id)) {
          skip++
          continue
        }
        try {
          const u = await window.api.shot.genStoryboardPrompt(s.id)
          const i = shots.value.findIndex((x) => x.id === s.id)
          if (i >= 0) shots.value[i] = u
          ok++
        } catch {
          /* 单条失败不阻断批量 */
        }
      }
      app.notify(
        `已生成 ${ok} 条分镜提示词${skip ? `，跳过 ${skip} 个缺设定图的分镜` : ''}`,
        skip ? 'info' : 'success'
      )
    } else {
      for (const s of shots.value) {
        if (!canGenerate(s.id)) {
          skip++
          continue
        }
        // 已出图 / 正在生成中（排队·运行·提交窗口）的镜头都跳过，只补「还没图」的，避免整场重跑
        if ((imgsOf.value[s.id] || []).length || imgBusy(s.id)) {
          skip++
          continue
        }
        try {
          await window.api.gen.imageForShot(s.id)
          ok++
        } catch {
          /* ignore */
        }
      }
      app.notify(
        ok
          ? `已提交 ${ok} 张分镜图生成${skip ? `，跳过 ${skip} 个（缺设定图 / 已出图 / 生成中）` : ''}，见任务中心`
          : '没有需要生成的分镜图：其余都已出图或正在生成中',
        ok ? (skip ? 'info' : 'success') : 'info'
      )
    }
  } finally {
    batching.value = false
  }
}

async function selectImage(shotId: string, img: ShotImage): Promise<void> {
  await window.api.shot.selectImage(shotId, img.id)
  imgsOf.value[shotId] = await window.api.shot.images(shotId)
}

// 预览：引用资源设定图 / 分镜图
const preview = ref<{ open: boolean; items: PreviewItem[]; index: number }>({
  open: false,
  items: [],
  index: 0
})
function previewRef(a: ShotRefAsset): void {
  if (!a.cover) return
  preview.value = {
    open: true,
    index: 0,
    items: [{ src: mediaUrl(a.cover), filePath: a.cover, type: 'image', title: a.name, sub: TYPE_ZH(a.type) }]
  }
}
function previewShotImages(shotId: string, i: number): void {
  const imgs = imgsOf.value[shotId] || []
  if (!imgs.length) return
  preview.value = {
    open: true,
    index: i,
    items: imgs.map((img) => ({
      src: mediaUrl(img.filePath),
      filePath: img.filePath,
      type: 'image',
      title: '分镜图'
    }))
  }
}

watch(lastEvent, async (evt) => {
  if (evt?.refKind === 'shot' && evt.status === 'success' && evt.kind === 'image') {
    if (evt.refId) imgsOf.value[evt.refId] = await window.api.shot.images(evt.refId)
  }
  // 设定图生成完成 → 刷新引用资源的「是否有图」状态，解除流程禁用
  if (evt?.refKind === 'asset' && evt.status === 'success') {
    for (const s of shots.value) await refreshRefs(s.id)
  }
})

const availableAssets = computed(() => assets.value)
function statusOf(shotId: string): string {
  if (imgBusy(shotId) || promptBusy.value[shotId]) return 'running'
  if (tasks.latestGen('shot', shotId, 'image')?.status === 'failed') return 'failed'
  const imgs = imgsOf.value[shotId] || []
  const s = shots.value.find((x) => x.id === shotId)
  if (imgs.length) return 'success'
  if (s?.storyboardPrompt) return 'queued'
  return 'canceled'
}
async function retryShot(s: Shot): Promise<void> {
  const g = tasks.latestGen('shot', s.id, 'image')
  if (g) await tasks.retry(g.id)
}
</script>

<template>
  <div class="sb">
    <div class="head">
      <h2 class="h-display page-title">③ 分镜板 · STORYBOARD</h2>
      <div class="actions">
        <select v-model="selectedSceneId" class="scene-sel">
          <option v-for="sc in scenes" :key="sc.id" :value="sc.id">{{ sc.label }}</option>
        </select>
        <!-- 一键分镜（批量）：先拆出镜头后才出现，避免空场景时误点 -->
        <div v-if="shots.length" class="pop-anchor">
          <button class="btn" :disabled="breaking || batching" @click="batchMenuOpen = !batchMenuOpen">
            <span v-if="batching" class="dot running" /> ⚡ 一键分镜 ▾
          </button>
          <PopMenu
            :open="batchMenuOpen"
            :items="batchItems"
            title="批量处理当前场景全部分镜"
            @close="batchMenuOpen = false"
            @select="batchStoryboard"
          />
        </div>
        <div class="pop-anchor">
          <button
            class="btn primary"
            :disabled="breaking || !selectedSceneId"
            @click="breakdownMenuOpen = !breakdownMenuOpen"
          >
            <span v-if="breaking" class="dot running" /> ▦ 拆分镜 ▾
          </button>
          <PopMenu
            :open="breakdownMenuOpen"
            :items="breakdownItems"
            title="电影工业两道工序"
            @close="breakdownMenuOpen = false"
            @select="runBreakdown"
          />
        </div>
      </div>
    </div>

    <div v-if="!tree" class="empty card dim">请先在「剧本」阶段生成剧本。</div>
    <template v-else>
      <!-- 拆解表 · 节拍 -->
      <div v-if="elements.length || beats.length" class="sheet panel">
        <div class="sheet-h" @click="showSheet = !showSheet">
          <span class="label" style="margin: 0">拆解表 · 节拍（{{ elements.length }} 元素 · {{ beats.length }} 拍）</span>
          <span class="sheet-toggle">{{ showSheet ? '收起 ▲' : '展开 ▼' }}</span>
        </div>
        <div v-if="showSheet" class="sheet-body">
          <div v-if="elements.length" class="elem-row">
            <template v-for="(list, cat) in elementsByCat" :key="cat">
              <span class="elem-cat label">{{ SCENE_ELEMENT_LABELS[cat] || cat }}</span>
              <span
                v-for="e in list"
                :key="e.id"
                class="elem-chip"
                :class="{ linked: e.assetId }"
                :title="e.note || ''"
              >
                {{ e.name }}<span v-if="e.assetId" class="elem-link" title="已回链资源">🔗</span>
              </span>
            </template>
          </div>
          <div v-if="beats.length" class="beats-row">
            <div v-for="b in beats" :key="b.id" class="beat-card">
              <span class="beat-no mono">B{{ b.idx }}</span>
              <span v-if="b.beatType" class="beat-type">{{ BEAT_TYPE_LABELS[b.beatType] || b.beatType }}</span>
              <span class="beat-sum">{{ b.summary }}</span>
              <span v-if="b.valueShift" class="beat-shift">{{ b.valueShift }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 连续性校验告警 -->
      <div v-if="warnings.length" class="warns" :class="{ high: highWarnings.length }">
        <div class="warns-h" @click="showWarns = !showWarns">
          <span>
            ⚠ 连续性校验：{{ warnings.length }} 项{{ highWarnings.length ? `（${highWarnings.length} 项严重）` : '' }}
          </span>
          <span class="warns-actions">
            <button class="warns-help-btn" title="这是什么？" @click.stop="showWarnHelp = !showWarnHelp">?</button>
            <span class="warns-toggle">{{ showWarns ? '收起 ▲' : '展开 ▼' }}</span>
          </span>
        </div>
        <transition name="collapse">
          <div v-if="showWarnHelp" class="warns-help">
            连续性校验是内置「场记」在拆完镜后自动做的一次<strong>纯本地</strong>检查（不消耗 AI 额度），
            提示可能影响成片连贯性的问题，<strong>只是建议、不阻断生成</strong>。常见项：
            <ul>
              <li><b>跳轴</b>：同一段对话/对峙里相机越过了 180° 轴线，导致人物左右关系突然对调。解决：让相邻镜头「轴线」保持同侧，或在换侧处插一个轴线为 <code>N</code>（过轴/中性）的镜头。多镜 L/R 反复交替多为「正反打」被误标，确认相机同侧即可忽略。</li>
              <li><b>时长</b>：单镜超 6s 或全场总时长偏离目标过多 —— 调对应镜头的「时长」。</li>
              <li><b>对白漏词</b>：有台词没被任何镜头承载 —— 给该句配一个说话/反应镜。</li>
              <li><b>节拍覆盖</b>：有节拍没镜头、或有镜头没归属节拍 —— 在镜头里设置所属节拍。</li>
            </ul>
          </div>
        </transition>
        <transition name="collapse">
          <ul v-if="showWarns" class="warns-list">
            <li v-for="(w, i) in warnings" :key="i" :class="w.level">{{ w.message }}</li>
          </ul>
        </transition>
      </div>

      <div v-if="shots.length === 0" class="empty card">
        <div class="h-display" style="font-size: 15px; margin-bottom: 6px">该场景还没有分镜</div>
        <div class="dim">点「拆分镜」让 AI 先出「拆解表 + 节拍」，再以节拍为骨排镜（含焦段 / 主体 / 朝向 / 视线）。</div>
      </div>

      <div v-else class="table panel">
      <div class="tr th">
        <div class="c-idx">#</div>
        <div class="c-size">景别</div>
        <div class="c-ang">机位</div>
        <div class="c-mov">运镜</div>
        <div class="c-dur">时长</div>
        <div class="c-dia">对白 / 动作</div>
        <div class="c-st">状态</div>
        <div class="c-op"></div>
      </div>
      <template v-for="s in shots" :key="s.id">
        <div class="tr" :class="{ open: expanded === s.id }">
          <div class="c-idx mono">{{ s.idx }}</div>
          <div class="c-size">
            <select v-model="s.shotSize" @change="saveShot(s)">
              <option v-for="o in sizes" :key="o" :value="o">{{ o }}</option>
            </select>
          </div>
          <div class="c-ang">
            <select v-model="s.cameraAngle" @change="saveShot(s)">
              <option v-for="o in angles" :key="o" :value="o">{{ o }}</option>
            </select>
          </div>
          <div class="c-mov">
            <select v-model="s.cameraMove" @change="saveShot(s)">
              <option v-if="s.cameraMove && !moves.includes(s.cameraMove as any)" :value="s.cameraMove">
                {{ s.cameraMove }}
              </option>
              <option v-for="o in moves" :key="o" :value="o">{{ CAMERA_MOVE_LABELS[o] || o }}</option>
            </select>
          </div>
          <div class="c-dur mono">{{ (s.durationSec || 0).toFixed(0) }}s</div>
          <div class="c-dia">
            <span v-if="beatOf(s.beatId)" class="beat-tag mono" :title="beatOf(s.beatId)?.summary || ''">
              B{{ beatOf(s.beatId)?.idx }}
            </span>
            <div v-if="s.dialogue" class="dia">“{{ s.dialogue }}”</div>
            <div class="act dim">{{ s.action }}</div>
          </div>
          <div class="c-st"><span class="dot" :class="statusOf(s.id)" /></div>
          <div class="c-op">
            <button class="btn sm" @click="expanded = expanded === s.id ? '' : s.id">
              {{ expanded === s.id ? '收起' : '展开' }}
            </button>
          </div>
        </div>

        <div v-if="expanded === s.id" class="detail">
          <div class="d-grid">
            <div class="d-left">
              <label class="label">引用资源（一致性来源）</label>
              <div class="chips">
                <span
                  v-for="a in refsOf[s.id] || []"
                  :key="a.id"
                  class="chip on"
                  :class="{ noimg: !a.hasImage }"
                >
                  <img
                    v-if="a.cover"
                    :src="mediaUrl(a.cover)"
                    class="chip-thumb"
                    title="点击预览设定图"
                    @click.stop="previewRef(a)"
                  />
                  <span v-else class="chip-noimg" title="缺设定图">⚠</span>
                  <span class="chip-name" :title="a.name">{{ a.name }}</span>
                  <button class="x" @click.stop="removeRef(s.id, a.id)">✕</button>
                </span>
                <select
                  class="add-ref"
                  @change="addRef(s.id, ($event.target as HTMLSelectElement).value); ($event.target as HTMLSelectElement).value = ''"
                >
                  <option value="">+ 手动添加引用资源…</option>
                  <option v-for="a in availableAssets" :key="a.id" :value="a.id">
                    {{ a.name }}（{{ TYPE_ZH(a.type) }}）
                  </option>
                </select>
              </div>
              <div v-if="(suggestOf[s.id] || []).length" class="suggest">
                <span class="sug-label">本镜涉及（点击引用）：</span>
                <button
                  v-for="a in suggestOf[s.id]"
                  :key="a.id"
                  class="sug-chip"
                  @click="addRef(s.id, a.id)"
                >
                  + {{ a.name }}<span class="sug-type">{{ TYPE_ZH(a.type) }}</span>
                </button>
              </div>

              <div v-if="!canGenerate(s.id)" class="rule-warn">
                ⚠ 引用资源「{{ refsMissingImage(s.id).map((a) => a.name).join('、') }}」还没有设定图，
                需先到「资源库」为其生成设定图，才能生成提示词 / 分镜图。
              </div>

              <label class="label">分镜文生图提示词</label>
              <textarea v-model="s.storyboardPrompt" rows="5" placeholder="点「生成提示词」由 AI 结合场景+引用资源生成" />
              <div class="d-actions">
                <button class="btn" :disabled="!canGenerate(s.id) || promptBusy[s.id]" @click="genPrompt(s)">
                  <span v-if="promptBusy[s.id]" class="dot running" />
                  {{ promptBusy[s.id] ? '生成中…' : '✦ 生成提示词' }}
                </button>
                <button class="btn" @click="saveShot(s)">保存</button>
                <button class="btn primary" :disabled="!canGenerate(s.id) || imgBusy(s.id)" @click="genImage(s)">
                  <span v-if="imgBusy(s.id)" class="dot running" />
                  {{ imgBusy(s.id) ? '生成中…' : '⚡ 生成分镜图' }}
                </button>
              </div>

              <label class="label" style="margin-top: 14px">镜头细节（电影级）</label>
              <div class="cine-grid">
                <label class="cine-f"><span>焦段</span>
                  <select v-model="s.lens" @change="saveShot(s)">
                    <option :value="null">—</option>
                    <option v-for="o in lenses" :key="o" :value="o">{{ o }}</option>
                  </select>
                </label>
                <label class="cine-f"><span>轴线</span>
                  <select v-model="s.axisSide" @change="saveShot(s)">
                    <option :value="null">—</option>
                    <option v-for="o in axisSides" :key="o" :value="o">{{ o }}</option>
                  </select>
                </label>
                <label class="cine-f"><span>同期声</span>
                  <select v-model="s.soundType" @change="saveShot(s)">
                    <option :value="null">—</option>
                    <option v-for="o in soundTypes" :key="o" :value="o">{{ SOUND_TYPE_LABELS[o] || o }}</option>
                  </select>
                </label>
                <label class="cine-f wide"><span>主体</span><input v-model="s.subjectInFrame" placeholder="画面主体" @change="saveShot(s)" /></label>
                <label class="cine-f wide"><span>朝向</span><input v-model="s.screenDirection" placeholder="如：面朝画右" @change="saveShot(s)" /></label>
                <label class="cine-f wide"><span>视线</span><input v-model="s.eyeline" placeholder="如：看向画左的对方" @change="saveShot(s)" /></label>
                <label class="cine-f wide"><span>连续性</span><input v-model="s.continuityNotes" placeholder="与上镜衔接 / 道具状态" @change="saveShot(s)" /></label>
              </div>
            </div>
            <div class="d-right">
              <label class="label">分镜图（{{ (imgsOf[s.id] || []).length }}）</label>
              <div class="shot-imgs">
                <div
                  v-for="(img, i) in imgsOf[s.id] || []"
                  :key="img.id"
                  class="simg"
                  :class="{ sel: img.isSelected === 1 }"
                  @click="selectImage(s.id, img)"
                >
                  <img :src="mediaUrl(img.filePath)" />
                  <span v-if="img.isSelected === 1" class="sel-tag">首帧</span>
                  <span class="zoom" title="预览" @click.stop="previewShotImages(s.id, i)">⤢</span>
                </div>
                <div v-if="!(imgsOf[s.id] || []).length" class="dim small">还没有分镜图</div>
              </div>
              <button
                v-if="statusOf(s.id) === 'failed'"
                class="btn sm danger"
                style="margin-top: 8px"
                @click="retryShot(s)"
              >
                ↻ 上次生图失败，重试
              </button>
            </div>
          </div>
        </div>
      </template>
    </div>
    </template>

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
.sb {
  padding: 22px 26px;
}
/* 拆解表 · 节拍 面板 */
.sheet {
  margin-bottom: 12px;
  padding: 0;
  overflow: hidden;
}
.sheet-h {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  cursor: pointer;
}
.sheet-toggle {
  font-size: 12px;
  color: var(--dim);
}
.sheet-body {
  padding: 0 14px 14px;
  border-top: 1px solid var(--hair);
}
.elem-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin: 12px 0;
}
.elem-cat {
  margin: 0 2px 0 8px;
  color: var(--muted);
}
.elem-cat:first-child {
  margin-left: 0;
}
.elem-chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  background: var(--raised);
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 2px 10px;
  font-size: 12px;
}
.elem-chip.linked {
  border-color: var(--teal);
  color: var(--text);
}
.elem-link {
  font-size: 10px;
}
.beats-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.beat-card {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 6px 10px;
  background: var(--surface);
  border-left: 2px solid var(--accent);
  border-radius: var(--r-sm);
  font-size: 13px;
}
.beat-no {
  color: var(--accent);
  font-weight: 700;
}
.beat-type {
  font-size: 11px;
  color: var(--accent-on);
  background: var(--accent);
  border-radius: 999px;
  padding: 0 7px;
}
.beat-sum {
  flex: 1;
}
.beat-shift {
  font-size: 11px;
  color: var(--st-warning);
}
/* 连续性告警 */
.warns {
  margin-bottom: 12px;
  padding: 10px 14px;
  border: 1px solid rgba(255, 179, 64, 0.4);
  background: rgba(255, 179, 64, 0.08);
  border-radius: var(--r-md);
}
.warns.high {
  border-color: rgba(255, 93, 93, 0.5);
  background: rgba(255, 93, 93, 0.08);
}
.warns-h {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--st-warning);
  margin-bottom: 6px;
  cursor: pointer;
  user-select: none;
}
.warns.high .warns-h {
  color: var(--st-failed);
}
.warns-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.warns-toggle {
  font-size: 12px;
  font-weight: 400;
  color: var(--dim);
}
.warns-help-btn {
  width: 18px;
  height: 18px;
  line-height: 1;
  border-radius: 50%;
  border: 1px solid currentColor;
  background: transparent;
  color: inherit;
  font-size: 11px;
  cursor: pointer;
  opacity: 0.8;
}
.warns-help-btn:hover {
  opacity: 1;
}
.warns-help {
  margin: 4px 0 8px;
  padding: 10px 12px;
  background: var(--surface);
  border-radius: var(--r-sm);
  font-size: 12px;
  line-height: 1.7;
  color: var(--dim);
  overflow: hidden;
}
.warns-help ul {
  margin: 6px 0 0;
  padding-left: 18px;
}
.warns-help li {
  margin-bottom: 3px;
}
.warns-help b {
  color: var(--text);
}
.warns-help code {
  font-family: var(--font-mono, monospace);
  background: var(--raised);
  border-radius: 3px;
  padding: 0 4px;
}
.collapse-enter-active,
.collapse-leave-active {
  transition: opacity 0.18s ease, max-height 0.22s ease;
  max-height: 800px;
}
.collapse-enter-from,
.collapse-leave-to {
  opacity: 0;
  max-height: 0;
}
@media (prefers-reduced-motion: reduce) {
  .collapse-enter-active,
  .collapse-leave-active {
    transition: none;
  }
}
.warns-list {
  margin: 0;
  padding-left: 18px;
}
.warns-list li {
  font-size: 12px;
  color: var(--dim);
  line-height: 1.6;
}
.warns-list li.high {
  color: var(--st-failed);
}
/* 每镜节拍标签 */
.beat-tag {
  display: inline-block;
  font-size: 10px;
  color: var(--accent);
  background: var(--accent-soft);
  border-radius: 3px;
  padding: 0 5px;
  margin-bottom: 3px;
}
/* 镜头细节（电影级）编辑网格 */
.cine-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 4px;
}
.cine-f {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.cine-f.wide {
  grid-column: span 3;
  flex-direction: row;
  align-items: center;
  gap: 8px;
}
.cine-f > span {
  font-size: 11px;
  color: var(--muted);
  white-space: nowrap;
}
.cine-f.wide > span {
  width: 44px;
  flex-shrink: 0;
}
.cine-f select,
.cine-f input {
  height: 30px;
  padding: 0 8px;
  font-size: 12px;
  line-height: 30px;
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
.actions {
  display: flex;
  gap: 8px;
  align-items: center;
}
.pop-anchor {
  position: relative;
}
.scene-sel {
  width: 260px;
}
.empty {
  padding: 36px;
  text-align: center;
}
.dim {
  color: var(--dim);
}
.small {
  font-size: 12px;
}
.table {
  overflow: visible;
}
.tr {
  display: grid;
  grid-template-columns: 40px 96px 96px 110px 56px 1fr 50px 80px;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--hair);
}
.tr.th {
  background: var(--surface);
  border-bottom: 1px solid var(--line);
}
.th div {
  font-family: var(--font-display);
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 0.06em;
  color: var(--muted);
}
.tr select {
  height: 28px;
  padding: 0 6px;
  font-size: 12px;
}
.dia {
  color: var(--text);
  font-size: 13px;
}
.act {
  font-size: 12px;
}
.c-op {
  text-align: right;
}
.suggest {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin: 8px 0 14px;
}
.sug-label {
  font-size: 11px;
  color: var(--dim);
}
.sug-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: transparent;
  border: 1px dashed var(--teal);
  color: var(--teal);
  border-radius: 2px;
  padding: 2px 8px;
  font-size: 12px;
  cursor: pointer;
}
.sug-chip:hover {
  background: rgba(55, 182, 171, 0.12);
}
.sug-type {
  font-size: 10px;
  color: var(--muted);
}
.detail {
  background: var(--surface);
  border-bottom: 1px solid var(--line);
  padding: 16px 18px;
}
.d-grid {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 18px;
}
.label {
  display: block;
  margin: 0 0 6px;
  font-family: var(--font-display);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-size: 11px;
  color: var(--dim);
}
.chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-bottom: 14px;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 200px;
  background: var(--raised);
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 3px 8px 3px 4px;
  font-size: 12px;
}
.chip.on {
  border-color: var(--teal);
}
.chip.noimg {
  border-color: var(--st-warning);
  border-style: dashed;
}
.chip-thumb {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  object-fit: cover;
  cursor: pointer;
  flex-shrink: 0;
}
.chip-noimg {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255, 179, 64, 0.16);
  color: var(--st-warning);
  font-size: 12px;
  flex-shrink: 0;
}
.chip-name {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.chip .x {
  background: transparent;
  border: none;
  color: var(--muted);
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;
}
.add-ref {
  width: auto;
  min-width: 150px;
  height: 28px;
  font-size: 12px;
}
.rule-warn {
  display: block;
  margin: 0 0 12px;
  padding: 8px 10px;
  border: 1px solid rgba(255, 179, 64, 0.4);
  background: rgba(255, 179, 64, 0.1);
  border-radius: var(--r-sm);
  color: var(--st-warning);
  font-size: 12px;
  line-height: 1.5;
}
.d-actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}
.shot-imgs {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
.simg {
  position: relative;
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  overflow: hidden;
  cursor: pointer;
}
.simg.sel {
  border-color: var(--accent);
}
.simg img {
  width: 100%;
  aspect-ratio: 9/16;
  object-fit: cover;
  display: block;
  background: var(--bg);
}
.sel-tag {
  position: absolute;
  top: 4px;
  left: 4px;
  background: var(--accent);
  color: var(--accent-on);
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 2px;
}
.zoom {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 12px;
  opacity: 0;
  transition: opacity 0.16s ease;
}
.simg:hover .zoom {
  opacity: 1;
}
</style>
