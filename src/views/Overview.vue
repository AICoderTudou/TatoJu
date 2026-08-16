<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Asset, Project, StyleBible } from '@shared/types'
import type { ScriptTree } from '@shared/ipc'
import StyleBibleDialog from '../components/StyleBibleDialog.vue'

const route = useRoute()
const router = useRouter()
const projectId = computed(() => route.params.projectId as string)

const tree = ref<ScriptTree | null>(null)
const assets = ref<Asset[]>([])
const shotCount = ref(0)
const shotImgCount = ref(0)
const videoCount = ref(0)

const project = ref<Project | null>(null)
const showStyle = ref(false)

async function load(): Promise<void> {
  tree.value = await window.api.script.getTree(projectId.value)
  assets.value = await window.api.asset.list(projectId.value)
  let imgs = 0
  let vids = 0
  const allShots = tree.value
    ? tree.value.episodes.flatMap((ep) => ep.scenes.flatMap((sc) => sc.shots))
    : []
  // 并发查询每镜的图/视频，避免逐镜串行 IPC 造成首屏卡顿
  const results = await Promise.all(
    allShots.map(async (sh) => {
      const [im, vd] = await Promise.all([window.api.shot.images(sh.id), window.api.shot.videos(sh.id)])
      return { hasImg: im.length > 0, hasVid: vd.length > 0 }
    })
  )
  for (const r of results) {
    if (r.hasImg) imgs++
    if (r.hasVid) vids++
  }
  shotCount.value = allShots.length
  shotImgCount.value = imgs
  videoCount.value = vids
}
async function loadProject(): Promise<void> {
  project.value = await window.api.project.get(projectId.value)
}
onMounted(async () => {
  try {
    await load()
    await loadProject()
  } catch {
    /* 加载失败不阻断下面的新建引导 */
  }
  // 新建项目带 ?newProject=1 进来：还没有剧本时自动弹一次「风格圣经」让用户先确认（可跳过）；弹完清标记，刷新不再弹
  if (route.query.newProject === '1') {
    if (!tree.value) showStyle.value = true
    router.replace({ path: route.path, query: {} })
  }
})

function onStyleSaved(p: Project): void {
  project.value = p
}
const styleSummary = computed(() => {
  if (!project.value?.styleBible) return ''
  try {
    return (JSON.parse(project.value.styleBible) as StyleBible).visualStyle ?? '已设定'
  } catch {
    return '已设定'
  }
})

const sceneCount = computed(() => tree.value?.episodes.reduce((n, ep) => n + ep.scenes.length, 0) ?? 0)
const epCount = computed(() => tree.value?.episodes.length ?? 0)
const assetCount = computed(() => assets.value.length)

const stages = computed(() => [
  { name: 'script', label: '① 剧本', done: epCount.value, total: epCount.value || 0, sub: `${epCount.value} 集 · ${sceneCount.value} 场` },
  { name: 'assets', label: '② 资源', done: assetCount.value, total: assetCount.value, sub: `${assetCount.value} 项资源` },
  { name: 'storyboard', label: '③ 分镜', done: shotImgCount.value, total: shotCount.value, sub: `${shotImgCount.value}/${shotCount.value} 已出图` },
  { name: 'clips', label: '④ 视频', done: videoCount.value, total: shotCount.value, sub: `${videoCount.value}/${shotCount.value} 已成片段` }
])

function go(name: string): void {
  router.push({ name, params: { projectId: projectId.value } })
}
</script>

