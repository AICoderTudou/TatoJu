<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '../stores/app'
import Modal from './Modal.vue'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()
const router = useRouter()
const app = useAppStore()

const newName = ref('')
const newGenre = ref('都市逆袭')
const custom = ref(false)
const customGenre = ref('')
const aspect = ref('9:16')
const loading = ref(false)
const nameInput = ref<HTMLInputElement | null>(null)
const customInput = ref<HTMLInputElement | null>(null)

const GENRES = ['都市逆袭', '古装甜宠', '悬疑反转', '霸总虐恋', '战神归来', '校园青春', '玄幻修仙']

interface Ratio {
  value: string
  res: string
  tag: string
}
const RATIOS: Ratio[] = [
  { value: '9:16', res: '1080×1920', tag: '竖屏' },
  { value: '3:4', res: '1080×1440', tag: '竖屏' },
  { value: '1:1', res: '1080×1080', tag: '方形' },
  { value: '4:3', res: '1440×1080', tag: '横屏' },
  { value: '16:9', res: '1920×1080', tag: '横屏' },
  { value: '21:9', res: '2560×1080', tag: '电影' }
]
// 把比例换算成一个不超过 24px 的缩略矩形，直观表达方向
function glyphStyle(value: string): { width: string; height: string } {
  const [w, h] = value.split(':').map(Number)
  const max = 24
  const scale = max / Math.max(w, h)
  return { width: `${(w * scale).toFixed(1)}px`, height: `${(h * scale).toFixed(1)}px` }
}

watch(
  () => props.open,
  async (o) => {
    if (o) {
      newName.value = ''
      newGenre.value = '都市逆袭'
      custom.value = false
      customGenre.value = ''
      // 画幅默认带出「设置 · 新建项目默认画幅」，用户可在此逐项目改
      try {
        const st = await window.api.settings.get()
        aspect.value = RATIOS.some((r) => r.value === st.defaultAspectRatio) ? st.defaultAspectRatio : '9:16'
      } catch {
        aspect.value = '9:16'
      }
      await nextTick()
      nameInput.value?.focus()
    }
  }
)

function pickPreset(g: string): void {
  custom.value = false
  newGenre.value = g
}
async function enableCustom(): Promise<void> {
  custom.value = true
  await nextTick()
  customInput.value?.focus()
}

async function create(): Promise<void> {
  if (!newName.value.trim()) {
    app.notify('请填写项目名', 'error')
    return
  }
  const genre = custom.value ? customGenre.value.trim() : newGenre.value
  if (custom.value && !genre) {
    app.notify('请填写自定义题材', 'error')
    customInput.value?.focus()
    return
  }
  loading.value = true
  try {
    const p = await window.api.project.create({
      name: newName.value.trim(),
      genreDefault: genre,
      aspectRatio: aspect.value
    })
    emit('close')
    // 带标记进项目：概览据此自动弹一次「风格圣经」让用户先确认（可跳过）
    router.push({ path: `/p/${p.id}`, query: { newProject: '1' } })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <Modal :open="open" title="新建项目" :width="460" @close="emit('close')">
    <label class="label blk">项目名</label>
    <input ref="nameInput" v-model="newName" placeholder="如：龙王赘婿·第一季" @keyup.enter="create" />

    <label class="label blk" style="margin-top: 14px">默认题材</label>
    <div class="genres">
      <button
        v-for="g in GENRES"
        :key="g"
        type="button"
        class="genre-chip"
        :class="{ on: !custom && newGenre === g }"
        @click="pickPreset(g)"
      >
        {{ g }}
      </button>
      <button type="button" class="genre-chip custom-chip" :class="{ on: custom }" @click="enableCustom">
        ✎ 自定义
      </button>
    </div>

    <transition name="grow">
      <input
        v-if="custom"
        ref="customInput"
        v-model="customGenre"
        class="custom-field"
        placeholder="输入你的题材，如：星际机甲·复仇"
        maxlength="20"
        @keyup.enter="create"
      />
    </transition>

    <label class="label blk" style="margin-top: 14px">画幅 / 分辨率</label>
    <div class="ratios">
      <button
        v-for="r in RATIOS"
        :key="r.value"
        type="button"
        class="ratio-chip"
        :class="{ on: aspect === r.value }"
        :title="`${r.tag} ${r.res}`"
        @click="aspect = r.value"
      >
        <span class="ratio-ico"><i :style="glyphStyle(r.value)" /></span>
        <span class="ratio-meta">
          <span class="ratio-v">{{ r.value }}</span>
          <span class="ratio-res">{{ r.res }}</span>
        </span>
      </button>
    </div>

    <template #footer>
      <button class="btn ghost" @click="emit('close')">取消</button>
      <button class="btn primary" :disabled="loading" @click="create">创建</button>
    </template>
  </Modal>
</template>

<style scoped>
.label.blk {
  display: block;
  margin-bottom: 8px;
}
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
  transition: background 0.16s ease, border-color 0.16s ease, color 0.16s ease, box-shadow 0.16s ease;
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

/* 画幅 / 分辨率选择 */
.ratios {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.ratio-chip {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border: 1px solid var(--line);
  background: var(--raised);
  color: var(--dim);
  border-radius: var(--r-md);
  cursor: pointer;
  text-align: left;
  transition: background 0.16s ease, border-color 0.16s ease, color 0.16s ease;
}
.ratio-chip:hover {
  border-color: #353d45;
  color: var(--text);
}
.ratio-chip.on {
  background: var(--accent-soft);
  border-color: rgba(52, 224, 139, 0.4);
  color: var(--accent);
}
.ratio-ico {
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ratio-ico i {
  display: block;
  border: 1.5px solid currentColor;
  border-radius: 2px;
  opacity: 0.85;
}
.ratio-meta {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
  min-width: 0;
}
.ratio-v {
  font-size: 13px;
  font-weight: 600;
  font-family: var(--font-mono);
}
.ratio-res {
  font-size: 10.5px;
  color: var(--muted);
  font-family: var(--font-mono);
}
.ratio-chip.on .ratio-res {
  color: var(--accent);
  opacity: 0.75;
}

/* 自定义输入展开/收起 */
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
@media (prefers-reduced-motion: reduce) {
  .grow-enter-active,
  .grow-leave-active {
    transition: none;
  }
}
</style>
