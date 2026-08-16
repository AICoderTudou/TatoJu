<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useAppStore } from './stores/app'
import ToastHost from './components/ToastHost.vue'
import Modal from './components/Modal.vue'
import GenProcess from './components/GenProcess.vue'
import ApiKeyWelcomeDialog from './components/ApiKeyWelcomeDialog.vue'

const app = useAppStore()
const { confirmState } = storeToRefs(app)
</script>

<template>
  <div class="app-shell">
    <router-view />
  </div>

  <ToastHost />
  <GenProcess />
  <ApiKeyWelcomeDialog />

  <Modal :open="!!confirmState" title="请确认" :width="400" @close="confirmState?.resolve(false)">
    <div class="cf-msg">{{ confirmState?.msg }}</div>
    <template #footer>
      <button class="btn ghost" @click="confirmState?.resolve(false)">取消</button>
      <button class="btn danger" @click="confirmState?.resolve(true)">确定</button>
    </template>
  </Modal>
</template>

<style scoped>
.app-shell {
  height: 100%;
}
.cf-msg {
  font-size: 14px;
  line-height: 1.6;
}
</style>
