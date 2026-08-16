<script setup lang="ts">
import { toast, type ToastKind, type ToastItem } from '../composables/toast'

const ICON: Record<ToastKind, string> = {
  success: '✓',
  error: '✕',
  warning: '!',
  info: 'i',
  loading: ''
}

function runAction(t: ToastItem): void {
  t.action?.run()
  toast.dismiss(t.id)
}
</script>

<template>
  <div class="toast-host">
    <transition-group name="toast" tag="div">
      <div v-for="t in toast.state.items" :key="t.id" class="toast" :class="t.kind">
        <span class="ic">
          <span v-if="t.kind === 'loading'" class="spinner" />
          <span v-else class="glyph">{{ ICON[t.kind] }}</span>
        </span>
        <span class="msg">{{ t.msg }}</span>
        <button v-if="t.action" class="act" @click="runAction(t)">
          {{ t.action.label }}
        </button>
        <button v-if="t.dismissible" class="x" @click="toast.dismiss(t.id)">✕</button>
      </div>
    </transition-group>
  </div>
</template>

<style scoped>
.toast-host {
  position: fixed;
  bottom: 16px;
  right: 16px;
  z-index: 12000;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none;
}
.toast {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 240px;
  max-width: 380px;
  padding: 11px 12px;
  background: var(--raised);
  border: 1px solid var(--line);
  border-left: 3px solid var(--teal);
  border-radius: var(--r-md);
  box-shadow: 0 10px 34px rgba(0, 0, 0, 0.5);
  font-size: 13px;
  line-height: 1.45;
}
.toast.success {
  border-left-color: var(--st-success);
}
.toast.error {
  border-left-color: var(--st-failed);
}
.toast.warning {
  border-left-color: var(--st-warning);
}
.toast.info {
  border-left-color: var(--teal);
}
.toast.loading {
  border-left-color: var(--accent);
}
.ic {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.glyph {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  font-family: var(--font-display);
}
.success .glyph {
  background: var(--st-success);
  color: #0c1a0b;
}
.error .glyph {
  background: var(--st-failed);
  color: #210d0d;
}
.warning .glyph {
  background: var(--st-warning);
  color: #211a08;
}
.info .glyph {
  background: var(--teal);
  color: #04201d;
}
.msg {
  flex: 1;
  word-break: break-word;
}
.act {
  flex-shrink: 0;
  background: var(--accent-soft);
  border: 1px solid rgba(52, 224, 139, 0.35);
  color: var(--accent);
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 999px;
  transition: background 0.14s ease;
}
.act:hover {
  background: rgba(52, 224, 139, 0.22);
}
.x {
  flex-shrink: 0;
  background: transparent;
  border: none;
  color: var(--muted);
  cursor: pointer;
  font-size: 12px;
  padding: 0 2px;
}
.x:hover {
  color: var(--text);
}
.spinner {
  width: 15px;
  height: 15px;
  border: 2px solid var(--line);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 进出场动画 */
.toast-enter-active {
  transition: transform 0.32s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.32s ease;
}
.toast-leave-active {
  transition: transform 0.22s ease, opacity 0.22s ease;
  position: absolute;
  right: 0;
}
.toast-enter-from {
  transform: translateX(40px) scale(0.96);
  opacity: 0;
}
.toast-leave-to {
  transform: translateX(40px) scale(0.96);
  opacity: 0;
}
.toast-move {
  transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
}
@media (prefers-reduced-motion: reduce) {
  .toast-enter-active,
  .toast-leave-active,
  .toast-move,
  .spinner {
    transition: none;
    animation: none;
  }
}
</style>
