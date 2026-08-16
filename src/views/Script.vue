<script setup lang="ts">
import { ref, onMounted, computed, reactive, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import type { ScriptTree } from '@shared/ipc'
import type { Scene, SceneDialogue } from '@shared/types'
import { useAppStore } from '../stores/app'
import { useTasksStore } from '../stores/tasks'
import Modal from '../components/Modal.vue'
import StyleBibleDialog from '../components/StyleBibleDialog.vue'

const route = useRoute()
const app = useAppStore()
const tasks = useTasksStore()
const { lastEvent, runningStages } = storeToRefs(tasks)
const projectId = computed(() => route.params.projectId as string)
// 全局生成中状态（切走再回来仍在）
const scriptBusy = computed(() => runningStages.value.has('script'))
const showStyle = ref(false)

const tree = ref<ScriptTree | null>(null)
const loading = ref(false)
const selectedSceneId = ref<string>('')

const genForm = reactive({ genre: '都市逆袭', episodes: 2, durationSecPerEp: 60, logline: '' })
const showGen = ref(false)
const showUpload = ref(false)
const uploadTitle = ref('')
const uploadText = ref('')

const GENRES = ['都市逆袭', '古装甜宠', '悬疑反转', '霸总虐恋', '战神归来', '校园青春', '玄幻修仙']
const genCustom = ref(false)
const genCustomText = ref('')
const genCustomInput = ref<HTMLInputElement | null>(null)
function pickGenre(g: string): void {
  genCustom.value = false
  genForm.genre = g
}
async function enableGenCustom(): Promise<void> {
  genCustom.value = true
  await nextTick()
  genCustomInput.value?.focus()
}
// 题材一致性：随机生成弹窗默认带出项目创建时设的题材（含自定义），无需用户再设一遍
function initGenreFromProject(): void {
  const g = app.project?.genreDefault?.trim()
  if (!g) return
  if (GENRES.includes(g)) {
    genCustom.value = false
    genForm.genre = g
  } else {
    genCustom.value = true
    genCustomText.value = g
  }
}
function openGen(): void {
  initGenreFromProject()
  showGen.value = true
}

async function load(): Promise<void> {
  const t = await window.api.script.getTree(projectId.value)
  tree.value = t
  if (t) {
    // 保持当前选中场景；若已失效则回退到第一场
    const stillThere = t.episodes.some((ep) => ep.scenes.some((sc) => sc.id === selectedSceneId.value))
    if (!stillThere) selectedSceneId.value = t.episodes[0]?.scenes[0]?.id ?? ''
  } else {
    selectedSceneId.value = ''
  }
}
onMounted(load)

// 后台 LLM 任务完成后自动刷新（修复"生成后当前界面不刷新，要切走再回来"）
watch(lastEvent, (e) => {
  if (e && e.kind === 'llm' && e.status === 'success') load()
})

const outline = computed(() => {
  if (!tree.value?.script.outline) return null
  try {
    return JSON.parse(tree.value.script.outline)
  } catch {
    return null
  }
})

const selectedScene = computed<(Scene & { shots: unknown[] }) | null>(() => {
  if (!tree.value) return null
  for (const ep of tree.value.episodes) {
    for (const sc of ep.scenes) if (sc.id === selectedSceneId.value) return sc
  }
  return null
})

async function generate(): Promise<void> {
  if (scriptBusy.value) return
  const genre = genCustom.value ? genCustomText.value.trim() : genForm.genre
  if (!genre) {
    app.notify(genCustom.value ? '请填写自定义题材' : '请选择题材', 'error')
    genCustomInput.value?.focus()
    return
  }
  if (tree.value) {
    const ok = await app.confirm(
      '当前项目已有剧本。重新生成将【覆盖】现有的大纲 / 分集 / 场景，以及其下已生成的分镜、图片、视频。确定要覆盖吗？'
    )
    if (!ok) return
  }
  showGen.value = false // 立即关闭弹窗，状态显示在当前界面 + 左下角过程浮层
  loading.value = true
  try {
    // 单一来源：用户改了题材就写回项目默认，避免下游风格/题材漂移
    if (genre !== app.project?.genreDefault) {
      try {
        await window.api.project.update(projectId.value, { genreDefault: genre })
        await app.loadProject(projectId.value)
      } catch {
        /* 同步失败不阻断生成 */
      }
    }
    tree.value = await window.api.script.generate(projectId.value, { ...genForm, genre })
    selectedSceneId.value = tree.value.episodes[0]?.scenes[0]?.id ?? ''
    app.notify('剧本已生成')
  } catch (e) {
    app.notify('生成失败：' + (e as Error).message, 'error')
  } finally {
    loading.value = false
  }
}

async function onFile(e: Event): Promise<void> {
  const files = Array.from((e.target as HTMLInputElement).files ?? [])
  if (!files.length) return
  // 支持一次选多章：按文件名排序后拼接
  files.sort((a, b) => a.name.localeCompare(b.name, 'zh'))
  const parts: string[] = []
  for (const f of files) parts.push(await f.text())
  uploadText.value = parts.join('\n\n')
  uploadTitle.value = files.length > 1 ? files[0].name.replace(/\d+.*$/, '') || files[0].name : files[0].name
}

async function upload(): Promise<void> {
  if (!uploadText.value.trim()) {
    app.notify('请粘贴或选择剧本文本', 'error')
    return
  }
  if (scriptBusy.value) return
  if (tree.value) {
    const ok = await app.confirm(
      '当前项目已有剧本。上传拆解将【覆盖】现有的大纲 / 分集 / 场景，以及其下已生成的分镜、图片、视频。确定要覆盖吗？'
    )
    if (!ok) return
  }
  showUpload.value = false
  loading.value = true
  try {
    tree.value = await window.api.script.parseUpload(projectId.value, {
      title: uploadTitle.value || undefined,
      text: uploadText.value
    })
    selectedSceneId.value = tree.value.episodes[0]?.scenes[0]?.id ?? ''
    app.notify('剧本已拆解入库')
  } catch (e) {
    app.notify('拆解失败：' + (e as Error).message, 'error')
  } finally {
    loading.value = false
  }
}

function ensureDialogues(): SceneDialogue[] {
  const sc = selectedScene.value
  if (!sc) return []
  if (!sc.dialogues) sc.dialogues = []
  return sc.dialogues
}
function addDlg(): void {
  ensureDialogues().push({ character: '', text: '', note: '' })
}
function removeDlg(i: number): void {
  selectedScene.value?.dialogues?.splice(i, 1)
}

async function saveScene(): Promise<void> {
  const sc = selectedScene.value
  if (!sc) return
  await window.api.script.updateScene(sc.id, {
    slugline: sc.slugline,
    location: sc.location,
    timeOfDay: sc.timeOfDay,
    description: sc.description,
    dialogues: sc.dialogues ?? []
  })
  app.notify('场景已保存')
}
</script>

<template>
  <div class="script">
    <div class="head">
      <h2 class="h-display page-title">① 剧本 · SCRIPT</h2>
      <div class="actions">
        <button class="btn" @click="showStyle = true">◐ 风格圣经</button>
        <button class="btn" :disabled="scriptBusy" @click="showUpload = true">⬆ 上传剧本</button>
        <button class="btn primary" :disabled="scriptBusy" @click="openGen">✦ 随机生成</button>
      </div>
    </div>

    <div v-if="scriptBusy" class="busy card">
      <span class="dot running" /> 剧本生成中… 左下角「生成过程」可看实时进度（切到其它页面也不会中断）
    </div>

    <div v-if="!tree && !scriptBusy" class="empty card">
      <div class="h-display" style="font-size: 16px; margin-bottom: 6px">还没有剧本</div>
      <div class="dim">用剧本智能体随机生成，或上传你自己的剧本（txt / md / 粘贴文本）。</div>
    </div>

    <div v-if="tree" class="three">
      <!-- 左：大纲/分集/场景树 -->
      <div class="col tree panel scroll">
        <div class="col-h label">结构</div>
        <div v-for="ep in tree.episodes" :key="ep.id" class="ep">
          <div class="ep-t h-display">第{{ ep.idx }}集 · {{ ep.title }}</div>
          <button
            v-for="sc in ep.scenes"
            :key="sc.id"
            class="scene-item"
            :class="{ active: sc.id === selectedSceneId }"
            @click="selectedSceneId = sc.id"
          >
            <span class="mono sc-idx">{{ ep.idx }}-{{ sc.idx }}</span>
            <span class="sc-name">{{ sc.location || sc.slugline || '场景' }}</span>
            <span v-if="sc.shots.length" class="mini-tag mono">{{ sc.shots.length }}镜</span>
          </button>
        </div>
      </div>

      <!-- 中：场景编辑器 -->
      <div class="col editor panel scroll">
        <div class="col-h label">场景编辑器</div>
        <div v-if="selectedScene" class="ed">
          <label class="label">场景头 Slugline</label>
          <input v-model="selectedScene.slugline" />
          <div class="row2">
            <div>
              <label class="label">地点</label>
              <input v-model="selectedScene.location" />
            </div>
            <div>
              <label class="label">时间</label>
              <input v-model="selectedScene.timeOfDay" />
            </div>
          </div>
          <label class="label">场景描述（动作 / 旁白，不含对白）</label>
          <textarea v-model="selectedScene.description" rows="8" />

          <label class="label">
            本场对白（结构化 · 逐句）
            <span class="dlg-count mono">{{ (selectedScene.dialogues || []).length }}</span>
          </label>
          <div class="dlg">
            <div v-for="(d, i) in selectedScene.dialogues || []" :key="i" class="dlg-row">
              <input v-model="d.character" class="dlg-char" placeholder="角色" />
              <input v-model="d.text" class="dlg-text" placeholder="台词（原文）" />
              <input v-model="d.note" class="dlg-note" placeholder="提示" />
              <button class="btn sm ghost dlg-x" title="删除该句" @click="removeDlg(i)">✕</button>
            </div>
            <div v-if="!(selectedScene.dialogues || []).length" class="dim small dlg-empty">
              本场暂无对白。上传剧本会自动逐句保真填入；也可点下方手动添加。
            </div>
            <button class="btn sm dlg-add" @click="addDlg">+ 添加对白</button>
          </div>

          <button class="btn primary save-btn" @click="saveScene">保存场景</button>
        </div>
        <div v-else class="dim pad">从左侧选择一个场景进行编辑。</div>
      </div>

      <!-- 右：大纲面板 -->
      <div class="col outline panel scroll">
        <div class="col-h label">剧情大纲</div>
        <div v-if="outline" class="ol">
          <div class="ol-row"><span class="label">题材</span><div>{{ outline.genre }}</div></div>
          <div v-if="outline.theme" class="ol-row"><span class="label">主题</span><div>{{ outline.theme }}</div></div>
          <div class="ol-row"><span class="label">一句话故事</span><div>{{ outline.logline }}</div></div>
          <div v-if="outline.protagonist" class="ol-row"><span class="label">主角弧光</span><div>{{ outline.protagonist }}</div></div>
          <div v-if="outline.antagonist" class="ol-row"><span class="label">对手</span><div>{{ outline.antagonist }}</div></div>
          <div class="ol-row"><span class="label">开场钩子</span><div class="hook">{{ outline.hook }}</div></div>
          <div class="ol-row">
            <span class="label">反转点</span>
            <ul>
              <li v-for="(t, i) in outline.twists || []" :key="i">{{ t }}</li>
            </ul>
          </div>
          <div class="ol-row"><span class="label">主线</span><div>{{ outline.mainline }}</div></div>
        </div>
        <div v-else class="dim pad">暂无大纲。</div>
      </div>
    </div>

    <!-- 随机生成弹窗 -->
    <Modal :open="showGen" title="随机生成剧本" @close="showGen = false">
      <label class="label">题材</label>
      <div class="genres">
        <button
          v-for="g in GENRES"
          :key="g"
          type="button"
          class="genre-chip"
          :class="{ on: !genCustom && genForm.genre === g }"
          @click="pickGenre(g)"
        >
          {{ g }}
        </button>
        <button
          type="button"
          class="genre-chip custom-chip"
          :class="{ on: genCustom }"
          @click="enableGenCustom"
        >
          ✎ 自定义
        </button>
      </div>
      <transition name="grow">
        <input
          v-if="genCustom"
          ref="genCustomInput"
          v-model="genCustomText"
          class="custom-field"
          placeholder="输入你的题材，如：星际机甲·复仇"
          maxlength="20"
        />
      </transition>
      <div class="row2" style="margin-top: 12px">
        <div>
          <label class="label">集数</label>
          <input v-model.number="genForm.episodes" type="number" min="1" max="20" />
        </div>
        <div>
          <label class="label">单集时长(秒)</label>
          <input v-model.number="genForm.durationSecPerEp" type="number" min="15" max="600" />
        </div>
      </div>
      <label class="label" style="margin-top: 12px">故事梗概（可选）</label>
      <textarea v-model="genForm.logline" rows="3" placeholder="一句话设定，留空则由 AI 自由发挥" />
      <template #footer>
        <button class="btn ghost" @click="showGen = false">取消</button>
        <button class="btn primary" :disabled="loading" @click="generate">生成</button>
      </template>
    </Modal>

    <!-- 上传弹窗 -->
    <Modal :open="showUpload" title="上传 / 粘贴剧本" @close="showUpload = false">
      <input type="file" accept=".txt,.md,.markdown" multiple @change="onFile" style="margin-bottom: 10px" />
      <div class="hint dim">可一次选多章（txt/md），将按文件名顺序合并改编。</div>
      <label class="label">或直接粘贴剧本 / 小说原文</label>
      <textarea v-model="uploadText" rows="10" placeholder="粘贴剧本全文，AI 将自动拆解为大纲/分集/场景…" />
      <template #footer>
        <button class="btn ghost" @click="showUpload = false">取消</button>
        <button class="btn primary" :disabled="loading" @click="upload">拆解入库</button>
      </template>
    </Modal>

    <StyleBibleDialog :open="showStyle" :project-id="projectId" @close="showStyle = false" />
  </div>
</template>

<style scoped>
.script {
  padding: 22px 26px;
  height: 100%;
  display: flex;
  flex-direction: column;
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
}
.busy {
  padding: 12px 16px;
  margin-bottom: 12px;
  display: flex;
  gap: 10px;
  align-items: center;
}
.empty {
  padding: 40px;
  text-align: center;
}
.three {
  flex: 1;
  display: grid;
  grid-template-columns: 230px 1fr 280px;
  gap: 12px;
  min-height: 0;
}
.col {
  min-height: 0;
  padding: 12px;
}
.col-h {
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--hair);
}
.ep {
  margin-bottom: 14px;
}
.ep-t {
  font-size: 12px;
  color: var(--accent);
  margin-bottom: 6px;
}
.scene-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  text-align: left;
  background: transparent;
  border: 1px solid transparent;
  color: var(--dim);
  padding: 6px 8px;
  border-radius: var(--r-sm);
  cursor: pointer;
  font-size: 13px;
  margin-bottom: 2px;
}
.scene-item:hover {
  background: var(--raised);
  color: var(--text);
}
.scene-item.active {
  background: var(--raised);
  color: var(--text);
  border-left: 2px solid var(--teal);
}
.sc-idx {
  font-size: 11px;
  color: var(--muted);
}
.sc-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.mini-tag {
  font-size: 10px;
  color: var(--teal);
  border: 1px solid var(--line);
  border-radius: 2px;
  padding: 0 4px;
}
label.label {
  display: block;
  margin: 10px 0 5px;
}
.row2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
/* 题材 chip（与新建项目一致） */
.genres {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.genre-chip {
  height: 32px;
  padding: 0 14px;
  border: 1px solid var(--line);
  background: var(--raised);
  color: var(--dim);
  border-radius: 999px;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.16s ease, border-color 0.16s ease, color 0.16s ease;
}
.genre-chip:hover {
  color: var(--text);
  border-color: #353d45;
}
.genre-chip.on {
  background: var(--accent-soft);
  border-color: rgba(52, 224, 139, 0.4);
  color: var(--accent);
  font-weight: 600;
}
.custom-chip {
  border-style: dashed;
}
.custom-field {
  margin-top: 10px;
}
.grow-enter-active,
.grow-leave-active {
  transition: opacity 0.22s ease, max-height 0.26s ease, margin-top 0.22s ease, transform 0.22s ease;
  overflow: hidden;
}
.grow-enter-from,
.grow-leave-to {
  opacity: 0;
  max-height: 0;
  margin-top: 0;
  transform: translateY(-4px);
}
.grow-enter-to,
.grow-leave-from {
  max-height: 60px;
}
.save-btn {
  margin-top: 16px;
}
.dlg-count {
  font-size: 11px;
  color: var(--teal);
  margin-left: 4px;
}
.dlg {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 4px;
}
.dlg-row {
  display: grid;
  grid-template-columns: 88px 1fr 92px 30px;
  gap: 6px;
  align-items: center;
}
.dlg-row input {
  height: 30px;
  padding: 0 8px;
  font-size: 12px;
}
.dlg-x {
  padding: 0;
  width: 30px;
}
.dlg-add {
  align-self: flex-start;
  margin-top: 2px;
}
.dlg-empty {
  padding: 6px 0;
}
.small {
  font-size: 12px;
}
.ol-row {
  margin-bottom: 14px;
}
.ol-row .label {
  display: block;
  margin-bottom: 4px;
}
.hook {
  color: var(--accent);
}
.ol ul {
  margin: 4px 0;
  padding-left: 18px;
}
.ol li {
  margin-bottom: 4px;
}
.pad {
  padding: 16px;
}
.dim {
  color: var(--dim);
}
.hint {
  font-size: 12px;
  margin-bottom: 8px;
}
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}
.modal {
  width: 460px;
  padding: 22px;
}
.modal-title {
  font-size: 17px;
  margin-bottom: 10px;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 20px;
}
</style>
