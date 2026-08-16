<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import type { ScriptTree } from '@shared/ipc'
import type { Shot, ShotImage, ShotVideo } from '@shared/types'
import { SEEDANCE_EXAMPLES } from '@shared/seedance'
import { useAppStore } from '../stores/app'
import { useTasksStore } from '../stores/tasks'
import { mediaUrl } from '../api/media'
import ImagePreview, { type PreviewItem } from '../components/ImagePreview.vue'

const route = useRoute()
const app = useAppStore()
const tasks = useTasksStore()
const { lastEvent } = storeToRefs(tasks)
const projectId = computed(() => route.params.projectId as string)

const tree = ref<ScriptTree | null>(null)
const selectedSceneId = ref('')
const shots = ref<Shot[]>([])
const imgsOf = ref<Record<string, ShotImage[]>>({})
const vidsOf = ref<Record<string, ShotVideo[]>>({})

const examples = SEEDANCE_EXAMPLES

async function load(): Promise<void> {
  tree.value = await window.api.script.getTree(projectId.value)
  if (tree.value && !selectedSceneId.value) {
    selectedSceneId.value = tree.value.episodes[0]?.scenes[0]?.id ?? ''
  }
  if (selectedSceneId.value) await loadShots()
}
onMounted(load)

async function loadShots(): Promise<void> {
  shots.value = await window.api.shot.listByScene(selectedSceneId.value)
  // 并发加载每镜的图/视频
  await Promise.all(
    shots.value.map(async (s) => {
      const [im, vd] = await Promise.all([window.api.shot.images(s.id), window.api.shot.videos(s.id)])
      imgsOf.value[s.id] = im
      vidsOf.value[s.id] = vd
    })
  )
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

function firstFrame(shotId: string): ShotImage | undefined {
  const imgs = imgsOf.value[shotId] || []
  return imgs.find((i) => i.isSelected === 1) || imgs[0]
}

async function genPrompt(s: Shot): Promise<void> {
  try {
    const updated = await window.api.shot.genVideoPrompt(s.id)
    const i = shots.value.findIndex((x) => x.id === s.id)
    if (i >= 0) shots.value[i] = updated
    app.notify('已生成视频提示词')
  } catch (e) {
    app.notify((e as Error).message, 'error')
  }
}

async function saveShot(s: Shot): Promise<void> {
  await window.api.shot.update(s.id, { videoPrompt: s.videoPrompt })
}

async function genVideo(s: Shot): Promise<void> {
  try {
    await window.api.gen.videoForShot(s.id)
    app.notify('已提交图生视频，见任务中心')
  } catch (e) {
    app.notify((e as Error).message, 'error')
  }
}

async function fillExample(s: Shot, ex: string): Promise<void> {
  // 不再无脑覆盖：已有内容时先确认，避免抹掉用户/AI 已写的提示词
  if (s.videoPrompt && s.videoPrompt.trim()) {
    const ok = await app.confirm('当前镜头已有视频提示词，确定用范例覆盖吗？')
    if (!ok) return
  }
  s.videoPrompt = ex
  saveShot(s)
}

// 选用某条生成的视频（下游拼接/资源中心依赖 is_selected）
async function selectVideo(shotId: string, v: ShotVideo): Promise<void> {
  await window.api.shot.selectVideo(shotId, v.id)
  vidsOf.value[shotId] = await window.api.shot.videos(shotId)
}

// 失败态/重试
function videoFailed(shotId: string): boolean {
  return tasks.latestGen('shot', shotId, 'video')?.status === 'failed'
}
async function retryVideo(s: Shot): Promise<void> {
  const g = tasks.latestGen('shot', s.id, 'video')
  if (g) await tasks.retry(g.id)
}

// 资源预览（首帧图 / 视频碎片）
const preview = ref<{ open: boolean; items: PreviewItem[]; index: number }>({
  open: false,
  items: [],
  index: 0
})
function previewFrame(shotId: string): void {
  const f = firstFrame(shotId)
  if (!f) return
  preview.value = {
    open: true,
    index: 0,
    items: [{ src: mediaUrl(f.filePath), filePath: f.filePath, type: 'image', title: '分镜首帧' }]
  }
}
function previewVideos(shotId: string, i: number): void {
  const vids = vidsOf.value[shotId] || []
  if (!vids.length) return
  preview.value = {
    open: true,
    index: i,
    items: vids.map((v) => ({
      src: mediaUrl(v.filePath),
      filePath: v.filePath,
      type: 'video',
      title: '视频碎片'
    }))
  }
}

watch(lastEvent, async (evt) => {
  if (evt?.refKind === 'shot' && evt.status === 'success' && evt.kind === 'video') {
    if (evt.refId) vidsOf.value[evt.refId] = await window.api.shot.videos(evt.refId)
  }
})
</script>

<template>
  <div class="clips">
    <div class="head">
      <h2 class="h-display page-title">④ 视频碎片 · CLIPS</h2>
      <select v-model="selectedSceneId" class="scene-sel">
        <option v-for="sc in scenes" :key="sc.id" :value="sc.id">{{ sc.label }}</option>
      </select>
    </div>

    <div v-if="!tree" class="empty card dim">请先生成剧本与分镜。</div>
    <div v-else-if="shots.length === 0" class="empty card dim">该场景还没有分镜，请先到「分镜板」拆镜。</div>

    <div class="list">
      <div v-for="s in shots" :key="s.id" class="clip card">
        <div class="frame" :class="{ clickable: !!firstFrame(s.id) }" @click="previewFrame(s.id)">
          <img v-if="firstFrame(s.id)" :src="mediaUrl(firstFrame(s.id)!.filePath)" />
          <div v-else class="noframe">
            <span class="mono">{{ s.idx }}</span>
            <span class="dim small">无首帧<br />请先在分镜板出图</span>
          </div>
          <span class="shot-no mono">SHOT {{ s.idx }}</span>
          <span v-if="firstFrame(s.id)" class="zoom" title="预览首帧">⤢</span>
        </div>

        <div class="body">
          <div class="meta label">
            {{ s.shotSize }} · {{ s.cameraAngle }} · {{ s.cameraMove }} · {{ (s.durationSec || 5).toFixed(0) }}s
          </div>
          <label class="label">Seedance 2.0 视频提示词</label>
          <textarea v-model="s.videoPrompt" rows="4" placeholder="点「生成提示词」由 AI 看图生成图生视频提示词" />
          <div class="ex">
            <span class="label">范例：</span>
            <button v-for="(ex, i) in examples" :key="i" class="ex-btn" :title="ex" @click="fillExample(s, ex)">
              范例{{ i + 1 }}
            </button>
          </div>
          <div class="actions">
            <button class="btn" @click="genPrompt(s)">✦ 生成提示词</button>
            <button class="btn" @click="saveShot(s)">保存</button>
            <button class="btn primary" @click="genVideo(s)">► 图生视频</button>
          </div>
          <div v-if="videoFailed(s.id)" class="fail-note">
            ✕ 上次图生视频失败
            <button class="btn sm" @click="retryVideo(s)">↻ 重试</button>
          </div>

          <div v-if="(vidsOf[s.id] || []).length" class="vids">
            <div
              v-for="(v, i) in vidsOf[s.id]"
              :key="v.id"
              class="vidwrap"
              :class="{ sel: v.isSelected === 1 }"
              :title="v.isSelected === 1 ? '已选用' : '点「选用」设为成片采用版本'"
            >
              <video :src="mediaUrl(v.filePath)" controls loop muted />
              <span class="vtag mono">v{{ i + 1 }}</span>
              <span v-if="v.isSelected === 1" class="sel-tag">✓ 选用</span>
              <button v-else class="use-btn" @click="selectVideo(s.id, v)">选用</button>
              <span class="zoom" title="放大预览" @click="previewVideos(s.id, i)">⤢</span>
            </div>
          </div>
        </div>
      </div>
    </div>

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
.clips {
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
.list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.clip {
  display: grid;
  grid-template-columns: 160px 1fr;
  gap: 16px;
  padding: 14px;
}
.frame {
  position: relative;
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  overflow: hidden;
  background: var(--bg);
  aspect-ratio: 9/16;
}
.frame.clickable {
  cursor: pointer;
}
.frame img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.noframe {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-align: center;
}
.noframe .mono {
  font-size: 26px;
  color: var(--muted);
}
.shot-no {
  position: absolute;
  bottom: 4px;
  left: 4px;
  background: rgba(0, 0, 0, 0.6);
  color: var(--text);
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 2px;
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
.frame:hover .zoom,
.vidwrap:hover .zoom {
  opacity: 1;
}
.body {
  min-width: 0;
}
.meta {
  margin-bottom: 10px;
}
.label {
  display: block;
  margin-bottom: 5px;
}
.ex {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 8px 0;
}
.ex .label {
  display: inline;
  margin: 0;
}
.ex-btn {
  background: var(--raised);
  border: 1px solid var(--line);
  color: var(--dim);
  border-radius: 2px;
  padding: 2px 8px;
  font-size: 11px;
  cursor: pointer;
}
.ex-btn:hover {
  color: var(--text);
  border-color: var(--teal);
}
.actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
.fail-note {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
  padding: 6px 10px;
  border: 1px solid rgba(255, 93, 93, 0.4);
  background: rgba(255, 93, 93, 0.08);
  border-radius: var(--r-sm);
  color: var(--st-failed);
  font-size: 12px;
}
.vids {
  display: flex;
  gap: 10px;
  margin-top: 12px;
  flex-wrap: wrap;
}
.vidwrap {
  position: relative;
  border-radius: var(--r-sm);
}
.vidwrap.sel {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}
.vids video {
  width: 135px;
  aspect-ratio: 9/16;
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  background: var(--bg);
  display: block;
}
.vtag {
  position: absolute;
  top: 4px;
  left: 4px;
  background: rgba(0, 0, 0, 0.6);
  color: var(--text);
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 2px;
}
.sel-tag {
  position: absolute;
  bottom: 4px;
  left: 4px;
  background: var(--accent);
  color: var(--accent-on);
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 2px;
  font-weight: 700;
}
.use-btn {
  position: absolute;
  bottom: 4px;
  left: 4px;
  background: rgba(0, 0, 0, 0.66);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.25);
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 999px;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.16s ease;
}
.vidwrap:hover .use-btn {
  opacity: 1;
}
</style>