<template>
  <div class="ov">
    <h2 class="h-display page-title">概览 · OVERVIEW</h2>

    <div v-if="!tree" class="guide card">
      <div class="h-display" style="font-size: 16px; margin-bottom: 6px">从剧本开始</div>
      <div class="dim" style="margin-bottom: 14px">
        本项目还没有剧本。进入「剧本」阶段，随机生成或上传一份剧本，开启创作管线。
      </div>
      <button class="btn primary" @click="go('script')">前往剧本 ①</button>
    </div>

    <div class="style-card card" :class="{ unset: !styleSummary }" @click="showStyle = true">
      <div class="sc-icon">◐</div>
      <div class="sc-main">
        <div class="sc-title h-display">
          全片风格圣经 · STYLE BIBLE
          <span class="sc-badge" :class="styleSummary ? 'on' : 'off'">{{ styleSummary ? '已设定' : '未设定' }}</span>
        </div>
        <div v-if="styleSummary" class="sc-sum dim">
          <span class="tag">{{ project?.styleRef || '自定义' }}</span> {{ styleSummary }}
        </div>
        <div v-else class="sc-sum dim">
          选内置风格模板（真人/2D/3D），或填一部参考影片，一键定全片影调（调色/灯光/镜头/质感），自动统一到资源图、分镜图、视频。
        </div>
      </div>
      <button class="btn primary sc-btn" @click.stop="showStyle = true">
        {{ styleSummary ? '编辑' : '＋ 设定风格' }}
      </button>
    </div>
    <div v-if="tree" class="style-hint dim">
      风格圣经可随时修改；但改动不会自动重刷已生成的设定图 / 分镜 / 视频。建议在生成剧本前定好。
    </div>

    <div class="stages">
      <div v-for="s in stages" :key="s.name" class="stage card" @click="go(s.name)">
        <div class="label">{{ s.label }}</div>
        <div class="stage-num h-display">{{ s.done }}<span v-if="s.total" class="of">/{{ s.total }}</span></div>
        <div class="stage-sub dim">{{ s.sub }}</div>
        <div class="bar-track">
          <div
            class="bar-fill"
            :style="{ width: (s.total ? Math.min(100, (s.done / s.total) * 100) : 0) + '%' }"
          />
        </div>
      </div>
    </div>

    <StyleBibleDialog
      :open="showStyle"
      :project-id="projectId"
      @close="showStyle = false"
      @saved="onStyleSaved"
    />
  </div>
</template>

<style scoped>
.ov {
  padding: 24px 28px;
}
.page-title {
  font-size: 16px;
  letter-spacing: 0.08em;
  margin: 0 0 20px;
}
.guide {
  margin-bottom: 22px;
  border-left: 2px solid var(--accent);
}
.style-hint {
  margin: -8px 0 16px;
  font-size: 12px;
  line-height: 1.5;
}
.style-card {
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  border-left: 3px solid var(--teal);
  transition: border-color 0.16s ease, background 0.16s ease;
}
.style-card:hover {
  background: var(--raised);
}
.style-card.unset {
  border-left-color: var(--accent);
}
.sc-icon {
  font-size: 30px;
  color: var(--teal);
  width: 40px;
  text-align: center;
  flex-shrink: 0;
}
.style-card.unset .sc-icon {
  color: var(--accent);
}
.sc-main {
  flex: 1;
  min-width: 0;
}
.sc-title {
  font-size: 14px;
  letter-spacing: 0.04em;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.sc-badge {
  font-size: 10px;
  padding: 1px 7px;
  border-radius: 9px;
}
.sc-badge.on {
  background: var(--st-success);
  color: #0c1a0b;
}
.sc-badge.off {
  background: var(--accent);
  color: var(--accent-on);
}
.sc-sum {
  font-size: 13px;
  line-height: 1.55;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.sc-btn {
  flex-shrink: 0;
}
.stages {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
}
.stage {
  cursor: pointer;
  transition: border-color 0.16s ease;
}
.stage:hover {
  border-color: var(--teal);
}
.stage-num {
  font-size: 34px;
  margin: 8px 0 2px;
}
.of {
  font-size: 18px;
  color: var(--muted);
}
.stage-sub {
  font-size: 12px;
  margin-bottom: 12px;
}
.bar-track {
  height: 4px;
  background: var(--bg);
  border-radius: 2px;
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  background: var(--accent-grad);
  transition: width 0.3s ease;
}
.dim {
  color: var(--dim);
}
</style>
