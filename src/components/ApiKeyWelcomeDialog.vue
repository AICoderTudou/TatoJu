<script setup lang="ts">
import { ref } from 'vue'
import Modal from './Modal.vue'

const API_KEY_URL = 'https://api.aitudou.net'
const open = ref(true)
const opening = ref(false)

async function openApplyPage(): Promise<void> {
  if (opening.value) return
  opening.value = true
  try {
    await window.api.sys.openExternal(API_KEY_URL)
    open.value = false
  } finally {
    opening.value = false
  }
}
</script>

<template>
  <Modal :open="open" title="创作算力服务" :width="480" @close="open = false">
    <div class="welcome">
      <div class="mark" aria-hidden="true">API</div>
      <div class="copy">
        <h2>2-5折算力 API Key</h2>
        <p>如需接入图片、视频等在线生成服务，可前往算力平台申请 API Key。</p>
        <div class="address">
          <span>申请地址</span>
          <strong class="mono">api.aitudou.net</strong>
        </div>
      </div>
    </div>

    <template #footer>
      <button class="btn ghost" @click="open = false">稍后再说</button>
      <button class="btn primary" :disabled="opening" @click="openApplyPage">
        {{ opening ? '正在打开…' : '前往申请' }}
      </button>
    </template>
  </Modal>
</template>

<style scoped>
.welcome {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}

.mark {
  width: 72px;
  height: 72px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(52, 224, 139, 0.45);
  border-radius: var(--r-md);
  background: var(--accent-soft);
  color: var(--accent);
  font-family: var(--font-mono);
  font-size: 18px;
  font-weight: 800;
  box-shadow: inset 0 0 24px rgba(52, 224, 139, 0.08);
}

.copy h2 {
  margin: 1px 0 7px;
  color: var(--text);
  font-size: 20px;
  letter-spacing: 0;
}

.copy p {
  margin: 0;
  color: var(--dim);
  font-size: 13px;
  line-height: 1.7;
}

.address {
  margin-top: 16px;
  padding: 11px 13px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  background: var(--bg);
}

.address span {
  color: var(--muted);
  font-size: 12px;
}

.address strong {
  color: var(--accent);
  font-size: 13px;
  overflow-wrap: anywhere;
}

@media (max-width: 520px) {
  .welcome {
    grid-template-columns: 1fr;
  }

  .mark {
    width: 60px;
    height: 60px;
  }
}
</style>
