<script setup lang="ts">
import { watch, onBeforeUnmount } from 'vue'

export interface PopItem {
  key: string
  label: string
  sub?: string
  disabled?: boolean
  hint?: string
}

const props = defineProps<{ open: boolean; items: PopItem[]; title?: string }>()
const emit = defineEmits<{ close: []; select: [string] }>()

function pick(it: PopItem): void {
  if (it.disabled) return
  emit('select', it.key)
}
function onKey(e: KeyboardEvent): void {
  if (props.open && e.key === 'Escape') emit('close')
}
watch(
  () => props.open,
  (o) => {
    if (o) window.addEventListener('keydown', onKey)
    else window.removeEventListener('keydown', onKey)
  }
)
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <transition name="pop-bubble">
    <div v-if="open" class="pop-wrap">
      <div class="pop-backdrop" @click="emit('close')" />
      <div class="pop-card panel">
        <div v-if="title" class="pop-title">{{ title }}</div>
        <button
          v-for="it in items"
          :key="it.key"
          class="pop-item"
          :class="{ disabled: it.disabled }"
          :disabled="it.disabled"
          @click="pick(it)"
        >
          <span class="pi-label">{{ it.label }}</span>
          <span v-if="it.disabled && it.hint" class="pi-sub warn">{{ it.hint }}</span>
          <span v-else-if="it.sub" class="pi-sub">{{ it.sub }}</span>
        </button>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.pop-wrap {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 60;
}
.pop-backdrop {
  position: fixed;
  inset: 0;
}
.pop-card {
  position: relative;
  min-width: 220px;
  padding: 6px;
  box-shadow: 0 14px 36px rgba(0, 0, 0, 0.5);
}
.pop-title {
  font-size: 11px;
  letter-spacing: 0.04em;
  color: var(--muted);
  padding: 6px 10px 4px;
}
.pop-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  width: 100%;
  text-align: left;
  border: none;
  background: transparent;
  color: var(--text);
  padding: 9px 10px;
  border-radius: var(--r-sm);
  cursor: pointer;
  transition: background 0.14s ease;
}
.pop-item:hover:not(.disabled) {
  background: var(--raised);
}
.pop-item.disabled {
  cursor: not-allowed;
  opacity: 0.55;
}
.pi-label {
  font-size: 13px;
}
.pi-sub {
  font-size: 11px;
  color: var(--dim);
}
.pi-sub.warn {
  color: var(--st-warning);
}

.pop-bubble-enter-active {
  transition: opacity 0.16s ease;
}
.pop-bubble-leave-active {
  transition: opacity 0.12s ease;
}
.pop-bubble-enter-from,
.pop-bubble-leave-to {
  opacity: 0;
}
.pop-bubble-enter-active .pop-card {
  transition: transform 0.18s cubic-bezier(0.22, 1, 0.36, 1);
}
.pop-bubble-enter-from .pop-card {
  transform: translateY(-6px) scale(0.97);
}
@media (prefers-reduced-motion: reduce) {
  .pop-bubble-enter-active,
  .pop-bubble-leave-active,
  .pop-bubble-enter-active .pop-card {
    transition: none;
  }
}
</style>
