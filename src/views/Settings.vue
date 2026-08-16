<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { AppSettings, SecretKey } from '@shared/types'
import { useAppStore } from '../stores/app'
import WindowControls from '../components/WindowControls.vue'

type UsedSecret = 'qwen' | 'runninghub' | 'gptimage' | 'seedance'

const router = useRouter()
const app = useAppStore()
const s = ref<AppSettings | null>(null)
const keyInputs = ref<Record<UsedSecret, string>>({ qwen: '', runninghub: '', gptimage: '', seedance: '' })

const RUNNINGHUB_SIGNUP = 'https://www.runninghub.cn/?inviteCode=rh-v1382'

const SECRETS: {
  key: UsedSecret
  label: string
  hint: string
  flag: keyof AppSettings
  getUrl?: string
}[] = [
  {
    key: 'qwen',
    label: 'Qwen / 阿里百炼 API Key',
    hint: '用于剧本生成、拆解、图片理解和多模态分析。',
    flag: 'hasQwenKey'
  },
  {
    key: 'runninghub',
    label: 'RunningHub API Key',
    hint: '用于连接你的 RunningHub 工作流，生成角色、场景、道具和分镜图。',
    flag: 'hasRunninghubKey',
    getUrl: RUNNINGHUB_SIGNUP
  },
  {
    key: 'gptimage',
    label: 'GPT Image API Key',
    hint: '预留给独立文生图、图像编辑和创意工坊图像能力；未接入前先加密保存。',
    flag: 'hasGptImageKey'
  },
  {
    key: 'seedance',
    label: 'Seedance API Key',
    hint: '预留给图生视频和片段合成能力；接入后直接读取。',
    flag: 'hasSeedanceKey'
  }
]

async function load(): Promise<void> {
  s.value = await window.api.settings.get()
}

onMounted(load)

async function save(): Promise<void> {
  if (!s.value) return
  await window.api.settings.update({
    llmModel: s.value.llmModel,
    scriptModel: s.value.scriptModel,
    runninghubWorkflowId: s.value.runninghubWorkflowId,
    maxConcurrency: s.value.maxConcurrency,
    defaultAspectRatio: s.value.defaultAspectRatio
  })
  app.notify('设置已保存', 'success')
}

async function saveKey(key: UsedSecret): Promise<void> {
  const v = keyInputs.value[key].trim()
  if (!v) return
  await window.api.settings.setSecret(key as SecretKey, v)
  keyInputs.value[key] = ''
  await load()
  app.notify('密钥已加密保存', 'success')
}

async function clearKey(key: UsedSecret): Promise<void> {
  await window.api.settings.clearSecret(key as SecretKey)
  await load()
  app.notify('密钥已清除')
}

function openExternal(url: string): void {
  window.api.sys.openExternal(url).catch(() => {})
}
</script>

<template>
  <div class="settings">
    <header class="top app-dragbar">
      <button class="btn ghost" @click="router.push('/')">← 返回</button>
      <div class="h-display title">全局设置 · SETTINGS</div>
      <div class="top-right">
        <button class="btn primary" @click="save">保存设置</button>
        <WindowControls />
      </div>
    </header>

    <main v-if="s" class="body scroll">
      <section class="card">
        <div class="sec-title h-display">API 密钥</div>
        <div v-for="sec in SECRETS" :key="sec.key" class="key-row">
          <div class="key-info">
            <div class="key-label">
              {{ sec.label }}
              <span class="state" :class="{ on: s[sec.flag] }">
                {{ s[sec.flag] ? '已配置' : '未配置' }}
              </span>
            </div>
            <div class="key-hint dim">{{ sec.hint }}</div>
            <button v-if="sec.getUrl && !s[sec.flag]" class="get-link" @click="openExternal(sec.getUrl)">
              没有 Key？前往 RunningHub 注册获取 →
            </button>
          </div>
          <div class="key-edit">
            <input
              v-model="keyInputs[sec.key]"
              type="password"
              :placeholder="s[sec.flag] ? '已保存，输入新值可覆盖' : '粘贴 API Key'"
            />
            <button class="btn" @click="saveKey(sec.key)">保存</button>
            <button class="btn danger" :disabled="!s[sec.flag]" @click="clearKey(sec.key)">清除</button>
          </div>
        </div>
        <div class="note dim">
          密钥使用 Electron safeStorage 加密保存，不写入数据库，也不会把明文下发到渲染进程。暂未接入的能力会先使用 mock/fallback。
        </div>
      </section>

      <section class="card">
        <div class="sec-title h-display">模型与生成参数</div>
        <div class="grid2">
          <div>
            <label class="label">多模态模型 ID</label>
            <input v-model="s.llmModel" placeholder="qwen3-vl-plus" />
          </div>
          <div>
            <label class="label">剧本模型 ID</label>
            <input v-model="s.scriptModel" placeholder="deepseek-v4-flash" />
          </div>
          <div>
            <label class="label">RunningHub workflowId</label>
            <input v-model="s.runninghubWorkflowId" placeholder="内置一致性工作流 / 自定义 workflowId" />
          </div>
          <div>
            <label class="label">新建项目默认画幅</label>
            <select v-model="s.defaultAspectRatio">
              <option value="9:16">9:16 竖屏短剧</option>
              <option value="3:4">3:4 竖屏</option>
              <option value="1:1">1:1 方形</option>
              <option value="4:3">4:3 横屏</option>
              <option value="16:9">16:9 横屏</option>
              <option value="21:9">21:9 电影宽幅</option>
            </select>
            <div class="field-hint dim">新建项目时默认带出，实际生成以项目画幅为准。</div>
          </div>
          <div>
            <label class="label">最大并发任务数</label>
            <input v-model.number="s.maxConcurrency" type="number" min="1" max="6" />
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.settings {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 12px 12px 28px;
  border-bottom: 1px solid var(--line);
  background: var(--surface);
}

.top-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.title {
  font-size: 16px;
  letter-spacing: 0.08em;
}

.body {
  flex: 1;
  padding: 24px 28px;
  max-width: 980px;
  width: 100%;
  margin: 0 auto;
}

.card {
  margin-bottom: 18px;
}

.sec-title {
  font-size: 14px;
  margin-bottom: 16px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--hair);
}

.grid2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.label {
  display: block;
  margin-bottom: 5px;
}

.field-hint {
  font-size: 11px;
  margin-top: 5px;
  line-height: 1.5;
}

.key-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px solid var(--hair);
}

.key-info {
  min-width: 0;
  flex: 1;
}

.key-label {
  font-size: 13px;
  margin-bottom: 3px;
}

.state {
  margin-left: 8px;
  font-size: 11px;
  color: var(--muted);
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 1px 7px;
}

.state.on {
  color: var(--st-success);
  border-color: rgba(52, 224, 139, 0.4);
  background: var(--accent-soft);
}

.key-hint {
  font-size: 12px;
  line-height: 1.5;
}

.get-link {
  margin-top: 6px;
  background: transparent;
  border: none;
  padding: 0;
  color: var(--accent);
  font-size: 12px;
  cursor: pointer;
}

.get-link:hover {
  text-decoration: underline;
}

.key-edit {
  display: flex;
  gap: 6px;
  width: 410px;
}

.dim {
  color: var(--dim);
}

.note {
  font-size: 12px;
  margin-top: 14px;
  line-height: 1.6;
}

@media (max-width: 820px) {
  .grid2,
  .key-row {
    grid-template-columns: 1fr;
  }

  .key-row {
    display: grid;
  }

  .key-edit {
    width: 100%;
  }
}
</style>
